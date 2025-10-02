const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sequelize = require('../config/db');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const School = require('../models/School');
const { sendEmail } = require('../utils/email');

sequelize.sync();

function generateRandomPassword() {
  return Math.random().toString(36).slice(-4);
}

function generateUsername(firstName, lastName) {
  const randomNum = Math.floor(10 + Math.random() * 90);
  const f = firstName ? firstName.substring(0, 2).toLowerCase() : "xx";
  const l = lastName ? lastName.substring(0, 2).toLowerCase() : "yy";
  return `${f}${l}${randomNum}`;
}

function isValidEmail(email) {
  return /\S+@\S+\.\S+/.test(email);
}

exports.register = async (req, res) => {
  try {
    const { role, teacherData } = req.body;

    console.log("Body:", req.body);
    console.log("Files:", req.files);

    // Validate role
    if (!role || !["teacher", "headteacher", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    let teacherProfile = null;
    let username, password, userEmail;

    if (role === "teacher" || role === "headteacher") {
      if (!teacherData) {
        return res.status(400).json({ message: "Teacher data missing" });
      }

      // Parse teacherData fields if sent as JSON strings
      const parsedTeacherData = {};
      for (let key in teacherData) {
        try {
          parsedTeacherData[key] = JSON.parse(teacherData[key]);
        } catch {
          parsedTeacherData[key] = teacherData[key];
        }
      }

      // Map currentSchoolId to schoolId for consistency
      parsedTeacherData.schoolId = parsedTeacherData.currentSchoolId;

      // Validate that teacher belongs to a school
      if (!parsedTeacherData.schoolId) {
        return res.status(400).json({ message: "Teacher must belong to a school." });
      }

      // Handle uploaded files and store paths
      parsedTeacherData.medicalCertificate = req.files.medicalCertificate?.[0]?.path || null;
      parsedTeacherData.academicQualifications = req.files.academicQualifications?.[0]?.path || null;
      parsedTeacherData.professionalQualifications = req.files.professionalQualifications?.[0]?.path || null;

      // Validate required files
      const requiredFiles = [
        { key: "medicalCertificate", name: "Medical Certificate" },
        { key: "academicQualifications", name: "Academic Qualifications" },
        { key: "professionalQualifications", name: "Professional Qualifications" },
      ];

      for (const { key, name } of requiredFiles) {
        if (!parsedTeacherData[key]) {
          return res.status(400).json({ message: `${name} file is required.` });
        }
      }

      // Convert experience to JSON string if it's array/object
      parsedTeacherData.experience = JSON.stringify(parsedTeacherData.experience || []);

      // Create teacher profile in DB
      teacherProfile = await Teacher.create(parsedTeacherData);

      // Generate credentials
      username = generateUsername(parsedTeacherData.firstName, parsedTeacherData.lastName);
      password = generateRandomPassword();
      userEmail = parsedTeacherData.email;

    } else {
      // Admin or other roles
      username = "admin" + Math.floor(10 + Math.random() * 90);
      password = generateRandomPassword();
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username,
      password: hashedPassword,
      role,
      teacherProfileId: teacherProfile?.id || null
    });

    // Send welcome email if teacher
    if (userEmail) {
      const fullName = `${teacherProfile.firstName} ${teacherProfile.lastName}`;
      await sendEmail(
        userEmail,
        "Welcome",
        `Welcome ${fullName}. Username: ${username}, Password: ${password}`
      );
    }

    res.status(201).json({
      message: teacherProfile ? "Teacher created successfully" : "User registered successfully",
      userId: newUser.id,
      username,
      password,
      teacherProfileId: teacherProfile?.id
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || "Server error" });
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

    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      teacherProfileId: user.teacherProfileId || null 
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
