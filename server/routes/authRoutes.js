const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// When a POST request hits /signup, run the signup function we just wrote
router.post('/signup', authController.signup);

// When a POST request hits /login, run the login function
router.post('/login', authController.login);

module.exports = router;