const { Router } = require('express');
const asyncH = require('../utils/asyncHandler');
const controller = require('../controllers/auth.controller');
const { autenticar } = require('../middlewares/auth.middleware');
const router = Router();

router.get('/me', autenticar, asyncH(controller.perfil));
router.post('/register', asyncH(controller.registrar));
router.post('/login', asyncH(controller.login));

module.exports = router;