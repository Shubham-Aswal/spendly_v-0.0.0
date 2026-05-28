const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const analyticsController = require('../controllers/analyticsController');

router.get('/', authMiddleware, analyticsController.getAnalytics);
router.get('/insights', authMiddleware, analyticsController.getAnalyticsInsights);

module.exports = router;
