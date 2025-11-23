module.exports.requireOwner = (getResourceByReq) => {
  return async (req, res, next) => {
    try {
      const resource = await getResourceByReq(req);
      if (!resource) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });

      const ownerId = resource.user_id ?? resource.userId ?? resource.owner_id;
      if (!ownerId || String(ownerId) !== String(req.user.id)) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not own this resource' } });
      }

      req.resource = resource;
      next();
    } catch (e) { next(e); }
  };
};
