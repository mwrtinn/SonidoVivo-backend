
require('dotenv').config();

const pool = require('../src/db/pool');
const productos = require('./productos.json');

async function migrarProductos() {
  let cliente;

  try {
    if (!Array.isArray(productos) || productos.length !== 51) {
      throw new Error('Se esperaban 51 productos en el JSON.');
    }

    cliente = await pool.connect();

    await cliente.query('BEGIN');

    let insertados = 0;

    for (const producto of productos) {
      const resultado = await cliente.query(
        `
        INSERT INTO productos (
          id_producto,
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
        OVERRIDING SYSTEM VALUE
        VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12, $13
        )
        ON CONFLICT (codigo) DO NOTHING
        `,
        [
          producto.id,
          producto.codigo,
          producto.categoria,
          producto.nombre,
          producto.marca || null,
          producto.modelo || null,
          producto.stock,
          producto.precio,
          producto.descripcion || null,
          producto.imagen || null,
          producto.enOferta || false,
          producto.descuento || 0,
          true
        ]
      );

      insertados += resultado.rowCount;

      console.log(
        `${resultado.rowCount ? 'Insertado' : 'Ya existe'}: ` +
        `${producto.codigo} - ${producto.nombre}`
      );
    }

    await cliente.query(`
      SELECT setval(
        pg_get_serial_sequence('productos', 'id_producto'),
        (SELECT MAX(id_producto) FROM productos),
        true
      )
    `);

    await cliente.query('COMMIT');

    const resultado = await cliente.query(
      'SELECT COUNT(*) AS total FROM productos'
    );

    console.log('\n==============================');
    console.log('MIGRACION COMPLETADA');
    console.log('Productos en JSON:', productos.length);
    console.log('Productos insertados:', insertados);
    console.log('Productos en BD:', resultado.rows[0].total);
    console.log('==============================');

  } catch (error) {
    if (cliente) {
      await cliente.query('ROLLBACK');
    }

    console.error('Error en la migracion:', error.message);
    process.exitCode = 1;

  } finally {
    if (cliente) cliente.release();
    await pool.end();
  }
}

migrarProductos();
