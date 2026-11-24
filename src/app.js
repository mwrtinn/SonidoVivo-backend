const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes');
const docs = require('./docs/swagger');
const errorHandler = require('./middlewares/errorHandler');

const app = express();


app.use(helmet({
  contentSecurityPolicy: { directives: { 'upgrade-insecure-requests': null } }
}));
const origenesPermitidos = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origen => origen.trim())
  .filter(Boolean);

app.use(cors({
  origin: origenesPermitidos
}));
app.use(express.json());

app.use('/api/v1/docs', docs);
app.use('/api/v1', routes);

app.use((req, res) => res.status(404).json({ mensaje: 'Ruta no encontrada' }));
app.use(errorHandler);

module.exports = app;

