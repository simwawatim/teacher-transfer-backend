const express = require('express');
const router = express.Router();
const {
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher
} = require('../controllers/teacherController');
const upload = require('../middleware/upload'); 


router.get('/', getTeachers);
router.get('/:id', getTeacherById);
router.put('/:id', upload.single('profilePicture'), updateTeacher);
router.delete('/:id', deleteTeacher);

module.exports = router;
