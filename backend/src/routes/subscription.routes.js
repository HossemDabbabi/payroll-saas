const express = require('express');
const router = express.Router();
const { getPlans, getCurrentSubscription, upgradePlan } = require('../controllers/subscription.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/plans', getPlans);
router.get('/current', protect, getCurrentSubscription);
router.post('/upgrade', protect, upgradePlan);

module.exports = router;
