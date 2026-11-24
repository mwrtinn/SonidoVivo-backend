const { Router } = require('express');
const asyncH = require('../utils/asyncHandler');
const controller = require('../controllers/usuarios.controller');
const { autenticar, autorizar } = require('../middlewares/auth.middleware');

const router = Router();

router.use(autenticar);
router.get('/', autorizar('Administrador'), asyncH(controller.listar));
router.post('/', autorizar('Administrador'), asyncH(controller.crear));
// El control de propiedad (admin o dueño de la cuenta) está en el controlador
router.get('/:id', asyncH(controller.obtener));
router.patch('/:id', asyncH(controller.modificar));
router.delete('/:id', autorizar('Administrador'), asyncH(controller.desactivar));

module.exports = router;
