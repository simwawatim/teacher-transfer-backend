const TransferRequest = require('../models/TransferRequest');
const Teacher = require('../models/Teacher');
const School = require('../models/School');

// Submit a transfer request
exports.requestTransfer = async (req, res) => {
  const { teacherId, toSchoolId } = req.body;

  try {
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    const toSchool = await School.findByPk(toSchoolId);
    if (!toSchool) return res.status(404).json({ message: 'Target school not found' });

    // Prevent duplicate pending requests
    const existing = await TransferRequest.findOne({
      where: { teacherId, status: 'pending' }
    });
    if (existing) {
      return res.status(400).json({ message: 'You already have a pending transfer request.' });
    }

    const transfer = await TransferRequest.create({
      teacherId,
      fromSchoolId: teacher.schoolId,
      toSchoolId,
      status: 'pending'
    });

    res.status(201).json(transfer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all transfer requests
exports.getTransferRequests = async (req, res) => {
  try {
    const requests = await TransferRequest.findAll({
      include: [
        { 
          model: Teacher, 
          as: 'teacher',
          include: [{ model: School, as: 'currentSchool' }] // Correct alias
        },
        { model: School, as: 'fromSchool' },
        { model: School, as: 'toSchool' }
      ],
      order: [['id', 'DESC']]
    });
    res.status(200).json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Approve a transfer request
exports.approveTransfer = async (req, res) => {
  const { requestId } = req.params;

  try {
    const transfer = await TransferRequest.findByPk(requestId);
    if (!transfer) return res.status(404).json({ message: 'Transfer request not found' });

    const teacher = await Teacher.findByPk(transfer.teacherId);
    teacher.schoolId = transfer.toSchoolId;
    await teacher.save();

    transfer.status = 'approved';
    await transfer.save();

    res.status(200).json({ message: 'Transfer approved', transfer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Reject a transfer request
exports.rejectTransfer = async (req, res) => {
  const { requestId } = req.params;

  try {
    const transfer = await TransferRequest.findByPk(requestId);
    if (!transfer) return res.status(404).json({ message: 'Transfer request not found' });

    transfer.status = 'rejected';
    await transfer.save();

    res.status(200).json({ message: 'Transfer rejected', transfer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
