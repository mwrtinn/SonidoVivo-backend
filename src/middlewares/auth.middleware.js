const repo = require('../repositories/usuarios.repository');
const { verificarToken } = require('../services/auth.service');
const AppError = require('../utils/AppError');

exports.autenticar = async (req, res, next) => {
  try {
    const [esquema, token] = (req.headers.authorization || '').split(' ');
    if (esquema !== 'Bearer' || !token) throw new AppError(401, 'Token ausente o inválido');
    let payload;
    try {
      payload = verificarToken(token);
    } catch {
      throw new AppError(401, 'Token inválido o vencido');
    }
    // Se consulta la base: el rol y el estado vigentes mandan, no los del token
    const usuario = await repo.buscarPorId(Number(payload.sub));
    if (!usuario || !usuario.activo) throw new AppError(401, 'Token inválido o vencido');
    req.usuario = usuario;
    next();
  } catch (err) {
    next(err);
  }
};

exports.autorizar = (...roles) => (req, res, next) =>
  roles.includes(req.usuario.rol)
    ? next()
    : next(new AppError(403, 'No tiene permisos para esta acción'));