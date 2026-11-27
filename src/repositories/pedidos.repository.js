
const pool = require('../db/pool');

const CAMPOS_PEDIDO = `
  p.id_pedido AS id,
  p.id_pedido,
  p.id_usuario,
  p.nombre,
  p.email,
  p.telefono,
  p.entrega,
  p.direccion,
  p.estado,
  p.total,
  p.fecha,
  p.fecha_actualizacion
`;

function normalizarPedido(pedido) {
  if (!pedido) return null;

  const total = Number(pedido.total);

  if (!Number.isSafeInteger(total)) {
    throw new Error('El total del pedido excede el límite permitido.');
  }

  return {
    ...pedido,
    total
  };
}

async function listar(idUsuario, db = pool) {
  if (idUsuario === undefined) {
    throw new Error('Debe indicarse el alcance de la consulta.');
  }

  const resultado = await db.query(
    `
      SELECT ${CAMPOS_PEDIDO}
      FROM pedidos p
      WHERE (
        $1::bigint IS NULL
        OR p.id_usuario = $1::bigint
      )
      ORDER BY p.fecha DESC, p.id_pedido DESC
    `,
    [idUsuario]
  );

  return resultado.rows.map(normalizarPedido);
}

async function obtener(id, idUsuario, db = pool) {
  if (idUsuario === undefined) {
    throw new Error('Debe indicarse el alcance de la consulta.');
  }

  const resultado = await db.query(
    `
      SELECT
        ${CAMPOS_PEDIDO},
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', d.id_producto,
                'id_producto', d.id_producto,
                'codigo', d.codigo,
                'nombre', d.nombre,
                'cantidad', d.cantidad,
                'precio', d.precio_unitario,
                'precio_unitario', d.precio_unitario,
                'subtotal', d.subtotal
              )
              ORDER BY d.id_detalle
            )
            FROM detalle_pedido d
            WHERE d.id_pedido = p.id_pedido
          ),
          '[]'::json
        ) AS items
      FROM pedidos p
      WHERE p.id_pedido = $1
        AND (
          $2::bigint IS NULL
          OR p.id_usuario = $2::bigint
        )
    `,
    [id, idUsuario]
  );

  return normalizarPedido(resultado.rows[0]);
}

async function bloquearProductos(cliente, ids) {
  const resultado = await cliente.query(
    `
      SELECT
        id_producto,
        codigo,
        nombre,
        stock,
        precio,
        en_oferta,
        descuento,
        activo
      FROM productos
      WHERE id_producto = ANY($1::integer[])
      ORDER BY id_producto
      FOR UPDATE
    `,
    [ids]
  );

  return resultado.rows;
}

async function crearPedido(cliente, idUsuario, datos, total) {
  const resultado = await cliente.query(
    `
      INSERT INTO pedidos (
        id_usuario,
        nombre,
        email,
        telefono,
        entrega,
        direccion,
        total
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id_pedido
    `,
    [
      idUsuario,
      datos.nombre,
      datos.email,
      datos.telefono,
      datos.entrega,
      datos.direccion,
      total
    ]
  );

  return resultado.rows[0].id_pedido;
}

async function crearDetalle(cliente, idPedido, item) {
  await cliente.query(
    `
      INSERT INTO detalle_pedido (
        id_pedido,
        id_producto,
        codigo,
        nombre,
        cantidad,
        precio_unitario
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      idPedido,
      item.id_producto,
      item.codigo,
      item.nombre,
      item.cantidad,
      item.precio_unitario
    ]
  );
}

async function modificarStock(cliente, idProducto, diferencia) {
  const resultado = await cliente.query(
    `
      UPDATE productos
      SET
        stock = (stock::bigint + $2::bigint)::integer,
        fecha_actualizacion = NOW()
      WHERE id_producto = $1
        AND (stock::bigint + $2::bigint)
          BETWEEN 0 AND 2147483647
      RETURNING stock
    `,
    [idProducto, diferencia]
  );

  return resultado.rows[0] || null;
}

async function bloquearPedido(cliente, idPedido) {
  const resultado = await cliente.query(
    `
      SELECT ${CAMPOS_PEDIDO}
      FROM pedidos p
      WHERE p.id_pedido = $1
      FOR UPDATE
    `,
    [idPedido]
  );

  return normalizarPedido(resultado.rows[0]);
}

async function listarDetalles(cliente, idPedido) {
  const resultado = await cliente.query(
    `
      SELECT
        id_producto,
        codigo,
        nombre,
        cantidad,
        precio_unitario
      FROM detalle_pedido
      WHERE id_pedido = $1
      ORDER BY id_producto
    `,
    [idPedido]
  );

  return resultado.rows;
}

async function actualizarEstado(cliente, idPedido, estado) {
  const resultado = await cliente.query(
    `
      UPDATE pedidos
      SET
        estado = $2,
        fecha_actualizacion = NOW()
      WHERE id_pedido = $1
      RETURNING id_pedido
    `,
    [idPedido, estado]
  );

  return resultado.rowCount > 0;
}

module.exports = {
  listar,
  obtener,
  bloquearProductos,
  crearPedido,
  crearDetalle,
  modificarStock,
  bloquearPedido,
  listarDetalles,
  actualizarEstado
};
