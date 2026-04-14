const Transaction = require('../models/Transaction');

exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const transactions = await Transaction.find({ user: userId }).sort({ date: -1 }).limit(50);
    return res.status(200).json({ transactions });
  } catch (error) {
    return res.status(500).json({ message: 'Could not retrieve transactions.' });
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

    const transaction = await Transaction.create({
      user: userId,
      type: type || 'expense',
      category,
      amount,
      description: description || '',
      date: date ? new Date(date) : undefined
    });

    return res.status(201).json({ message: 'Transaction saved successfully.', transaction });
  } catch (error) {
    return res.status(500).json({ message: 'Could not save transaction.' });
  }
};