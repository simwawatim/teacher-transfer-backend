const Teacher = require('../models/Teacher');
const School = require('../models/School');
const User = require('../models/User'); 
const path = require('path');
const fs = require('fs');

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
    const teacher = await Teacher.findByPk(req.params.id);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    const allowedFields = ['email', 'address', 'maritalStatus'];
    const updates = {};

    for (const key of allowedFields) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    // Handle profile picture
    if (req.file) {
      updates.profilePicture = `uploads/teachers/${req.file.filename}`;

      // Delete old profile picture
      if (teacher.profilePicture) {
        const oldPath = path.join(__dirname, '..', teacher.profilePicture);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    await teacher.update(updates);

    const updatedTeacher = await Teacher.findByPk(req.params.id, {
      include: { model: School, as: 'currentSchool' },
    });

    res.status(200).json(updatedTeacher);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete teacher
exports.deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findByPk(req.params.id);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    // Delete related User first
    await User.destroy({ where: { teacherProfileId: teacher.id } });

    // Delete profile picture file
    if (teacher.profilePicture) {
      const filePath = path.join(__dirname, '..', teacher.profilePicture);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    // Delete Teacher
    await teacher.destroy();

    res.json({ message: 'Teacher and related User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

exports.getProfilePicture = async (req, res) => {
  console.log("[INFO] Fetching profile picture for user:", req.user);
  try {
    const teacherId = req.user.teacherProfileId;

    const teacher = await Teacher.findByPk(teacherId, {
      attributes: ['profilePicture']
    });

    if (!teacher || !teacher.profilePicture) {
      return res.status(404).json({ message: 'Profile picture not found' });
    }


    const profilePath = teacher.profilePicture.replace(/^\/+/, '');
    const fullUrl = `http://localhost:4000/${profilePath}`;

    res.status(200).json({ profilePicture: fullUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
