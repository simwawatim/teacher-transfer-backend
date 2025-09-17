const express = require('express');
const router = express.Router();
const {
  createSchool,
  getSchools,
  getSchoolById,
  updateSchool,
  deleteSchool
} = require('../controllers/schoolController');
const authenticateUser = require("../middleware/authenticateUser");

router.post('/', authenticateUser, createSchool);
router.get('/', authenticateUser , getSchools);
router.get('/:id', authenticateUser, getSchoolById);
router.put('/:id', authenticateUser, updateSchool);
router.delete('/:id', authenticateUser , deleteSchool);

module.exports = router;
