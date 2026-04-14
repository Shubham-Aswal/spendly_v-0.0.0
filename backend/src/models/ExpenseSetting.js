const mongoose = require('mongoose');

const fixedExpenseSchema = new mongoose.Schema({
    type: {
        type: String,
        required: [true, 'Expense type is required'],
        trim: true
    },
    amount: {
        type: Number,
        required: [true, 'Expense amount is required'],
        min: [0, 'Expense amount must be positive']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const expenseSettingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    monthlyBudget: {
        type: Number,
        default: 0,
        min: [0, 'Monthly budget must be positive']
    },
    budgetUpdatedAt: {
        type: Date,
        default: null
    },
    budgetCreditUsed: {
        type: Boolean,
        default: false
    },
    budgetCreditMonth: {
        type: String,
        default: ''
    },
    fixedExpenses: [fixedExpenseSchema],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

expenseSettingSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const ExpenseSetting = mongoose.model('ExpenseSetting', expenseSettingSchema);
module.exports = ExpenseSetting;
