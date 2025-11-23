const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const db = require('../../db/models');
const { success, error } = require('../../utils/response');
const { verifyAccess } = require('../../utils/jwt');

function getCurrentUserId(req) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;
    const payload = verifyAccess(token);
    return payload.sub || null;
  } catch (e) {
    return null;
  }
}

router.get('/posts/:id/comments', async (req, res, next) => {
  try {
    const { id } = req.params;
    const rows = await db.Comment.findAll({
      where: { post_id: id },
      include: [
        {
          model: db.User,
          as: 'author',
          attributes: ['id', 'name', 'email'],
          include: [
            { model: db.Profile, as: 'profile', attributes: ['avatar_url'], required: false },
          ],
        },
      ],
      order: [['created_at', 'ASC']],
    });
    const commentIds = rows.map((r) => r.id);
    const currentUserId = getCurrentUserId(req);
    let likeCounts = {};
    let likedByUser = new Set();
    if (commentIds.length > 0) {
      const counts = await db.CommentLike.findAll({
        attributes: [
          'comment_id',
          [db.Sequelize.fn('COUNT', db.Sequelize.col('comment_id')), 'cnt'],
        ],
        where: { comment_id: commentIds },
        group: ['comment_id'],
      });
      likeCounts = counts.reduce((acc, row) => {
        acc[row.comment_id] = Number(row.dataValues.cnt || 0);
        return acc;
      }, {});

      if (currentUserId) {
        const liked = await db.CommentLike.findAll({
          attributes: ['comment_id'],
          where: { comment_id: commentIds, user_id: currentUserId },
        });
        likedByUser = new Set(liked.map((l) => Number(l.comment_id)));
      }
    }

    const items = rows.map((r) => {
      const data = r.toJSON();
      if (data.author) {
        data.user = {
          id: data.author.id,
          name: data.author.name,
          email: data.author.email,
          avatarUrl: data.author.profile?.avatar_url || null,
        };
        delete data.author;
      }
      data.likeCount = likeCounts[data.id] || 0;
      data.likedByMe = currentUserId ? likedByUser.has(Number(data.id)) : false;
      return data;
    });
    return success(res, { items });
  } catch (err) {
    next(err);
  }
});

router.post('/posts/:id/comments', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const bodyText = (req.body?.body || '').toString().trim();
    if (!bodyText) {
      return error(res, 400, 'COMMENT_BODY_REQUIRED', 'Comment body required');
    }

    // Make sure the target post exists.
    const post = await db.Post.findByPk(id);
    if (!post) {
      return error(res, 404, 'POST_NOT_FOUND', 'Post not found');
    }

    const created = await db.Comment.create({
      post_id: id,
      user_id: req.user.id,
      body: bodyText,
    });

    // Re-fetch with author so the payload carries a `user`.
    const saved = await db.Comment.findByPk(created.id, {
      include: [
        {
          model: db.User,
          as: 'author',
          attributes: ['id', 'name', 'email'],
          include: [
            { model: db.Profile, as: 'profile', attributes: ['avatar_url'], required: false },
          ],
        },
      ],
    });

    const json = saved.toJSON();
    const item = {
      ...json,
      user: {
        id: json.author?.id,
        name: json.author?.name,
        email: json.author?.email,
        avatarUrl: json.author?.profile?.avatar_url || null,
      },
      likeCount: 0,
      likedByMe: false,
    };
    delete item.author;

    return success(res, { item });
  } catch (e) {
    next(e);
  }
});

// Update a comment (owner only)
router.put('/comments/:commentId', auth, async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const bodyText = (req.body?.body || '').toString().trim();
    if (!bodyText) {
      return error(res, 400, 'COMMENT_BODY_REQUIRED', 'Comment body required');
    }

    const comment = await db.Comment.findByPk(commentId, {
      include: [{ model: db.Post, as: 'post' }],
    });
    if (!comment) {
      return error(res, 404, 'COMMENT_NOT_FOUND', 'Comment not found');
    }
    if (comment.user_id !== req.user.id) {
      return error(res, 403, 'COMMENT_FORBIDDEN', 'You cannot edit this comment');
    }

    await comment.update({ body: bodyText });

    const saved = await db.Comment.findByPk(commentId, {
      include: [
        {
          model: db.User,
          as: 'author',
          attributes: ['id', 'name', 'email'],
          include: [{ model: db.Profile, as: 'profile', attributes: ['avatar_url'], required: false }],
        },
      ],
    });
    const json = saved.toJSON();
    const item = {
      ...json,
      user: {
        id: json.author?.id,
        name: json.author?.name,
        email: json.author?.email,
        avatarUrl: json.author?.profile?.avatar_url || null,
      },
    };
    delete item.author;
    const likeCount = await db.CommentLike.count({ where: { comment_id: commentId } });
    item.likeCount = likeCount;
    item.likedByMe = true;

    return success(res, { item });
  } catch (err) {
    next(err);
  }
});

// Like a comment
router.post('/comments/:commentId/like', auth, async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;
    const comment = await db.Comment.findByPk(commentId, {
      include: [{ model: db.Post, as: 'post' }],
    });
    if (!comment) {
      return error(res, 404, 'COMMENT_NOT_FOUND', 'Comment not found');
    }
    await db.CommentLike.findOrCreate({
      where: { comment_id: commentId, user_id: userId },
      defaults: { created_at: new Date() },
    });
    const likeCount = await db.CommentLike.count({ where: { comment_id: commentId } });
    return success(res, { likeCount, liked: true });
  } catch (err) {
    next(err);
  }
});

// Unlike a comment
router.delete('/comments/:commentId/like', auth, async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;
    const comment = await db.Comment.findByPk(commentId);
    if (!comment) {
      return error(res, 404, 'COMMENT_NOT_FOUND', 'Comment not found');
    }
    await db.CommentLike.destroy({ where: { comment_id: commentId, user_id: userId } });
    const likeCount = await db.CommentLike.count({ where: { comment_id: commentId } });
    return success(res, { likeCount, liked: false });
  } catch (err) {
    next(err);
  }
});

router.delete('/comments/:commentId', auth, async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const comment = await db.Comment.findByPk(commentId);
    if (!comment) {
      return error(res, 404, 'COMMENT_NOT_FOUND', 'Comment not found');
    }

    let postOwnerId = null;
    if (comment.post_id) {
      const post = await db.Post.findByPk(comment.post_id, { attributes: ['user_id'] });
      postOwnerId = post?.user_id ?? null;
    }

    const isCommentOwner = comment.user_id === req.user.id;
    const isPostOwner = postOwnerId === req.user.id;
    if (!isCommentOwner && !isPostOwner) {
      return error(res, 403, 'COMMENT_FORBIDDEN', 'You cannot delete this comment');
    }

    // Remove likes first to satisfy FK constraints in environments without ON DELETE CASCADE.
    await db.CommentLike.destroy({ where: { comment_id: comment.id } });
    await comment.destroy();
    return success(res, { ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
