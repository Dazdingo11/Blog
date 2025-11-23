const { Router } = require('express');
const ctrl = require('./controller');
const requireAuth = require('../../middleware/auth');
const { requireOwner } = require('../../middleware/ownership');
const db = require('../../db/models');

const router = Router();

// Public reads; ctrl.list populates likedByMe based on the caller when possible.
router.get('/', ctrl.list);
router.get('/:slug', ctrl.getBySlug);
// Optional id-based read to avoid slug ambiguity across users.
router.get('/id/:id', ctrl.getById);

// Ownership helper.
const getPost = (req) => db.Post.findByPk(req.params.id);

// Writes (auth required).
router.post('/', requireAuth, ctrl.upload, ctrl.create);
router.put('/:id', requireAuth, requireOwner(getPost), ctrl.upload, ctrl.update);
router.delete('/:id', requireAuth, requireOwner(getPost), ctrl.remove);

module.exports = router;
