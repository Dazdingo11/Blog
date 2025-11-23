const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const db = require('../../db/models');
const { success } = require('../../utils/response');
const { Op } = require('sequelize');

// Name/email search endpoint used for kicking off DMs.
router.get('/users/search', auth, async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const q = (req.query.q || '').toString().trim();

    if (!q) {
      return success(res, { items: [] });
    }

    const items = await db.User.findAll({
      where: {
        id: { [Op.ne]: currentUserId },
        [Op.or]: [
          { name: { [Op.like]: `%${q}%` } },
          { email: { [Op.like]: `%${q}%` } },
        ],
      },
      attributes: ['id', 'name', 'email'],
      limit: 20,
      order: [['name', 'ASC']],
    });

    return success(res, { items });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
