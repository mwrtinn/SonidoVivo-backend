const service = require('../services/auth.service');
const { registroDto } = require('../dto/auth.dto');

exports.registrar = async (req, res) => {
  const datos = registroDto.parse(req.body);
  res.status(201).json(await service.registrar(datos));
};