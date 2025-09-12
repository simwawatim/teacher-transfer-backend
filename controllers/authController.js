const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sequelize = require('../config/db');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const School = require('../models/School');

// Ensure models are synced
sequelize.sync();

exports.register = async (req, res) => {
  const { username, password, role, teacherData } = req.body;

  try {
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    let teacherProfile = null;

    if (role === 'teacher' || role === 'headteacher') {
      if (!teacherData) return res.status(400).json({ message: 'Teacher data required' });

      const school = await School.findByPk(teacherData.currentSchoolId);
      if (!school) return res.status(400).json({ message: 'Current school does not exist' });

      teacherProfile = await Teacher.create({
        firstName: teacherData.firstName,
        lastName: teacherData.lastName,
        nrc: teacherData.nrc,
        tsNo: teacherData.tsNo,
        address: teacherData.address,
        maritalStatus: teacherData.maritalStatus,
        medicalCertificate: teacherData.medicalCertificate,
        academicQualifications: teacherData.academicQualifications,
        professionalQualifications: teacherData.professionalQualifications,
        currentSchoolType: teacherData.currentSchoolType,
        currentSchoolName: teacherData.currentSchoolName,
        currentPosition: teacherData.currentPosition,
        subjectSpecialization: teacherData.subjectSpecialization,
        experience: JSON.stringify(teacherData.experience || []),
        currentSchoolId: teacherData.currentSchoolId
      });
    }

    const newUser = await User.create({
      username,
      password: hashedPassword,
      role: role || 'teacher',
      teacherProfileId: teacherProfile ? teacherProfile.id : null
    });

    res.status(201).json({
      message: 'User registered successfully',
      userId: newUser.id,
      teacherProfileId: teacherProfile ? teacherProfile.id : null
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};


exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ where: { username }, include: [{ model: Teacher, as: 'teacherProfile' }] });
    if (!user) return res.status(400).json({ message: 'User not found' });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: 'Invalid password' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
