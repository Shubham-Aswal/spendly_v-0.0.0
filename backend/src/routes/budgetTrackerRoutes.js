const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const budgetTrackerController = require('../controllers/budgetTrackerController');

// Get budget tracker data
router.get('/', authMiddleware, budgetTrackerController.getBudgetTracker);

// Update budget tracker (typically called after transactions)
router.put('/update', authMiddleware, budgetTrackerController.updateBudgetTracker);

// Sync budget tracker with expense settings
router.put('/sync', authMiddleware, budgetTrackerController.syncBudgetTracker);

// Get budget summary for current month
router.get('/summary', authMiddleware, budgetTrackerController.getBudgetSummary);

module.exports = router;