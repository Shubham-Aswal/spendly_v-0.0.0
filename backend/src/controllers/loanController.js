const Loan = require('../models/Loan');

exports.getLoans = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const loans = await Loan.find({ user: userId }).sort({ createdAt: -1 });
    return res.status(200).json({ loans });
  } catch (error) {
    return res.status(500).json({ message: 'Could not retrieve loans.' });
  }
};

exports.createLoan = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { lender, amount, monthlyPayment, interestRate, status, dueDate } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (amount == null || monthlyPayment == null) {
      return res.status(400).json({ message: 'Loan amount and monthly payment are required.' });
    }

    const loan = await Loan.create({
      user: userId,
      lender: lender || '',
      amount,
      monthlyPayment,
      interestRate: interestRate || 0,
      status: status || 'active',
      dueDate: dueDate ? new Date(dueDate) : undefined
    });

    return res.status(201).json({ message: 'Loan added successfully.', loan });
  } catch (error) {
    return res.status(500).json({ message: 'Could not add loan.' });
  }
};