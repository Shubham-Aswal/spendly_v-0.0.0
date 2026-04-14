const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const loanController = require('../controllers/loanController');

router.get('/', authMiddleware, loanController.getLoans);
router.post('/', authMiddleware, loanController.createLoan);

module.exports = router;