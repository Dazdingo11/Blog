function success(res, payload = {}) {
  return res.json({ ok: true, ...payload });
}

function created(res, payload = {}) {
  return res.status(201).json({ ok: true, ...payload });
}

function error(res, status, code, message) {
  return res.status(status).json({
    ok: false,
    error: { code, message },
  });
}

module.exports = { success, created, error };

