const express = require('express');
const router = express.Router();
const authorizeRole = require("../middleware/authorizeRole");
const {
  createSchool,
  getSchools,
  getSchoolById,
  updateSchool,
  deleteSchool
} = require('../controllers/schoolController');
const authenticateUser = require("../middleware/authenticateUser");

router.post('/', authenticateUser, authorizeRole('admin'), createSchool);
router.get('/', authenticateUser , getSchools);
router.get('/:id', authenticateUser, authorizeRole('admin'), getSchoolById);
router.put('/:id', authenticateUser, authorizeRole('admin'), updateSchool);
router.delete('/:id', authenticateUser , authorizeRole('admin'), deleteSchool);

module.exports = router;
createSchool