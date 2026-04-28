const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { subscribe } = require('../controllers/newsletterController');

router.post('/subscribe',
  [body('email').isEmail().withMessage('Valid email is required')],
  subscribe
);

module.exports = router;
