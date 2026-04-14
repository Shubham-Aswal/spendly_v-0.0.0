const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Signup route
router.post('/signup', authController.signUp);

// Sign-in route
router.post('/signin', authController.signIn);

// Duplicate user check route
router.post('/check-user', authController.checkUser);

module.exports = router;
