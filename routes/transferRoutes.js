const express = require('express');
const router = express.Router();
const {
  requestTransfer,
  getTransferRequests,
  getTransferById,
  updateTransferStatus
} = require('../controllers/transferController');

router.post('/', requestTransfer);
router.get('/', getTransferRequests);
router.get('/:requestId', getTransferById);
router.put('/:requestId/status', updateTransferStatus);

module.exports = router;
