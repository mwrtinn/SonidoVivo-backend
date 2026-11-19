const { Router } = require('express');
const asyncH = require('../utils/asyncHandler');
const controller = require('../controllers/auth.controller');

const router = Router();
router.post('/register', asyncH(controller.registrar));

module.exports = router;