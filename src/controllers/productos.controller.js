
const repository = require('../repositories/productos.repository');
const { validarProducto } = require('../dto/productos.dto');

function obtenerId(req) {
  const id = Number(req.params.id);

  if (
    !Number.isInteger(id) ||
    id <= 0 ||
    id > 2147483647
  ) {
    return null;
  }

  return id;
}

async function listar(req, res) {
  const productos = await repository.listar();

  return res.status(200).json(productos);
}

async function listarAdmin(req, res) {
  const productos = await repository.listar(true);

  return res.status(200).json(productos);
}

async function obtener(req, res) {
  const id = obtenerId(req);

  if (!id) {
    return res.status(400).json({
      mensaje: 'ID de producto inválido.'
    });
  }

  const producto = await repository.obtener(id);

  if (!producto) {
    return res.status(404).json({
      mensaje: 'Producto no encontrado.'
    });
  }

  return res.status(200).json(producto);
}

async function crear(req, res) {
  const { datos, errores } = validarProducto(req.body);

  if (errores.length > 0) {
    return res.status(400).json({
      mensaje: 'Datos de producto inválidos.',
      detalles: errores
    });
  }

  try {
    const producto = await repository.crear(datos);

    return res.status(201).json(producto);

  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        mensaje: 'El código del producto ya existe.'
      });
    }

    throw error;
  }
}

async function modificar(req, res) {
  const id = obtenerId(req);

  if (!id) {
    return res.status(400).json({
      mensaje: 'ID de producto inválido.'
    });
  }

  const { datos, errores } = validarProducto(req.body, true);

  if (errores.length > 0) {
    return res.status(400).json({
      mensaje: 'Datos de producto inválidos.',
      detalles: errores
    });
  }

  try {
    const producto = await repository.modificar(id, datos);

    if (!producto) {
      return res.status(404).json({
        mensaje: 'Producto no encontrado.'
      });
    }

    return res.status(200).json(producto);

  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        mensaje: 'El código del producto ya existe.'
      });
    }

    throw error;
  }
}

async function desactivar(req, res) {
  const id = obtenerId(req);

  if (!id) {
    return res.status(400).json({
      mensaje: 'ID de producto inválido.'
    });
  }

  const desactivado = await repository.desactivar(id);

  if (!desactivado) {
    return res.status(404).json({
      mensaje: 'Producto no encontrado.'
    });
  }

  return res.status(204).send();
}

module.exports = {
  listar,
  listarAdmin,
  obtener,
  crear,
  modificar,
  desactivar
};
