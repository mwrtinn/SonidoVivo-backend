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

exports.buscarCredencialesPorEmail = async (email) => {
  const { rows } = await pool.query(
    'SELECT id_usuario, password_hash, activo FROM usuarios WHERE email = $1',
    [email]
  );
  return rows[0] || null;
};

// Escapa los comodines de LIKE para que el texto buscado se trate como texto literal
const escaparLike = (texto) => texto.replace(/[\\%_]/g, '\\$&');

// Filtros opcionales: rol, activo y buscar (nombre o email). Todos los valores van parametrizados.
exports.listar = async ({ rol, activo, buscar } = {}) => {
  const condiciones = [];
  const valores = [];
  if (rol !== undefined) {
    valores.push(rol);
    condiciones.push(`r.nombre = $${valores.length}`);
  }
  if (activo !== undefined) {
    valores.push(activo);
    condiciones.push(`u.activo = $${valores.length}`);
  }
  if (buscar !== undefined) {
    valores.push(`%${escaparLike(buscar)}%`);
    condiciones.push(`(u.nombre ILIKE $${valores.length} OR u.email ILIKE $${valores.length})`);
  }
  const where = condiciones.length ? ` WHERE ${condiciones.join(' AND ')}` : '';
  const { rows } = await pool.query(`${SELECT}${where} ORDER BY u.id_usuario`, valores);
  return rows;
};

exports.actualizar = async (id, { nombre, rol, activo }) => {
  const { rowCount } = await pool.query(
    `UPDATE usuarios SET nombre = COALESCE($2, nombre), activo = COALESCE($3, activo),
       id_rol = COALESCE((SELECT id_rol FROM roles WHERE nombre = $4), id_rol)
     WHERE id_usuario = $1`,
    [id, nombre ?? null, activo ?? null, rol ?? null]
  );
  return rowCount ? exports.buscarPorId(id) : null;
};