const { OpenAI } = require('openai');
const User = require('../models/User');
const ExpenseSetting = require('../models/ExpenseSetting');
const Transaction = require('../models/Transaction');
const Loan = require('../models/Loan');

const getOpenAiClient = () => {
  const apiKey = (process.env.XAI_API_KEY || '').trim();
  return new OpenAI({ apiKey, baseURL: 'https://api.x.ai/v1' });
};

const toNumber = (value) => Number(value || 0);

const getMonthRange = (date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
};

const getPreviousMonthRange = (date) => {
  const start = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const end = new Date(date.getFullYear(), date.getMonth(), 1);
  return { start, end };
};

const formatMonthLabel = (date) => {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });
};

const safeSpendLimitFromSettings = (expenseSetting, loans = []) => {
  const monthlyBudget = toNumber(expenseSetting?.monthlyBudget);
  const fixedExpenses = Array.isArray(expenseSetting?.fixedExpenses)
    ? expenseSetting.fixedExpenses.reduce((sum, item) => sum + toNumber(item.amount), 0)
    : 0;
  const loanPayments = loans.reduce((sum, loan) => sum + toNumber(loan.monthlyPayment), 0);
  const remaining = Math.max(0, monthlyBudget - fixedExpenses - loanPayments);
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  return daysInMonth === 0 ? 0 : Number((remaining / daysInMonth).toFixed(2));
};

const aggregateCategoryTotals = (transactions) => {
  return transactions
    .filter((tx) => tx.type === 'expense')
    .reduce((totals, tx) => {
      const category = tx.category || 'Other';
      totals[category] = toNumber(totals[category]) + toNumber(tx.amount);
      return totals;
    }, {});
};

const aggregateDateTotals = (transactions) => {
  return transactions.reduce((totals, tx) => {
    const dayKey = tx.date instanceof Date
      ? tx.date.toISOString().split('T')[0]
      : new Date(tx.date).toISOString().split('T')[0];
    totals[dayKey] = toNumber(totals[dayKey]) + toNumber(tx.amount);
    return totals;
  }, {});
};

const buildCategoryChange = (currentCategories, previousCategories) => {
  const allCategories = new Set([...Object.keys(currentCategories), ...Object.keys(previousCategories)]);
  let highestGrowth = '';
  let highestGrowthPercent = -Infinity;

  allCategories.forEach((category) => {
    const currentValue = toNumber(currentCategories[category]);
    const previousValue = toNumber(previousCategories[category]);
    const growth = previousValue === 0 ? (currentValue === 0 ? 0 : 100) : ((currentValue - previousValue) / previousValue) * 100;

    if (growth > highestGrowthPercent) {
      highestGrowthPercent = growth;
      highestGrowth = category;
    }
  });

  return highestGrowth || '';
};

