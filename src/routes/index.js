const { Router } = require('express');

const router = Router();

router.get('/health', (req, res) => res.status(200).json({ estado: 'ok' }));

module.exports = router;