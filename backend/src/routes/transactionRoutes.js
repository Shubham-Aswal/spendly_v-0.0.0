const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const transactionController = require('../controllers/transactionController');

router.get('/', authMiddleware, transactionController.getTransactions);
router.get('/daily', authMiddleware, transactionController.getDailyExpenses);
router.get('/heatmap', authMiddleware, transactionController.getExpenseHeatmap);
router.post('/', authMiddleware, transactionController.createTransaction);

module.exports = router;