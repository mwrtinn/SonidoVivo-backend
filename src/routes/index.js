
const { Router } = require('express');

const authRoutes = require('./auth.routes');
const usuariosRoutes = require('./usuarios.routes');
const productosRoutes = require('./productos.routes');

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({ estado: 'ok' });
});

router.use('/auth', authRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/productos', productosRoutes);

module.exports = router;
