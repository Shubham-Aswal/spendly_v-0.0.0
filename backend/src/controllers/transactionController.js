const Transaction = require('../models/Transaction');
const MonthlyHeatmap = require('../models/MonthlyHeatmap');
const BudgetTracker = require('../models/BudgetTracker');
const User = require('../models/User');

const formatIsoDate = (value) => {
  return value.toISOString().split('T')[0];
};

const buildMonthEntries = (year, month) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => {
    const currentDate = new Date(year, month, index + 1);
    return {
      date: formatIsoDate(currentDate),
      total: 0
    };
  });
};

const getCurrentMonthKey = (date) => ({
  year: date.getFullYear(),
  month: date.getMonth()
});

const getMonthStart = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const getPreviousMonthStart = (date) => new Date(date.getFullYear(), date.getMonth() - 1, 1);

const cleanupOldTransactionHistory = async (userId) => {
  const today = new Date();
  const keepSince = today.getDate() <= 2 ? getPreviousMonthStart(today) : getMonthStart(today);

  await Transaction.deleteMany({
    user: userId,
    date: { $lt: keepSince }
  });

  const cutoffYear = keepSince.getFullYear();
  const cutoffMonth = keepSince.getMonth();

  await MonthlyHeatmap.deleteMany({
    user: userId,
    $or: [
      { year: { $lt: cutoffYear } },
      { year: cutoffYear, month: { $lt: cutoffMonth } }
    ]
  });
};

const ensureMonthlyHeatmap = async (userId, date) => {
  const { year, month } = getCurrentMonthKey(date);
  let heatmap = await MonthlyHeatmap.findOne({ user: userId, year, month });
  if (!heatmap) {
    heatmap = await MonthlyHeatmap.create({
      user: userId,
      year,
      month,
      entries: buildMonthEntries(year, month)
    });
  }
  return heatmap;
};

const incrementHeatmapDay = async (userId, date, amount) => {
  const { year, month } = getCurrentMonthKey(date);
  const dateKey = formatIsoDate(date);
  const heatmap = await ensureMonthlyHeatmap(userId, date);
  const entry = heatmap.entries.find((item) => item.date === dateKey);
  if (entry) {
    entry.total += Number(amount);
  } else {
    heatmap.entries.push({ date: dateKey, total: Number(amount) });
  }
  await heatmap.save();
};

const updateUserCurrentBalance = async (userId, transactionDate) => {
  try {
    const month = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
    const tracker = await BudgetTracker.getOrCreateForUser(userId, month);
    await tracker.syncWithExpenseSettings();
    await tracker.updateTransactionTotal();

    const user = await User.findById(userId);
    if (user) {
      user.currentBalance = tracker.currentBalance;
      await user.save();
    }
  } catch (error) {
    console.error('Error updating user current balance:', error);
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    await cleanupOldTransactionHistory(userId);
    const transactions = await Transaction.find({ user: userId }).sort({ date: -1 }).limit(50);
    return res.status(200).json({ transactions });
  } catch (error) {
    return res.status(500).json({ message: 'Could not retrieve transactions.' });
  }
};

exports.getDailyExpenses = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    await cleanupOldTransactionHistory(userId);

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const dailyTransactions = await Transaction.find({
      user: userId,
      type: 'expense',
      date: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    }).sort({ date: -1 });

    const totalDailyExpenses = dailyTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

    return res.status(200).json({
      transactions: dailyTransactions,
      total: totalDailyExpenses,
      count: dailyTransactions.length,
      date: formatIsoDate(startOfDay)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Could not retrieve daily expenses.' });
  }
};

exports.createTransaction = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { type, category, amount, description, date } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!category || amount == null) {
      return res.status(400).json({ message: 'Category and amount are required.' });
    }

    const transactionDate = date ? new Date(date) : new Date();

    const transaction = await Transaction.create({
      user: userId,
      type: type || 'expense',
      category,
      amount,
      description: description || '',
      date: transactionDate
    });

    if (transaction.type === 'expense') {
      const now = new Date();
      if (transactionDate.getFullYear() === now.getFullYear() && transactionDate.getMonth() === now.getMonth()) {
        await incrementHeatmapDay(userId, transactionDate, amount);
      }
    }

    await cleanupOldTransactionHistory(userId);
    // Update budget tracker and user balance for the transaction month
    await updateUserCurrentBalance(userId, transactionDate);

    return res.status(201).json({ message: 'Transaction saved successfully.', transaction });
  } catch (error) {
    return res.status(500).json({ message: 'Could not save transaction.' });
  }
};

exports.getExpenseHeatmap = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    await cleanupOldTransactionHistory(userId);

    const today = new Date();
    const { year, month } = getCurrentMonthKey(today);
    let heatmap = await MonthlyHeatmap.findOne({ user: userId, year, month });

    if (!heatmap) {
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 1);

      const monthlyExpenses = await Transaction.find({
        user: userId,
        type: 'expense',
        date: {
          $gte: startOfMonth,
          $lt: endOfMonth
        }
      });

      const totalsByDate = monthlyExpenses.reduce((acc, transaction) => {
        const day = formatIsoDate(transaction.date);
        acc[day] = (acc[day] || 0) + Number(transaction.amount || 0);
        return acc;
      }, {});

      heatmap = await MonthlyHeatmap.create({
        user: userId,
        year,
        month,
        entries: buildMonthEntries(year, month).map((entry) => ({
          date: entry.date,
          total: totalsByDate[entry.date] || 0
        }))
      });
    }

    return res.status(200).json({ heatmap: heatmap.entries });
  } catch (error) {
    return res.status(500).json({ message: 'Could not load expense heatmap.' });
  }
};