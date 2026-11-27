
const pool = require('../db/pool');
const repo = require('../repositories/pedidos.repository');

const {
  validarPedido,
  validarEstado
} = require('../dto/pedidos.dto');

class PedidoError extends Error {
  constructor(status, mensaje, detalles = []) {
    super(mensaje);

    this.name = 'PedidoError';
    this.status = status;
    this.detalles = detalles;
  }
}

const ROLES_ADMINISTRATIVOS = [
  'Administrador',
  'Vendedor'
];

function validarUsuario(usuario) {
  const id = String(usuario?.id_usuario ?? '');

  if (
    !/^[1-9]\d{0,18}$/.test(id) ||
    BigInt(id) > 9223372036854775807n
  ) {
    throw new PedidoError(
      401,
      'Usuario no autenticado.'
    );
  }

  return id;
}

function validarIdPedido(id) {
  const numero = Number(id);

  if (
    !Number.isInteger(numero) ||
    numero <= 0 ||
    numero > 2147483647
  ) {
    throw new PedidoError(
      400,
      'El ID del pedido no es válido.'
    );
  }

  return numero;
}

function obtenerAlcance(usuario) {
  const idUsuario = validarUsuario(usuario);

  if (ROLES_ADMINISTRATIVOS.includes(usuario.rol)) {
    return null;
  }

  if (usuario.rol === 'Cliente') {
    return idUsuario;
  }

  throw new PedidoError(
    403,
    'No tienes permisos para consultar pedidos.'
  );
}

function calcularPrecioUnitario(producto) {
  if (producto.en_oferta && producto.descuento > 0) {
    return Math.round(
      producto.precio * (100 - producto.descuento) / 100
    );
  }

  return producto.precio;
}

async function ejecutarTransaccion(operacion) {
  const cliente = await pool.connect();

  let errorConexion;

  try {
    await cliente.query('BEGIN');

    const resultado = await operacion(cliente);

    await cliente.query('COMMIT');

    return resultado;

  } catch (error) {
    try {
      await cliente.query('ROLLBACK');
    } catch (errorRollback) {
      errorConexion = errorRollback;
    }

    throw error;

  } finally {
    cliente.release(errorConexion);
  }
}

async function listar(usuario) {
  const alcance = obtenerAlcance(usuario);

  return repo.listar(alcance);
}

async function obtener(id, usuario) {
  const idPedido = validarIdPedido(id);

  const alcance = obtenerAlcance(usuario);

  const pedido = await repo.obtener(
    idPedido,
    alcance
  );

  if (!pedido) {
    throw new PedidoError(
      404,
      'Pedido no encontrado.'
    );
  }

  return pedido;
}

async function crear(usuario, cuerpo) {
  const idUsuario = validarUsuario(usuario);

  if (usuario.rol !== 'Cliente') {
    throw new PedidoError(
      403,
      'Solo los clientes pueden realizar pedidos.'
    );
  }

  const { datos, errores } = validarPedido(cuerpo);

  if (errores.length > 0) {
    throw new PedidoError(
      400,
      'Los datos del pedido no son válidos.',
      errores
    );
  }

  return ejecutarTransaccion(async (cliente) => {
    const itemsOrdenados = [...datos.items].sort(
      (a, b) => a.id_producto - b.id_producto
    );

    const ids = itemsOrdenados.map(
      item => item.id_producto
    );

    const productos = await repo.bloquearProductos(
      cliente,
      ids
    );

    const productosPorId = new Map(
      productos.map(producto => [
        producto.id_producto,
        producto
      ])
    );

    const detalles = [];

    let total = 0n;

    for (const item of itemsOrdenados) {
      const producto = productosPorId.get(
        item.id_producto
      );

      if (!producto || !producto.activo) {
        throw new PedidoError(
          409,
          `El producto ${item.id_producto} no está disponible.`
        );
      }

      if (producto.stock < item.cantidad) {
        throw new PedidoError(
          409,
          `Stock insuficiente para ${producto.nombre}.`,
          [
            `Cantidad solicitada: ${item.cantidad}`,
            `Stock disponible: ${producto.stock}`
          ]
        );
      }

      const precioUnitario =
        calcularPrecioUnitario(producto);

      const subtotal =
        BigInt(precioUnitario) *
        BigInt(item.cantidad);

      total += subtotal;

      if (total > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new PedidoError(
          400,
          'El total del pedido excede el límite permitido.'
        );
      }

      detalles.push({
        id_producto: producto.id_producto,
        codigo: producto.codigo,
        nombre: producto.nombre,
        cantidad: item.cantidad,
        precio_unitario: precioUnitario
      });
    }

    const idPedido = await repo.crearPedido(
      cliente,
      idUsuario,
      datos,
      total.toString()
    );

    for (const detalle of detalles) {
      await repo.crearDetalle(
        cliente,
        idPedido,
        detalle
      );

      const stockActualizado = await repo.modificarStock(
        cliente,
        detalle.id_producto,
        -detalle.cantidad
      );

      if (!stockActualizado) {
        throw new PedidoError(
          409,
          `No se pudo descontar el stock de ${detalle.nombre}.`
        );
      }
    }

    return repo.obtener(
      idPedido,
      idUsuario,
      cliente
    );
  });
}

