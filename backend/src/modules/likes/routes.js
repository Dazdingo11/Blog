const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const db = require('../../db/models');
const { success, error } = require('../../utils/response');

// Record a like for the current user.
router.post('/posts/:id/like', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.id;

    await db.PostLike.upsert({ user_id: userId, post_id: postId });

    const likeCount = await db.PostLike.count({ where: { post_id: postId } });
    return success(res, { likeCount, liked: true });
  } catch (err) {
    console.error(err);
    return error(res, 500, 'LIKE_FAILED', 'Could not like this post');
  }
});

// Remove the like for the current user.
router.delete('/posts/:id/like', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.id;

    await db.PostLike.destroy({ where: { user_id: userId, post_id: postId } });

    const likeCount = await db.PostLike.count({ where: { post_id: postId } });
    return success(res, { likeCount, liked: false });
  } catch (err) {
    console.error(err);
    return error(res, 500, 'UNLIKE_FAILED', 'Could not unlike this post');
  }
});

module.exports = router;
