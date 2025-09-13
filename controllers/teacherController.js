const Teacher = require('../models/Teacher');
const School = require('../models/School');
const User = require('../models/User'); 

// Get all teachers
exports.getTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.findAll({ include: { model: School, as: 'currentSchool' } });
    res.status(200).json(teachers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get single teacher
exports.getTeacherById = async (req, res) => {
  try {
    const teacher = await Teacher.findByPk(req.params.id, { include: { model: School, as: 'currentSchool' } });
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    res.status(200).json(teacher);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update teacher
exports.updateTeacher = async (req, res) => {
  try {
    const [updatedRows, [updatedTeacher]] = await Teacher.update(req.body, {
      where: { id: req.params.id },
      returning: true,
    });

    if (updatedRows === 0) return res.status(404).json({ message: 'Teacher not found' });
    // Reload with association
    const teacherWithSchool = await Teacher.findByPk(updatedTeacher.id, { include: { model: School, as: 'currentSchool' } });
    res.status(200).json(teacherWithSchool);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete teacher

exports.deleteTeacher = async (req, res) => {
  try {
    const teacherId = req.params.id;

    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Delete related User first
    await User.destroy({ where: { teacherProfileId: teacher.id } });

    // Delete Teacher
    await teacher.destroy();

    res.json({ message: 'Teacher and related User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};