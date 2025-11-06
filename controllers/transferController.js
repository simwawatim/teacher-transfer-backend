const TransferRequest = require('../models/TransferRequest');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const School = require('../models/School');
const sendEmailViaAPI = require('../utils/sendEmailViaAPI');


exports.requestTransfer = async (req, res) => {
  const { teacherId, toSchoolId } = req.body;

  try {
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    const fromSchool = await School.findByPk(teacher.currentSchoolId);
    const toSchool = await School.findByPk(toSchoolId);
    if (!toSchool) return res.status(404).json({ message: 'Target school not found' });

    if (teacher.currentSchoolId === toSchoolId) {
      return res.status(400).json({ message: "You cannot request a transfer to your current school." });
    }

    const existing = await TransferRequest.findOne({
      where: { teacherId, status: 'pending' }
    });
    if (existing) {
      return res.status(400).json({ message: 'You already have a pending transfer request.' });
    }

    const transfer = await TransferRequest.create({
      teacherId,
      fromSchoolId: teacher.currentSchoolId,
      toSchoolId,
      status: 'pending'
    });

    if (teacher.email) {
      const message = `
        Hello <b>${teacher.firstName} ${teacher.lastName}</b>,<br><br>
        Your transfer request from <b>${fromSchool?.name || 'your current school'}</b> to <b>${toSchool.name}</b> has been submitted and is pending approval.<br><br>
        You will be notified once the status changes.<br><br>
        Regards,<br>
        School System
      `;

      await sendEmailViaAPI({
        to: teacher.email,
        subject: 'Transfer Request Submitted',
        message,
        header: 'Transfer Request',
        actionUrl: "https://teacher-transfer-frontend.vercel.app/transfer",
        actionText: "View Transfer"
      });
    }

    res.status(201).json(transfer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

exports.getTransferRequests = async (req, res) => {
  try {
    const user = req.user;
    console.log(`[INFO] User making request: id=${user.id}, role=${user.role}`);

    let whereClause = {};

    if (user.role === 'teacher') {
      if (!user.teacherProfileId) {
        console.error(`[ERROR] Teacher profile not linked. userId=${user.id}`);
        return res.status(400).json({ message: "Teacher profile not linked to this account." });
      }

      whereClause.teacherId = user.teacherProfileId;
      console.log(`[INFO] Applying filter for teacher: teacherId=${user.teacherProfileId}`);

    } else if (user.role === 'headteacher') {
      if (!user.teacherProfileId) {
        console.error(`[ERROR] Headteacher profile not linked. userId=${user.id}`);
        return res.status(400).json({ message: "Headteacher profile not linked to this account." });
      }

      const teacher = await Teacher.findByPk(user.teacherProfileId, {
        include: [{ model: School, as: 'currentSchool' }]
      });

      if (!teacher || !teacher.currentSchoolId) {
        console.error(`[ERROR] Headteacher does not belong to any school. userId=${user.id}`);
        return res.status(400).json({ message: "Headteacher does not belong to any school." });
      }

      whereClause.fromSchoolId = teacher.currentSchoolId;
      console.log(`[INFO] Applying filter for headteacher: fromSchoolId=${teacher.currentSchoolId}`);

    } else {
      console.log(`[INFO] Admin user: no filters applied`);
    }

    console.log(`[INFO] Fetching transfer requests with filter:`, whereClause);

    const requests = await TransferRequest.findAll({
      where: whereClause,
      include: [
        { 
          model: Teacher, 
          as: 'teacher',
          required: false, // allow requests without a teacher
          include: [{ model: School, as: 'currentSchool', required: false }]
        },
        { model: School, as: 'fromSchool', required: false },
        { model: School, as: 'toSchool', required: false }
      ],
      order: [['id', 'DESC']]
    });

    console.log(`[INFO] Found ${requests.length} transfer requests`);

    if (requests.length > 0) {
      console.log(`[INFO] Available Transfers:`);
      requests.forEach(reqItem => {
        const teacherName = reqItem.teacher 
          ? `${reqItem.teacher.firstName || ''} ${reqItem.teacher.lastName || ''}`.trim()
          : 'N/A';

        const fromSchoolName = reqItem.fromSchool?.name || 'N/A';
        const toSchoolName = reqItem.toSchool?.name || 'N/A';

        console.log(
          `- Transfer ID: ${reqItem.id}, Teacher: ${teacherName}, From: ${fromSchoolName}, To: ${toSchoolName}`
        );
      });
    } else {
      console.log(`[INFO] No available transfers found.`);
    }

    res.status(200).json(requests);

  } catch (err) {
    console.error(`[ERROR] Failed to get transfer requests: ${err.message}`, err);
    res.status(500).json({ message: err.message });
  }
};


exports.updateTransferStatus = async (req, res) => {
  const { requestId } = req.params;
  const { status, reason } = req.body;

  const allowedStatuses = [
    'pending',
    'headteacher_approved',
    'headteacher_rejected',
    'approved',
    'rejected'
  ];

  if (!status || !allowedStatuses.includes(status.toLowerCase())) {
    return res.status(400).json({ message: `Invalid status. Must be one of: ${allowedStatuses.join(", ")}` });
  }

  try {
    const transfer = await TransferRequest.findByPk(requestId, {
      include: [
        { model: Teacher, as: 'teacher' },
        { model: School, as: 'toSchool' },
        { model: School, as: 'fromSchool' }
      ]
    });

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

  
    if (transfer.teacher && transfer.teacher.email) {
      const teacher = transfer.teacher;
      const fromSchoolName = transfer.fromSchool?.name || 'your current school';
      const toSchoolName = transfer.toSchool?.name || 'target school';

      let emailMessage = `
        Hello <b>${teacher.firstName} ${teacher.lastName}</b>,<br><br>
        Your transfer request from <b>${fromSchoolName}</b> to <b>${toSchoolName}</b> has been updated.<br><br>
        <b>Status:</b> ${transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1)}<br>
      `;

      if (reason) {
        emailMessage += `<b>Reason:</b> ${reason}<br>`;
      }

      emailMessage += `<br>Regards,<br>School System`;

      await sendEmailViaAPI({
        to: teacher.email,
        subject: 'Transfer Request Status Update',
        message: emailMessage,
        header: 'Transfer Status Update',
        actionUrl: "https://teacher-transfer-frontend.vercel.app/transfer",
        actionText: "View Transfer"
      });
    }

    res.status(200).json({ message: `Transfer ${status.toLowerCase()} successfully`, transfer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || "Internal server error" });
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
