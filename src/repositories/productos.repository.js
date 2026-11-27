
const pool = require('../db/pool');

const CAMPOS = `
  id_producto AS id,
  codigo,
  categoria,
  nombre,
  marca,
  modelo,
  stock,
  precio,
  descripcion,
  imagen,
  en_oferta AS "enOferta",
  descuento,
  activo,
  fecha_creacion,
  fecha_actualizacion
`;

async function listar(incluirInactivos = false) {
  const resultado = await pool.query(`
    SELECT ${CAMPOS}
    FROM productos
    ${incluirInactivos ? '' : 'WHERE activo = true'}
    ORDER BY id_producto ASC
  `);

  return resultado.rows;
}

async function obtener(id) {
  const resultado = await pool.query(`
    SELECT ${CAMPOS}
    FROM productos
    WHERE id_producto = $1
      AND activo = true
  `, [id]);

  return resultado.rows[0] || null;
}

async function crear(datos) {
  const resultado = await pool.query(`
    INSERT INTO productos (
      codigo,
      categoria,
      nombre,
      marca,
      modelo,
      stock,
      precio,
      descripcion,
      imagen,
      en_oferta,
      descuento,
      activo
    )
    VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11, $12
    )
    RETURNING ${CAMPOS}
  `, [
    datos.codigo,
    datos.categoria,
    datos.nombre,
    datos.marca ?? null,
    datos.modelo ?? null,
    datos.stock ?? 0,
    datos.precio,
    datos.descripcion ?? null,
    datos.imagen ?? null,
    datos.enOferta ?? false,
    datos.descuento ?? 0,
    datos.activo ?? true
  ]);

  return resultado.rows[0];
}

async function modificar(id, datos) {
  const columnas = {
    codigo: 'codigo',
    categoria: 'categoria',
    nombre: 'nombre',
    marca: 'marca',
    modelo: 'modelo',
    stock: 'stock',
    precio: 'precio',
    descripcion: 'descripcion',
    imagen: 'imagen',
    enOferta: 'en_oferta',
    descuento: 'descuento',
    activo: 'activo'
  };

  const entradas = Object.entries(datos).filter(
    ([campo]) =>
      Object.prototype.hasOwnProperty.call(columnas, campo)
  );

  if (entradas.length === 0) {
    return null;
  }

  const asignaciones = entradas.map(
    ([campo], indice) =>
      `${columnas[campo]} = $${indice + 1}`
  );

  const valores = entradas.map(([, valor]) => valor);

  valores.push(id);

  const resultado = await pool.query(`
    UPDATE productos
    SET ${asignaciones.join(', ')},
        fecha_actualizacion = now()
    WHERE id_producto = $${valores.length}
    RETURNING ${CAMPOS}
  `, valores);

  return resultado.rows[0] || null;
}

async function desactivar(id) {
  const resultado = await pool.query(`
    UPDATE productos
    SET activo = false,
        fecha_actualizacion = now()
    WHERE id_producto = $1
    RETURNING id_producto
  `, [id]);

  return resultado.rowCount > 0;
}

module.exports = {
  listar,
  obtener,
  crear,
  modificar,
  desactivar
};
