const { Router } = require('express');
const asyncH = require('../utils/asyncHandler');
const controller = require('../controllers/auth.controller');

const router = Router();
router.post('/register', asyncH(controller.registrar));
router.post('/login', asyncH(controller.login));

module.exports = router;