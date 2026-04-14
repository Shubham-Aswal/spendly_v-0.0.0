const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lender: {
    type: String,
    trim: true,
    default: ''
  },
  amount: {
    type: Number,
    required: [true, 'Loan amount is required'],
    min: [0, 'Loan amount must be positive']
  },
  monthlyPayment: {
    type: Number,
    required: [true, 'Monthly payment is required'],
    min: [0, 'Monthly payment must be positive']
  },
  interestRate: {
    type: Number,
    default: 0,
    min: [0, 'Interest rate must be positive']
  },
  status: {
    type: String,
    enum: ['active', 'paid', 'pending'],
    default: 'active'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Loan = mongoose.model('Loan', loanSchema);
module.exports = Loan;