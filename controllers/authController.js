const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sequelize = require('../config/db');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const School = require('../models/School');
const { sendEmail } = require('../utils/email');
const { Op } = require("sequelize");


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

    // 1. Validate role
    if (!role || !["teacher", "headteacher", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    let teacherProfile = null;
    let username, password, userEmail;

    // 2. Teacher/headteacher flow
    if (role === "teacher" || role === "headteacher") {
      if (!teacherData) {
        return res.status(400).json({ message: "Teacher data missing" });
      }

      // Parse teacherData (in case it's stringified in multipart/form-data)
      const parsedTeacherData = {};
      for (let key in teacherData) {
        try {
          parsedTeacherData[key] = JSON.parse(teacherData[key]);
        } catch {
          parsedTeacherData[key] = teacherData[key];
        }
      }

      parsedTeacherData.schoolId = parsedTeacherData.currentSchoolId;

      // ✅ Required fields
      const requiredFields = [
        { key: "firstName", name: "First Name" },
        { key: "lastName", name: "Last Name" },
        { key: "email", name: "Email" },
        { key: "nrc", name: "NRC" },
        { key: "tsNo", name: "TS Number" },
        { key: "currentSchoolId", name: "Current School" },
        { key: "currentSchoolType", name: "Current School Type" },
        { key: "currentPosition", name: "Current Position" },
      ];
      for (const { key, name } of requiredFields) {
        if (!parsedTeacherData[key] || parsedTeacherData[key].toString().trim() === "") {
          return res.status(400).json({ message: `${name} is required.` });
        }
      }

      // ✅ Email format check
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(parsedTeacherData.email)) {
        return res.status(400).json({ message: "Invalid email format." });
      }

      const nrcRegex = /^\d{6}\/\d{2}\/\d{1}$/;
      if (!nrcRegex.test(parsedTeacherData.nrc)) {
        return res.status(400).json({ message: "Invalid NRC format. Expected format: 123456/78/9" });
      }

      // ✅ Marital status check
      if (
        parsedTeacherData.maritalStatus &&
        !["Single", "Married", "Divorced", "Widowed"].includes(parsedTeacherData.maritalStatus)
      ) {
        return res.status(400).json({ message: "Invalid marital status." });
      }

      // ✅ Check duplicates (email, NRC, tsNo)
      // ✅ Check duplicates (email, NRC, tsNo)
const existingTeacher = await Teacher.findOne({
  where: {
    [Op.or]: [
      { email: parsedTeacherData.email },
      { nrc: parsedTeacherData.nrc },
      { tsNo: parsedTeacherData.tsNo }
    ]
  }
});

      if (existingTeacher) {
        let takenField;
        if (existingTeacher.email === parsedTeacherData.email) takenField = "Email";
        else if (existingTeacher.nrc === parsedTeacherData.nrc) takenField = "NRC";
        else if (existingTeacher.tsNo === parsedTeacherData.tsNo) takenField = "TS Number";
        return res.status(400).json({ message: `${takenField} is already registered.` });
      }

      // ✅ Handle uploaded files
      parsedTeacherData.medicalCertificate = req.files.medicalCertificate?.[0]?.path || null;
      parsedTeacherData.academicQualifications = req.files.academicQualifications?.[0]?.path || null;
      parsedTeacherData.professionalQualifications = req.files.professionalQualifications?.[0]?.path || null;

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

      // ✅ Convert experience to string if object/array
      if (parsedTeacherData.experience && typeof parsedTeacherData.experience !== "string") {
        parsedTeacherData.experience = JSON.stringify(parsedTeacherData.experience);
      }

      // ✅ Create teacher profile
      teacherProfile = await Teacher.create(parsedTeacherData);

      // Generate credentials
      username = generateUsername(parsedTeacherData.firstName, parsedTeacherData.lastName);
      password = generateRandomPassword();
      userEmail = parsedTeacherData.email;

    } else {
      // 3. Admin flow
      username = "admin" + Math.floor(10 + Math.random() * 90);
      password = generateRandomPassword();
    }

    // 4. Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username,
      password: hashedPassword,
      role,
      teacherProfileId: teacherProfile?.id || null,
    });

    // 5. Send welcome email
    if (userEmail) {
      const fullName = `${teacherProfile.firstName} ${teacherProfile.lastName}`;
      await sendEmail(
        userEmail,
        "Welcome to the System",
        `Dear ${fullName},\n\nYour account has been created.\n\nUsername: ${username}\nPassword: ${password}\n\nPlease change your password after first login.`
      );
    }

    // ✅ Success response
    res.status(201).json({
      message: teacherProfile ? "Teacher created successfully" : "User registered successfully",
      userId: newUser.id,
      username,
      password,
      teacherProfileId: teacherProfile?.id,
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
