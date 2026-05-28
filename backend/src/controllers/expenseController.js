const User = require('../models/User');
const ExpenseSetting = require('../models/ExpenseSetting');
const BudgetTracker = require('../models/BudgetTracker');

const getCurrentMonthKey = () => {
    const now = new Date();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${now.getUTCFullYear()}-${month}`;
};

const ensureBudgetCredit = (expenseSetting) => {
    const currentMonth = getCurrentMonthKey();
    if (expenseSetting.budgetCreditMonth !== currentMonth) {
        expenseSetting.budgetCreditUsed = false;
        expenseSetting.budgetCreditMonth = currentMonth;
    }
};

const updateUserCurrentBalance = async (userId) => {
    try {
        const currentMonth = getCurrentMonthKey();
        const tracker = await BudgetTracker.getOrCreateForUser(userId, currentMonth);
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

exports.getExpenseSettings = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required.' });
        }

        const expenseSetting = await ExpenseSetting.findOne({ user: userId });
        if (!expenseSetting) {
            return res.status(404).json({ message: 'No expense settings found.' });
        }

        ensureBudgetCredit(expenseSetting);
        await expenseSetting.save();

        return res.status(200).json({ data: expenseSetting });
    } catch (error) {
        return res.status(500).json({ message: 'Could not retrieve expense settings.' });
    }
};

exports.updateMonthlyBudget = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { monthlyBudget } = req.body;
        if (!userId || monthlyBudget == null) {
            return res.status(400).json({ message: 'Monthly budget is required.' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const currentMonth = getCurrentMonthKey();
        let expenseSetting = await ExpenseSetting.findOne({ user: userId });

        if (!expenseSetting) {
            expenseSetting = new ExpenseSetting({
                user: userId,
                monthlyBudget,
                budgetUpdatedAt: new Date(),
                budgetCreditUsed: true,
                budgetCreditMonth: currentMonth
            });
        } else {
            ensureBudgetCredit(expenseSetting);
            if (expenseSetting.budgetCreditUsed) {
                return res.status(403).json({ message: 'Budget can only be updated once per month.' });
            }
            expenseSetting.monthlyBudget = monthlyBudget;
            expenseSetting.budgetUpdatedAt = new Date();
            expenseSetting.budgetCreditUsed = true;
            expenseSetting.budgetCreditMonth = currentMonth;
        }

        await expenseSetting.save();

        // Sync budget tracker and update the user's current balance
        await updateUserCurrentBalance(userId);

        return res.status(200).json({ message: 'Monthly budget updated successfully.', data: expenseSetting });
    } catch (error) {
        return res.status(500).json({ message: 'Budget update failed.' });
    }
};

exports.addFixedExpense = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { type, amount } = req.body;
        if (!userId || !type || amount == null) {
            return res.status(400).json({ message: 'Expense type and amount are required.' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const expenseSetting = await ExpenseSetting.findOne({ user: userId });
        if (!expenseSetting) {
            return res.status(400).json({ message: 'Set your monthly budget before adding fixed expenses.' });
        }

        expenseSetting.fixedExpenses.push({ type, amount });
        await expenseSetting.save();

        // Sync budget tracker and update the user's current balance
        await updateUserCurrentBalance(userId);

        return res.status(200).json({ message: 'Fixed expense added successfully.', data: expenseSetting });
    } catch (error) {
        return res.status(500).json({ message: 'Could not add fixed expense.' });
    }
};

exports.updateFixedExpense = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { type, amount } = req.body;
        const { expenseId } = req.params;

        if (!userId || !expenseId || !type || amount == null) {
            return res.status(400).json({ message: 'Expense ID, type, and amount are required.' });
        }

        const expenseSetting = await ExpenseSetting.findOne({ user: userId });
        if (!expenseSetting) {
            return res.status(404).json({ message: 'Expense settings not found for this user.' });
        }

        const fixedExpense = expenseSetting.fixedExpenses.id(expenseId);
        if (!fixedExpense) {
            return res.status(404).json({ message: 'Fixed expense not found.' });
        }

        fixedExpense.type = type;
        fixedExpense.amount = amount;
        await expenseSetting.save();

        // Sync budget tracker and update the user's current balance
        await updateUserCurrentBalance(userId);

        return res.status(200).json({ message: 'Fixed expense updated successfully.', data: expenseSetting });
    } catch (error) {
        return res.status(500).json({ message: 'Could not update fixed expense.' });
    }
};

exports.deleteFixedExpense = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { expenseId } = req.params;

        if (!userId || !expenseId) {
            return res.status(400).json({ message: 'Expense ID is required.' });
        }

        const expenseSetting = await ExpenseSetting.findOne({ user: userId });
        if (!expenseSetting) {
            return res.status(404).json({ message: 'Expense settings not found for this user.' });
        }

        const fixedExpense = expenseSetting.fixedExpenses.id(expenseId);
        if (!fixedExpense) {
            return res.status(404).json({ message: 'Fixed expense not found.' });
        }

        expenseSetting.fixedExpenses.pull(expenseId);
        await expenseSetting.save();

        // Sync budget tracker and update the user's current balance
        await updateUserCurrentBalance(userId);

        return res.status(200).json({ message: 'Fixed expense deleted successfully.', data: expenseSetting });
    } catch (error) {
        return res.status(500).json({ message: 'Could not delete fixed expense.' });
    }
};
