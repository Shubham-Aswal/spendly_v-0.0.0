const mongoose = require('mongoose');

const budgetTrackerSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    // Base values from ExpenseSetting
    monthlyBudget: {
        type: Number,
        default: 0,
        min: [0, 'Monthly budget must be positive']
    },
    totalFixedExpenses: {
        type: Number,
        default: 0,
        min: [0, 'Fixed expenses must be positive']
    },

    // Calculated values
    currentBalance: {
        type: Number,
        default: 0,
        // monthlyBudget - totalFixedExpenses - totalTransactionsThisMonth
    },

    // Monthly tracking
    month: {
        type: String, // Format: YYYY-MM
        required: true
    },
    totalTransactionsThisMonth: {
        type: Number,
        default: 0,
        min: [0, 'Transaction total must be positive']
    },

    // Daily tracking
    dailySafeSpent: {
        type: Number,
        default: 0,
        // currentBalance / remainingDaysInMonth
    },
    remainingDaysInMonth: {
        type: Number,
        min: [0, 'Remaining days must be positive'],
        max: [31, 'Remaining days cannot exceed 31']
    },

    // Tracking dates
    lastTransactionUpdate: {
        type: Date,
        default: null
    },
    lastBalanceCalculation: {
        type: Date,
        default: Date.now
    },

    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for performance
budgetTrackerSchema.index({ user: 1, month: 1 }, { unique: true });
budgetTrackerSchema.index({ user: 1 });

// Pre-save middleware to update timestamps and calculate derived values
budgetTrackerSchema.pre('save', function(next) {
    this.updatedAt = Date.now();

    // Calculate current balance: monthlyBudget - totalFixedExpenses - totalTransactionsThisMonth
    this.currentBalance = this.monthlyBudget - this.totalFixedExpenses - this.totalTransactionsThisMonth;

    // Calculate daily safe spent: currentBalance / remainingDaysInMonth (avoid division by zero)
    if (this.remainingDaysInMonth && this.remainingDaysInMonth > 0) {
        this.dailySafeSpent = this.currentBalance / this.remainingDaysInMonth;
    } else {
        this.dailySafeSpent = 0;
    }

    next();
});

// Static method to get or create budget tracker for user and month
budgetTrackerSchema.statics.getOrCreateForUser = async function(userId, month = null) {
    if (!month) {
        const now = new Date();
        month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    let tracker = await this.findOne({ user: userId, month: month });

    if (!tracker) {
        // Get user's expense settings to initialize
        const ExpenseSetting = mongoose.model('ExpenseSetting');
        const expenseSetting = await ExpenseSetting.findOne({ user: userId });

        const monthlyBudget = expenseSetting ? expenseSetting.monthlyBudget : 0;
        const totalFixedExpenses = expenseSetting && expenseSetting.fixedExpenses ?
            expenseSetting.fixedExpenses.reduce((sum, expense) => sum + expense.amount, 0) : 0;

        // Calculate remaining days in month
        const now = new Date();
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const remainingDays = Math.max(1, lastDayOfMonth.getDate() - now.getDate() + 1);

        tracker = new this({
            user: userId,
            month: month,
            monthlyBudget: monthlyBudget,
            totalFixedExpenses: totalFixedExpenses,
            remainingDaysInMonth: remainingDays
        });

        await tracker.save();
    }

    return tracker;
};

// Method to update transaction total for the month
budgetTrackerSchema.methods.updateTransactionTotal = async function() {
    const Transaction = mongoose.model('Transaction');

    // Get start and end of current month
    const [year, monthNum] = this.month.split('-').map(Number);
    const startOfMonth = new Date(year, monthNum - 1, 1);
    const endOfMonth = new Date(year, monthNum, 1);

    // Calculate total expenses for this month
    const result = await Transaction.aggregate([
        {
            $match: {
                user: this.user,
                type: 'expense',
                date: {
                    $gte: startOfMonth,
                    $lt: endOfMonth
                }
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: '$amount' }
            }
        }
    ]);

    this.totalTransactionsThisMonth = result.length > 0 ? result[0].total : 0;
    this.lastTransactionUpdate = new Date();

    return this.save();
};

// Method to sync with expense settings
budgetTrackerSchema.methods.syncWithExpenseSettings = async function() {
    const ExpenseSetting = mongoose.model('ExpenseSetting');
    const expenseSetting = await ExpenseSetting.findOne({ user: this.user });

    if (expenseSetting) {
        this.monthlyBudget = expenseSetting.monthlyBudget;
        this.totalFixedExpenses = expenseSetting.fixedExpenses ?
            expenseSetting.fixedExpenses.reduce((sum, expense) => sum + expense.amount, 0) : 0;
    }

    return this.save();
};

const BudgetTracker = mongoose.model('BudgetTracker', budgetTrackerSchema);
module.exports = BudgetTracker;