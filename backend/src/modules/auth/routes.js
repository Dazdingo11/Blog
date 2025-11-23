const { Router } = require("express");
const rateLimit = require("express-rate-limit");
const ctrl = require("./controller");

const router = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });

router.post("/register", limiter, ctrl.register);
router.post("/login",    limiter, ctrl.login);
router.post("/refresh",  limiter, ctrl.refresh);
router.post("/logout",   limiter, ctrl.logout);

module.exports = router;