function obtenerTransiciones(pedido) {
  switch (pedido.estado) {
    case 'En preparación':
      return pedido.entrega === 'despacho'
        ? ['Enviado', 'Cancelado']
        : ['Listo para retiro', 'Cancelado'];

    case 'Enviado':
      return pedido.entrega === 'despacho'
        ? ['Entregado']
        : [];

    case 'Listo para retiro':
      return pedido.entrega === 'retiro'
        ? ['Entregado']
        : [];

    case 'Entregado':
    case 'Cancelado':
      return [];

    default:
      return [];
  }
}

async function cambiarEstado(id, usuario, cuerpo) {
  validarUsuario(usuario);

  if (!ROLES_ADMINISTRATIVOS.includes(usuario.rol)) {
    throw new PedidoError(
      403,
      'No tienes permisos para modificar el estado del pedido.'
    );
  }

  const idPedido = validarIdPedido(id);

  const { datos, errores } = validarEstado(cuerpo);

  if (errores.length > 0) {
    throw new PedidoError(
      400,
      'El estado del pedido no es válido.',
      errores
    );
  }

  return ejecutarTransaccion(async (cliente) => {
    const pedido = await repo.bloquearPedido(
      cliente,
      idPedido
    );

    if (!pedido) {
      throw new PedidoError(
        404,
        'Pedido no encontrado.'
      );
    }

    const nuevoEstado = datos.estado;

    // Repetir el mismo estado no modifica el stock.
    if (pedido.estado === nuevoEstado) {
      return repo.obtener(
        idPedido,
        null,
        cliente
      );
    }

    const estadosPermitidos =
      obtenerTransiciones(pedido);

    if (!estadosPermitidos.includes(nuevoEstado)) {
      throw new PedidoError(
        409,
        `No se puede cambiar de "${pedido.estado}" a "${nuevoEstado}".`,
        estadosPermitidos.length > 0
          ? [
              `Estados permitidos: ${estadosPermitidos.join(', ')}`
            ]
          : ['El pedido se encuentra en un estado final.']
      );
    }

    if (nuevoEstado === 'Cancelado') {
      const detalles = await repo.listarDetalles(
        cliente,
        idPedido
      );

      const ids = detalles.map(
        detalle => detalle.id_producto
      );

      await repo.bloquearProductos(
        cliente,
        ids
      );

      for (const detalle of detalles) {
        const resultado = await repo.modificarStock(
          cliente,
          detalle.id_producto,
          detalle.cantidad
        );

        if (!resultado) {
          throw new PedidoError(
            409,
            `No se pudo restaurar el stock de ${detalle.nombre}.`
          );
        }
      }
    }

    await repo.actualizarEstado(
      cliente,
      idPedido,
      nuevoEstado
    );

    return repo.obtener(
      idPedido,
      null,
      cliente
    );
  });
}

module.exports = {
  PedidoError,
  listar,
  obtener,
  crear,
  cambiarEstado
};
