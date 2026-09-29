const express = require('express');
const router = express.Router();
const { handleCopilotChat } = require('../controllers/copilot.controller');
const { protect } = require('../middleware/auth.middleware');

// POST /api/copilot/chat
router.post('/chat', protect, handleCopilotChat);

module.exports = router;