const buildAnalyticsPayload = async (userId) => {
  const now = new Date();
  const currentMonthRange = getMonthRange(now);
  const previousMonthRange = getPreviousMonthRange(now);

  const expenseSetting = await ExpenseSetting.findOne({ user: userId });
  const loans = await Loan.find({ user: userId }).sort({ createdAt: -1 });
  const currentMonthTransactions = await Transaction.find({
    user: userId,
    date: { $gte: currentMonthRange.start, $lt: currentMonthRange.end }
  }).sort({ date: -1 });

  const previousMonthTransactions = await Transaction.find({
    user: userId,
    date: { $gte: previousMonthRange.start, $lt: previousMonthRange.end }
  }).sort({ date: -1 });

  const currentMonthExpenses = currentMonthTransactions.filter((tx) => tx.type === 'expense');
  const currentMonthIncome = currentMonthTransactions.filter((tx) => tx.type === 'income');

  const totalExpenses = currentMonthExpenses.reduce((sum, tx) => sum + toNumber(tx.amount), 0);
  const totalIncome = currentMonthIncome.reduce((sum, tx) => sum + toNumber(tx.amount), 0);
  const savings = totalIncome - totalExpenses;

  const categoryBreakdown = aggregateCategoryTotals(currentMonthTransactions);
  const previousCategoryBreakdown = aggregateCategoryTotals(previousMonthTransactions);

  const dateTotals = aggregateDateTotals(currentMonthExpenses);
  const safeSpendLimit = safeSpendLimitFromSettings(expenseSetting, loans);
  const daysPassed = Math.max(1, new Date().getDate());
  const safeSpendUsed = safeSpendLimit
    ? Number(Math.min(100, (totalExpenses / (safeSpendLimit * daysPassed)) * 100).toFixed(2))
    : 0;

  const weekendExpenseTotals = currentMonthExpenses.reduce(
    (acc, tx) => {
      const txDate = tx.date instanceof Date ? tx.date : new Date(tx.date);
      const day = txDate.getDay();
      if (day === 0 || day === 6) {
        acc.weekend += toNumber(tx.amount);
        acc.weekendCount += 1;
      } else {
        acc.weekday += toNumber(tx.amount);
        acc.weekdayCount += 1;
      }
      return acc;
    },
    { weekend: 0, weekday: 0, weekendCount: 0, weekdayCount: 0 }
  );

  const weekendAverage = weekendExpenseTotals.weekendCount
    ? weekendExpenseTotals.weekend / weekendExpenseTotals.weekendCount
    : 0;
  const weekdayAverage = weekendExpenseTotals.weekdayCount
    ? weekendExpenseTotals.weekday / weekendExpenseTotals.weekdayCount
    : 0;

  const safeSpendExceededDays = Object.values(dateTotals).filter((total) => safeSpendLimit > 0 && total > safeSpendLimit).length;

  const lateNightSpending = currentMonthExpenses.some((tx) => {
    const txDate = tx.date instanceof Date ? tx.date : new Date(tx.date);
    const hour = txDate.getHours();
    return hour >= 22 || hour < 6;
  });

  const frequentSmallTransactions = currentMonthExpenses.length >= 10 && totalExpenses / Math.max(1, currentMonthExpenses.length) <= 250;

  const previousMonthExpensesTotal = previousMonthTransactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + toNumber(tx.amount), 0);
  const previousMonthIncomeTotal = previousMonthTransactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + toNumber(tx.amount), 0);
  const previousMonthSavings = previousMonthIncomeTotal - previousMonthExpensesTotal;

  const expenseChangePercent = previousMonthExpensesTotal === 0
    ? previousMonthExpensesTotal === totalExpenses ? 0 : 100
    : Number((((totalExpenses - previousMonthExpensesTotal) / previousMonthExpensesTotal) * 100).toFixed(2));

  const savingsChangePercent = previousMonthSavings === 0
    ? previousMonthSavings === savings ? 0 : 100
    : Number((((savings - previousMonthSavings) / Math.abs(previousMonthSavings)) * 100).toFixed(2));

  const highestGrowthCategory = buildCategoryChange(categoryBreakdown, previousCategoryBreakdown);

  const monthLabel = formatMonthLabel(now);

  return {
    userName: '',
    month: monthLabel,
    income: totalIncome,
    expenses: totalExpenses,
    savings,
    safeSpendLimit,
    safeSpendUsed,
    transactions: currentMonthTransactions.slice(0, 50).map((tx) => ({
      title: tx.description || tx.category || 'Transaction',
      amount: tx.amount,
      category: tx.category || 'Other',
      date: tx.date,
      type: tx.type
    })),
    categoryBreakdown,
    goals: [],
    loans: loans.map((loan) => ({
      loanName: loan.lender || 'Loan',
      monthlyEMI: toNumber(loan.monthlyPayment),
      remainingAmount: toNumber(loan.amount),
      interestRate: toNumber(loan.interestRate)
    })),
    previousMonthComparison: {
      expenseChangePercent,
      savingsChangePercent,
      highestGrowthCategory
    },
    behavioralData: {
      weekendOverspending: weekendAverage > weekdayAverage,
      lateNightSpending,
      frequentSmallTransactions,
      safeSpendExceededDays
    },
    summaryGeneratedRecently: false
  };
};

exports.getAnalytics = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const payload = await buildAnalyticsPayload(userId);
    const user = await User.findById(userId).select('-password');
    payload.userName = user?.name || 'Spendly User';

    return res.status(200).json(payload);
  } catch (error) {
    console.error('Error generating analytics:', error);
    return res.status(500).json({ message: 'Could not generate analytics.' });
  }
};

exports.getAnalyticsInsights = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const openAiKey = (process.env.XAI_API_KEY || '').trim();
    if (!openAiKey) {
      return res.status(500).json({ message: 'AI credentials are not configured or are invalid. Please set a valid XAI_API_KEY in .env.' });
    }

    const payload = await buildAnalyticsPayload(userId);
    const prompt = `You are Spendly AI. Analyze this user's monthly financial summary and generate a concise insight block with three sections: 1) spending habits, 2) savings improvement ideas, and 3) frequent patterns to watch. Use only the data provided. Do not invent numbers.`;

    const response = await getOpenAiClient().responses.create({
      model: 'grok-4.3',
      instructions: prompt,
      reasoning: { effort: 'high' },
      max_output_tokens: 1000,
      input: JSON.stringify(payload)
    });

    const assistantText = response.output_text ||
      response?.output?.flatMap((item) => item?.content || [])
        .filter((block) => block?.type === 'output_text' || block?.type === 'message')
        .map((block) => block?.text || '')
        .join('\n') || '';

    if (!assistantText.trim()) {
      return res.status(500).json({ message: 'AI returned an empty insights response.' });
    }

    return res.status(200).json({ insights: assistantText.trim() });
  } catch (error) {
    console.error('Error generating AI insights:', error);
    const errorMessage = error?.response?.data?.message || error?.message || 'Could not generate AI insights.';
    return res.status(500).json({ message: `Could not generate AI insights: ${errorMessage}` });
  }
};
