const repo = require('../repositories/usuarios.repository');
const AppError = require('../utils/AppError');
const { actualizarUsuarioDto } = require('../dto/usuarios.dto');

const leerId = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new AppError(400, 'Identificador inválido');
  return id;
};

// GET /usuarios (solo Administrador, se controla en la ruta)
exports.listar = async (req, res) => res.status(200).json(await repo.listar());

// PATCH /usuarios/:id
exports.modificar = async (req, res) => {
  const id = leerId(req);
  const esAdmin = req.usuario.rol === 'Administrador';
  // Nadie modifica la cuenta de otra persona cambiando el id de la URL
  if (!esAdmin && id !== req.usuario.id_usuario) {
    throw new AppError(403, 'No tiene permisos para esta acción');
  }
  const datos = actualizarUsuarioDto.parse(req.body);
  // El rol y el estado solo los cambia el Administrador
  if (!esAdmin && (datos.rol !== undefined || datos.activo !== undefined)) {
    throw new AppError(403, 'Solo el Administrador puede cambiar el rol o el estado');
  }
  if (id === req.usuario.id_usuario && datos.activo === false) {
    throw new AppError(409, 'No puede desactivar su propia cuenta');
  }
  const actualizado = await repo.actualizar(id, datos);
  if (!actualizado) throw new AppError(404, 'Usuario no encontrado');
  res.status(200).json(actualizado);
};

// DELETE /usuarios/:id: desactiva la cuenta (borrado lógico, solo Administrador)
exports.desactivar = async (req, res) => {
  const id = leerId(req);
  if (id === req.usuario.id_usuario) throw new AppError(409, 'No puede desactivar su propia cuenta');
  const resultado = await repo.actualizar(id, { activo: false });
  if (!resultado) throw new AppError(404, 'Usuario no encontrado');
  res.status(204).send();
};