const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const repo = require('../repositories/usuarios.repository');
const AppError = require('../utils/AppError');

const ISSUER = 'sonidovivo-api';
const AUDIENCE = 'sonidovivo-web';
const vigencia = () => process.env.JWT_EXPIRES_IN || '1h';
// Hash ficticio: se verifica aunque el usuario no exista, para no delatar qué emails están registrados
const hashFicticio = argon2.hash('contrasena-ficticia', { type: argon2.argon2id });

exports.registrar = async ({ nombre, email, password }) => {
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  try {
    return await repo.crear({ nombre, email, passwordHash, rol: 'Cliente' });
  } catch (err) {
    if (err.code === '23505') throw new AppError(409, 'El email ya está registrado');
    throw err;
  }
};

exports.login = async ({ email, password }) => {
  const cred = await repo.buscarCredencialesPorEmail(email);
  const coincide = await argon2.verify(cred ? cred.password_hash : await hashFicticio, password);
  if (!cred || !coincide || !cred.activo) throw new AppError(401, 'Credenciales inválidas');
  const usuario = await repo.buscarPorId(cred.id_usuario);
  const accessToken = jwt.sign({ rol: usuario.rol }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    subject: String(usuario.id_usuario),
    issuer: ISSUER,
    audience: AUDIENCE,
    expiresIn: vigencia()
  });
  return { accessToken, tokenType: 'Bearer', expiresIn: vigencia() };
};

exports.verificarToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE });