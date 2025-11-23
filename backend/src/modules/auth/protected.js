const { Router } = require('express');
const requireAuth = require('../../middleware/auth');
const router = Router();

router.get('/', requireAuth, (req, res) => {
  res.json({
    message: `Hello ${req.user.name}, your token works!`,
    user: req.user,
  });
});

module.exports = router;
