const TransferRequest = require('../models/TransferRequest');
const Teacher = require('../models/Teacher');
const School = require('../models/School');

exports.requestTransfer = async (req, res) => {
  const { teacherId, toSchoolId } = req.body;

  try {
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    const toSchool = await School.findByPk(toSchoolId);
    if (!toSchool) return res.status(404).json({ message: 'Target school not found' });

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


exports.getTransferRequests = async (req, res) => {
  try {
    const user = req.user;

    let whereClause = {};
  
    if (user.role !== 'admin') {
      whereClause.teacherId = user.id; 
    }

    const requests = await TransferRequest.findAll({
      where: whereClause,
      include: [
        { 
          model: Teacher, 
          as: 'teacher',
          include: [{ model: School, as: 'currentSchool' }]
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

exports.updateTransferStatus = async (req, res) => {
  const { requestId } = req.params;
  const { status, reason } = req.body;
  if (!['approved', 'rejected'].includes(status?.toLowerCase())) {
    return res.status(400).json({ message: 'Invalid status. Must be approved or rejected.' });
  }

  try {
    const transfer = await TransferRequest.findByPk(requestId);
    if (!transfer) return res.status(404).json({ message: "Transfer request not found" });

    if (status.toLowerCase() === 'approved') {
      const teacher = await Teacher.findByPk(transfer.teacherId);
      if (!teacher) return res.status(404).json({ message: "Teacher not found" });
      teacher.schoolId = transfer.toSchoolId;
      await teacher.save();
    }

    transfer.status = status.toLowerCase();
    transfer.statusReason = reason || "";
    await transfer.save();

    res.status(200).json({ message: `Transfer ${status.toLowerCase()} successfully`, transfer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



exports.getTransferById = async (req, res) => {
  const { requestId } = req.params;

  try {
    const transfer = await TransferRequest.findByPk(requestId, {
      include: [
        {
          model: Teacher,
          as: 'teacher',
          include: [{ model: School, as: 'currentSchool' }]
        },
        { model: School, as: 'fromSchool' },
        { model: School, as: 'toSchool' }
      ]
    });

    if (!transfer) return res.status(404).json({ message: 'Transfer request not found' });

    res.status(200).json(transfer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
