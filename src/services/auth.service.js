const argon2 = require('argon2');
const repo = require('../repositories/usuarios.repository');
const AppError = require('../utils/AppError');

exports.registrar = async ({ nombre, email, password }) => {
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  try {
    // El rol lo decide el servidor: todo registro público es Cliente
    return await repo.crear({ nombre, email, passwordHash, rol: 'Cliente' });
  } catch (err) {
    if (err.code === '23505') throw new AppError(409, 'El email ya está registrado');
    throw err;
  }
};