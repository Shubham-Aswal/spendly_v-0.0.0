const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const expenseController = require('../controllers/expenseController');

router.use(authMiddleware);

router.get('/', expenseController.getExpenseSettings);
router.post('/budget', expenseController.updateMonthlyBudget);
router.post('/fixed', expenseController.addFixedExpense);
router.put('/fixed/:expenseId', expenseController.updateFixedExpense);

module.exports = router;
