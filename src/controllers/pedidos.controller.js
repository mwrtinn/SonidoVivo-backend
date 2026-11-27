
const servicio = require('../services/pedidos.service');

function manejarError(error, res, next) {
  if (error instanceof servicio.PedidoError) {
    return res.status(error.status).json({
      mensaje: error.message,
      ...(error.detalles.length > 0
        ? { detalles: error.detalles }
        : {})
    });
  }

  return next(error);
}

async function listar(req, res, next) {
  try {
    const pedidos = await servicio.listar(
      req.usuario
    );

    return res.status(200).json(pedidos);

  } catch (error) {
    return manejarError(error, res, next);
  }
}

async function obtener(req, res, next) {
  try {
    const pedido = await servicio.obtener(
      req.params.id,
      req.usuario
    );

    return res.status(200).json(pedido);

  } catch (error) {
    return manejarError(error, res, next);
  }
}

async function crear(req, res, next) {
  try {
    const pedido = await servicio.crear(
      req.usuario,
      req.body
    );

    return res.status(201).json(pedido);

  } catch (error) {
    return manejarError(error, res, next);
  }
}

async function cambiarEstado(req, res, next) {
  try {
    const pedido = await servicio.cambiarEstado(
      req.params.id,
      req.usuario,
      req.body
    );

    return res.status(200).json(pedido);

  } catch (error) {
    return manejarError(error, res, next);
  }
}

module.exports = {
  listar,
  obtener,
  crear,
  cambiarEstado
};
