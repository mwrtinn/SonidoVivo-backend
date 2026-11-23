const fs = require('fs');
const path = require('path');
const { Router } = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');

const especificacion = YAML.parse(
  fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'openapi.yaml'), 'utf8')
);

const router = Router();

router.get('/openapi.json', (req, res) => res.status(200).json(especificacion));

router.use(
  '/',
  swaggerUi.serve,
  swaggerUi.setup(especificacion, { customSiteTitle: 'API Sonido Vivo · Documentación' })
);

module.exports = router;
