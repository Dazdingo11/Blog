const jwt = require('jsonwebtoken');
const { jwt: cfg } = require('../config/env');

const signAccess = (payload) =>
  jwt.sign(payload, cfg.accessSecret, { expiresIn: cfg.accessTtl });

const signRefresh = (payload) =>
  jwt.sign(payload, cfg.refreshSecret, { expiresIn: cfg.refreshTtl });

const verifyAccess = (token) =>
  jwt.verify(token, cfg.accessSecret);

const verifyRefresh = (token) =>
  jwt.verify(token, cfg.refreshSecret);

module.exports = { signAccess, signRefresh, verifyAccess, verifyRefresh };
