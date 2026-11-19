const pool = require('../db/pool');

const SELECT = `SELECT u.id_usuario, u.nombre, u.email, r.nombre AS rol, u.activo, u.fecha_registro
                FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol`;

exports.buscarPorId = async (id) => {
  const { rows } = await pool.query(`${SELECT} WHERE u.id_usuario = $1`, [id]);
  return rows[0] || null;
};

exports.crear = async ({ nombre, email, passwordHash, rol }) => {
  const { rows } = await pool.query(
    `INSERT INTO usuarios (nombre, email, password_hash, id_rol)
     VALUES ($1, $2, $3, (SELECT id_rol FROM roles WHERE nombre = $4))
     RETURNING id_usuario`,
    [nombre, email, passwordHash, rol]
  );
  return exports.buscarPorId(rows[0].id_usuario);
};