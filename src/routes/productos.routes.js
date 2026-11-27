
const { Router } = require('express');
const asyncH = require('../utils/asyncHandler');
const controller = require('../controllers/productos.controller');

const {
  autenticar,
  autorizar
} = require('../middlewares/auth.middleware');

const router = Router();

// Catálogo público
router.get(
  '/',
  asyncH(controller.listar)
);

// Listado administrativo, incluidos los inactivos
router.get(
  '/admin',
  autenticar,
  autorizar('Administrador'),
  asyncH(controller.listarAdmin)
);

// Detalle público
router.get(
  '/:id',
  asyncH(controller.obtener)
);

// Crear producto
router.post(
  '/',
  autenticar,
  autorizar('Administrador'),
  asyncH(controller.crear)
);

// Modificar o reactivar producto
router.patch(
  '/:id',
  autenticar,
  autorizar('Administrador'),
  asyncH(controller.modificar)
);

// Desactivación lógica
router.delete(
  '/:id',
  autenticar,
  autorizar('Administrador'),
  asyncH(controller.desactivar)
);

module.exports = router;
