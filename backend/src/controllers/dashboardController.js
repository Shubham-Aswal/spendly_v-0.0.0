const User = require('../models/User');
const ExpenseSetting = require('../models/ExpenseSetting');
const Transaction = require('../models/Transaction');
const Loan = require('../models/Loan');

const calculateRemainingSpend = (expenseSetting) => {
  if (!expenseSetting) return 0;
  const totalFixed = Array.isArray(expenseSetting.fixedExpenses)
    ? expenseSetting.fixedExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
    : 0;
  return Math.max(0, expenseSetting.monthlyBudget - totalFixed);
};

const getTotalFixedExpenses = (expenseSetting) => {
  if (!expenseSetting || !Array.isArray(expenseSetting.fixedExpenses)) return 0;
  return expenseSetting.fixedExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
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
    const transactions = await Transaction.find({ user: userId }).sort({ date: -1 }).limit(20);
    const loans = await Loan.find({ user: userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      user,
      expenseSetting,
      transactions,
      loans,
      summary: {
        totalBudget: expenseSetting?.monthlyBudget || 0,
        remainingSpend: calculateRemainingSpend(expenseSetting),
        totalFixedExpenses: getTotalFixedExpenses(expenseSetting)
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Could not load dashboard data.' });
  }
};