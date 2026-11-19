require('dotenv').config();

// Se valida el secreto ANTES de abrir el puerto
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('Falta JWT_SECRET (mínimo 32 caracteres) en el .env');
  process.exit(1);
}

const app = require('./src/app');

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API escuchando en el puerto ${PORT}`);
});