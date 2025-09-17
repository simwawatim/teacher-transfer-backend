const express = require('express');
const router = express.Router();
const { getStats } = require('../controllers/statsController');
const authenticateUser = require("../middleware/authenticateUser");

router.get('/', authenticateUser, getStats);

module.exports = router;
