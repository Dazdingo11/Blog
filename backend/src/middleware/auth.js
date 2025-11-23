const { verifyAccess } = require('../utils/jwt');
const { error } = require('../utils/response');

module.exports = function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    return error(res, 401, 'NO_TOKEN', 'Missing access token');
  }

  try {
    const payload = verifyAccess(token);
    req.user = { id: payload.sub, email: payload.email, name: payload.name };
    next();
  } catch (e) {
    return error(res, 401, 'BAD_TOKEN', 'Invalid or expired token');
  }
};
