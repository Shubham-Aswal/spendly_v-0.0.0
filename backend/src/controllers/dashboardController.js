const User = require('../models/User');
const ExpenseSetting = require('../models/ExpenseSetting');
const Transaction = require('../models/Transaction');
const Loan = require('../models/Loan');
const BudgetTracker = require('../models/BudgetTracker');

const getTotalFixedExpenses = (expenseSetting) => {
  if (!expenseSetting || !Array.isArray(expenseSetting.fixedExpenses)) return 0;
  return expenseSetting.fixedExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
};

const getMonthlyLoanPayment = (loans = []) => {
  return loans.reduce((sum, loan) => sum + Number(loan.monthlyPayment || 0), 0);
};

const getDaysInCurrentMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
};

const calculateSafeSpendLimit = (expenseSetting, loans = []) => {
  const monthlyBudget = Number(expenseSetting?.monthlyBudget || 0);
  const fixedExpenses = getTotalFixedExpenses(expenseSetting);
  const loanPayments = getMonthlyLoanPayment(loans);
  const remaining = Math.max(0, monthlyBudget - fixedExpenses - loanPayments);
  const days = getDaysInCurrentMonth();

  if (days === 0) return 0;
  return Number((remaining / days).toFixed(2));
};

const calculateCurrentBalance = (transactions = []) => {
  return transactions.reduce((balance, transaction) => {
    if (transaction.type === 'income') return balance + Number(transaction.amount || 0);
    if (transaction.type === 'expense') return balance - Number(transaction.amount || 0);
    return balance;
  }, 0);
};

exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const expenseSetting = await ExpenseSetting.findOne({ user: userId });
    const transactions = await Transaction.find({ user: userId }).sort({ date: -1 });
    const loans = await Loan.find({ user: userId }).sort({ createdAt: -1 });

    if (typeof user.currentBalance !== 'number') {
      const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      const tracker = await BudgetTracker.getOrCreateForUser(userId, currentMonth);
      await tracker.syncWithExpenseSettings();
      await tracker.updateTransactionTotal();
      user.currentBalance = tracker.currentBalance;
      await user.save();
    }

    const totalFixedExpenses = getTotalFixedExpenses(expenseSetting);
    const totalLoanPayments = getMonthlyLoanPayment(loans);
    const safeSpendLimit = calculateSafeSpendLimit(expenseSetting, loans);
    const currentBalance = Number(user.currentBalance || 0);

    return res.status(200).json({
      user,
      expenseSetting,
      transactions: transactions.slice(0, 20),
      loans,
      summary: {
        currentBalance,
        totalBudget: Number(expenseSetting?.monthlyBudget || 0),
        totalFixedExpenses,
        totalLoanPayments,
        remainingSpend: Math.max(0, Number(expenseSetting?.monthlyBudget || 0) - totalFixedExpenses - totalLoanPayments),
        safeSpendLimit
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Could not load dashboard data.' });
  }
};