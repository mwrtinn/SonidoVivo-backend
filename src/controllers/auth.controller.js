const service = require('../services/auth.service');
const { registroDto, loginDto } = require('../dto/auth.dto');

exports.perfil = (req, res) => res.status(200).json(req.usuario);

exports.registrar = async (req, res) => {
  const datos = registroDto.parse(req.body);
  res.status(201).json(await service.registrar(datos));
};

exports.login = async (req, res) => {
  const datos = loginDto.parse(req.body);
  res.status(200).json(await service.login(datos));
};