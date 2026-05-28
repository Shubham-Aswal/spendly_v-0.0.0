const BudgetTracker = require('../models/BudgetTracker');
const ExpenseSetting = require('../models/ExpenseSetting');
const Transaction = require('../models/Transaction');

// Get current budget tracker for user
exports.getBudgetTracker = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const month = req.query.month; // Optional: YYYY-MM format
    const tracker = await BudgetTracker.getOrCreateForUser(userId, month);

    // Update transaction total if it's been more than an hour since last update
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (!tracker.lastTransactionUpdate || tracker.lastTransactionUpdate < oneHourAgo) {
      await tracker.updateTransactionTotal();
      await tracker.save();
    }

    return res.status(200).json({
      budgetTracker: tracker,
      summary: {
        monthlyBudget: tracker.monthlyBudget,
        totalFixedExpenses: tracker.totalFixedExpenses,
        totalTransactionsThisMonth: tracker.totalTransactionsThisMonth,
        currentBalance: tracker.currentBalance,
        dailySafeSpent: tracker.dailySafeSpent,
        remainingDaysInMonth: tracker.remainingDaysInMonth
      }
    });
  } catch (error) {
    console.error('Error getting budget tracker:', error);
    return res.status(500).json({ message: 'Could not load budget tracker data.' });
  }
};

// Update budget tracker after transaction changes
exports.updateBudgetTracker = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const month = req.query.month; // Optional: YYYY-MM format
    const tracker = await BudgetTracker.getOrCreateForUser(userId, month);

    // Update transaction total
    await tracker.updateTransactionTotal();

    return res.status(200).json({
      message: 'Budget tracker updated successfully.',
      budgetTracker: tracker
    });
  } catch (error) {
    console.error('Error updating budget tracker:', error);
    return res.status(500).json({ message: 'Could not update budget tracker.' });
  }
};

// Sync budget tracker with expense settings
exports.syncBudgetTracker = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const month = req.query.month; // Optional: YYYY-MM format
    const tracker = await BudgetTracker.getOrCreateForUser(userId, month);

    // Sync with expense settings
    await tracker.syncWithExpenseSettings();

    return res.status(200).json({
      message: 'Budget tracker synced with expense settings.',
      budgetTracker: tracker
    });
  } catch (error) {
    console.error('Error syncing budget tracker:', error);
    return res.status(500).json({ message: 'Could not sync budget tracker.' });
  }
};

// Get budget summary for current month
exports.getBudgetSummary = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const tracker = await BudgetTracker.getOrCreateForUser(userId, currentMonth);

    // Get today's transactions
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const todaysTransactions = await Transaction.find({
      user: userId,
      type: 'expense',
      date: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    });

    const todaysSpending = todaysTransactions.reduce((sum, t) => sum + t.amount, 0);

    return res.status(200).json({
      month: currentMonth,
      summary: {
        monthlyBudget: tracker.monthlyBudget,
        totalFixedExpenses: tracker.totalFixedExpenses,
        spentThisMonth: tracker.totalTransactionsThisMonth,
        remainingBudget: Math.max(0, tracker.monthlyBudget - tracker.totalFixedExpenses - tracker.totalTransactionsThisMonth),
        currentBalance: tracker.currentBalance,
        dailySafeSpent: tracker.dailySafeSpent,
        todaysSpending: todaysSpending,
        remainingDaysInMonth: tracker.remainingDaysInMonth
      }
    });
  } catch (error) {
    console.error('Error getting budget summary:', error);
    return res.status(500).json({ message: 'Could not load budget summary.' });
  }
};