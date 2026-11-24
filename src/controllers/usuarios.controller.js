const repo = require('../repositories/usuarios.repository');
const AppError = require('../utils/AppError');
const authService = require('../services/auth.service');
const { actualizarUsuarioDto, listarUsuariosQueryDto, crearUsuarioDto } = require('../dto/usuarios.dto');

const MAX_ID = 2147483647; // límite del tipo integer de PostgreSQL

const leerId = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1 || id > MAX_ID) throw new AppError(400, 'Identificador inválido');
  return id;
};

const esAdministrador = (req) => req.usuario.rol === 'Administrador';

// Nadie consulta ni modifica la cuenta de otra persona cambiando el id de la URL
const exigirAdminOPropietario = (req, id) => {
  if (!esAdministrador(req) && id !== req.usuario.id_usuario) {
    throw new AppError(403, 'No tiene permisos para esta acción');
  }
};

// POST /usuarios (solo Administrador, se controla en la ruta): crea un usuario con el rol indicado
exports.crear = async (req, res) => {
  const { rol, ...datos } = crearUsuarioDto.parse(req.body);
  res.status(201).json(await authService.registrar(datos, rol));
};

// GET /usuarios?rol=&activo=&buscar= (solo Administrador, se controla en la ruta)
exports.listar = async (req, res) => {
  const filtros = listarUsuariosQueryDto.parse(req.query);
  res.status(200).json(await repo.listar(filtros));
};

// GET /usuarios/:id (el Administrador consulta a cualquiera; los demás, solo su propia cuenta)
exports.obtener = async (req, res) => {
  const id = leerId(req);
  exigirAdminOPropietario(req, id);
  const usuario = await repo.buscarPorId(id);
  if (!usuario) throw new AppError(404, 'Usuario no encontrado');
  res.status(200).json(usuario);
};

// PATCH /usuarios/:id
exports.modificar = async (req, res) => {
  const id = leerId(req);
  exigirAdminOPropietario(req, id);
  const datos = actualizarUsuarioDto.parse(req.body);
  // El rol y el estado solo los cambia el Administrador
  if (!esAdministrador(req) && (datos.rol !== undefined || datos.activo !== undefined)) {
    throw new AppError(403, 'Solo el Administrador puede cambiar el rol o el estado');
  }
  const esMismaCuenta = id === req.usuario.id_usuario;
  if (esMismaCuenta && datos.activo === false) {
    throw new AppError(409, 'No puede desactivar su propia cuenta');
  }
  // Evita que el sistema se quede sin Administrador por un cambio de rol propio
  if (esMismaCuenta && datos.rol !== undefined && datos.rol !== req.usuario.rol) {
    throw new AppError(409, 'No puede cambiar su propio rol');
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
