const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sequelize = require('../config/db');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const School = require('../models/School');

sequelize.sync();

const isValidEmail = (email) => {
  const re = /\S+@\S+\.\S+/;
  return re.test(email);
};

exports.register = async (req, res) => {
  const { username, password, role, teacherData } = req.body;

  try {
    // Basic validations
    if (!username || username.trim() === '') return res.status(400).json({ message: 'Username is required' });
    if (!password || password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    const validRoles = ['teacher','headteacher','admin'];
    if (!role || !validRoles.includes(role)) return res.status(400).json({ message: `Role must be one of: ${validRoles.join(', ')}` });

    // Check username
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) return res.status(400).json({ message: 'Username already exists' });

    let teacherProfile = null;

    if (role === 'teacher' || role === 'headteacher') {
      if (!teacherData) return res.status(400).json({ message: 'Teacher data is required' });

      const requiredFields = ['firstName','lastName','email','currentSchoolId','currentPosition'];
      for (const field of requiredFields) {
        if (!teacherData[field]) return res.status(400).json({ message: `${field} is required for teacher profile` });
      }

      if (!isValidEmail(teacherData.email)) return res.status(400).json({ message: 'Invalid email format' });

      const school = await School.findByPk(teacherData.currentSchoolId);
      if (!school) return res.status(400).json({ message: 'Current school does not exist' });

      teacherProfile = await Teacher.create({
        ...teacherData,
        experience: JSON.stringify(teacherData.experience || [])
      });

      if (!teacherProfile || !teacherProfile.id) return res.status(500).json({ message: 'Failed to create teacher profile' });
    }

    // Create User
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username,
      password: hashedPassword,
      role,
      teacherProfileId: teacherProfile ? teacherProfile.id : null
    });

    res.status(201).json({
      message: teacherProfile ? 'User and teacher profile registered successfully' : 'User registered successfully',
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
    const user = await User.findOne({
      where: { username },
      include: [{ model: Teacher, as: 'teacherProfile' }]
    });

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