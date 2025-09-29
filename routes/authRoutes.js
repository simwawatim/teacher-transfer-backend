const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const uploadDocs = require('../middleware/uploadDocs');

router.post(
  '/register',
  uploadDocs.fields([
    { name: 'medicalCertificate', maxCount: 1 },
    { name: 'academicQualifications', maxCount: 1 },
    { name: 'professionalQualifications', maxCount: 1 }
  ]),
  register
);

router.post('/login', login);

module.exports = router;
