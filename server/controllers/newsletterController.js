const Newsletter = require('../models/Newsletter');
const { validationResult } = require('express-validator');

const subscribe = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  try {
    const existing = await Newsletter.findOne({ email: req.body.email });
    if (existing) {
      if (existing.subscribed) {
        return res.status(409).json({ success: false, message: 'Email already subscribed.' });
      }
      existing.subscribed = true;
      await existing.save();
      return res.json({ success: true, message: 'You have been re-subscribed successfully!' });
    }
    await Newsletter.create({ email: req.body.email });
    res.status(201).json({ success: true, message: 'Subscribed successfully! Thank you for joining us.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
};

module.exports = { subscribe };
