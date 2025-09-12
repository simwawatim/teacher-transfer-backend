const School = require('../models/School');

// Create a new school
exports.createSchool = async (req, res) => {
  try {
    const { name, code, district, province } = req.body;

    // Check if school exists
    const existing = await School.findOne({ where: { code } });
    if (existing) return res.status(400).json({ message: 'School code already exists' });

    const school = await School.create({ name, code, district, province });
    res.status(201).json(school);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all schools
exports.getSchools = async (req, res) => {
  try {
    const schools = await School.findAll();
    res.status(200).json(schools);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get single school
exports.getSchoolById = async (req, res) => {
  try {
    const school = await School.findByPk(req.params.id);
    if (!school) return res.status(404).json({ message: 'School not found' });
    res.status(200).json(school);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update school
exports.updateSchool = async (req, res) => {
  try {
    const [updatedRows, [updatedSchool]] = await School.update(req.body, {
      where: { id: req.params.id },
      returning: true,
    });

    if (updatedRows === 0) return res.status(404).json({ message: 'School not found' });
    res.status(200).json(updatedSchool);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete school
exports.deleteSchool = async (req, res) => {
  try {
    const deleted = await School.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'School not found' });
    res.status(200).json({ message: 'School deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
