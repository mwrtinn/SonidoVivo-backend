
const { Router } = require('express');

const controller = require('../controllers/pedidos.controller');

const {
  autenticar,
  autorizar
} = require('../middlewares/auth.middleware');

const asyncH = require('../utils/asyncHandler');

const router = Router();

// Listar pedidos según el rol del usuario.
router.get(
  '/',
  autenticar,
  autorizar('Cliente', 'Administrador', 'Vendedor'),
  asyncH(controller.listar)
);

// Consultar el detalle de un pedido.
router.get(
  '/:id',
  autenticar,
  autorizar('Cliente', 'Administrador', 'Vendedor'),
  asyncH(controller.obtener)
);

// Crear un pedido: exclusivo del Cliente.
router.post(
  '/',
  autenticar,
  autorizar('Cliente'),
  asyncH(controller.crear)
);

// Cambiar el estado de un pedido.
router.patch(
  '/:id/estado',
  autenticar,
  autorizar('Administrador', 'Vendedor'),
  asyncH(controller.cambiarEstado)
);

module.exports = router;
