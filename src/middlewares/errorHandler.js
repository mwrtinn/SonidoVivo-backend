const { ZodError } = require('zod');

module.exports = (err, req, res, next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      mensaje: 'Datos inválidos',
      detalles: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
    });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ mensaje: 'JSON mal formado', detalles: [] });
  }
  if (err.status) {
    return res.status(err.status).json({ mensaje: err.message, detalles: err.detalles || [] });
  }
  console.error(err.message);
  res.status(500).json({ mensaje: 'Error interno del servidor', detalles: [] });
};