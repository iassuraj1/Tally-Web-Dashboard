const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { submitContact, getContacts } = require('../controllers/contactController');

router.post('/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('message').trim().isLength({ min: 10 }).withMessage('Message must be at least 10 characters'),
  ],
  submitContact
);

router.get('/', getContacts);

module.exports = router;
