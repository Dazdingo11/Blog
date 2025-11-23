const db = require('../../db/models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyAccess } = require('../../utils/jwt');
const { Op } = require('sequelize');
const { success, error } = require('../../utils/response');

// Create uploads directory if needed.
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer setup for single image uploads.
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
exports.upload = multer({
  storage,
  fileFilter: (_, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Invalid file type'), false);
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
}).single('image');

/**
 * List posts with optional search and pagination.
 * Supports ?limit=, ?offset=, ?q=keyword and ?owner=me|<userId>.
 * If owner=me, it requires a valid Bearer token to determine the requesting user.
 */
exports.list = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = parseInt(req.query.offset) || 0;
    const q = req.query.q ? String(req.query.q).trim() : null;
    const owner = req.query.owner;

    // Softly attempt to identify the caller from the Authorization header.
    let userId = null;
    const authHeader = req.headers.authorization || '';
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) {
      try {
        const payload = verifyAccess(token);
        userId = payload.sub;
      } catch (_) {
        /* ignore invalid token */
      }
    }

    const where = {};
    if (q) {
      where[Op.or] = [
        { title: { [Op.like]: `%${q}%` } },
        { content: { [Op.like]: `%${q}%` } },
      ];
    }
    if (owner) {
      if (owner === 'me') {
        if (!userId) {
          return error(res, 401, 'POSTS_UNAUTHORIZED', 'Unauthorized');
        }
        where.user_id = userId;
      } else {
        const resolvedOwner = Number(owner);
        if (!Number.isNaN(resolvedOwner)) {
          where.user_id = resolvedOwner;
        } else {
          const u = await db.User.findOne({ where: { name: owner }, attributes: ['id'] });
          where.user_id = u ? u.id : 0; // no match returns empty set
        }
      }
    }

    const posts = await db.Post.findAll({
      where,
      include: [
        {
          model: db.User,
          as: 'author',
          attributes: ['id', 'name'],
          include: [
            { model: db.Profile, as: 'profile', attributes: ['avatar_url'], required: false },
          ],
        },
      ],
      attributes: {
        include: [
          [db.Sequelize.literal('(SELECT COUNT(*) FROM post_likes WHERE post_id = Post.id)'), 'likeCount'],
          [db.Sequelize.literal('(SELECT COUNT(*) FROM comments WHERE post_id = Post.id)'), 'commentCount'],
        ],
      },
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    // Determine which of these posts are liked by the current user, if any.
    let likedIds = new Set();
    if (userId && posts.length > 0) {
      try {
        // Fetch liked post IDs for this batch only.
        const likedRows = await db.PostLike.findAll({
          attributes: ['post_id'],
          where: { user_id: userId, post_id: posts.map((p) => p.id) },
        });
        likedIds = new Set(likedRows.map((row) => row.post_id));
      } catch (e) {
        console.error('Failed to determine liked posts', e);
      }
    }

    const items = posts.map((p) => {
      const data = p.toJSON();
      // Normalize author to `user` for the frontend.
      if (data.author) {
        data.user = {
          id: data.author.id,
          name: data.author.name,
          avatarUrl: data.author.profile?.avatar_url || null,
        };
      }
      // Flag if this post belongs to the current user.
      if (userId) data.mine = String(data.user_id) === String(userId);
      // Flag if this post is liked by the current user.
      if (userId) data.likedByMe = likedIds.has(data.id);
      return data;
    });
    return success(res, { items });
  } catch (err) {
    console.error(err);
    return error(res, 500, 'POSTS_LIST_FAILED', 'Could not load posts');
  }
};

/**
 * Retrieve a post by its slug or id.  Our model does not define a slug column,
 * so we treat the slug parameter as the primary key.  Includes author and counts.
 */
async function findPostByIdOrSlug(idOrSlug, userId) {
  const post = await db.Post.findOne({
    where: { id: idOrSlug },
    include: [
      {
        model: db.User,
        as: 'author',
        attributes: ['id', 'name'],
        include: [
          { model: db.Profile, as: 'profile', attributes: ['avatar_url'], required: false },
        ],
      },
    ],
    attributes: {
      include: [
        [db.Sequelize.literal('(SELECT COUNT(*) FROM post_likes WHERE post_id = Post.id)'), 'likeCount'],
        [db.Sequelize.literal('(SELECT COUNT(*) FROM comments WHERE post_id = Post.id)'), 'commentCount'],
      ],
    },
  });
  if (!post) return null;
  const data = post.toJSON();
  // Normalize author to `user` for the frontend.
  if (data.author) {
    data.user = {
      id: data.author.id,
      name: data.author.name,
      avatarUrl: data.author.profile?.avatar_url || null,
    };
  }
  if (userId) data.mine = String(data.user_id) === String(userId);
  // Determine if this specific post is liked by the current user.
  if (userId) {
    try {
      const like = await db.PostLike.findOne({
        where: { user_id: userId, post_id: data.id },
      });
      data.likedByMe = !!like;
    } catch (e) {
      console.error('Error checking liked status', e);
      data.likedByMe = false;
    }
  }
  return data;
}

exports.getById = async (req, res) => {
  try {
    const id = req.params.id;
    const authHeader = req.headers.authorization || '';
    let userId = null;
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) {
      try {
        const payload = verifyAccess(token);
        userId = payload.sub;
      } catch (_) {}
    }
    const post = await findPostByIdOrSlug(id, userId);
    if (!post) {
      return error(res, 404, 'POST_NOT_FOUND', 'Post not found');
    }
    return success(res, { item: post });
  } catch (err) {
    console.error(err);
    return error(res, 500, 'POST_GET_BY_ID_FAILED', 'Could not load post');
  }
};

exports.getBySlug = async (req, res) => {
  try {
    const slug = req.params.slug;
    const authHeader = req.headers.authorization || '';
    let userId = null;
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) {
      try {
        const payload = verifyAccess(token);
        userId = payload.sub;
      } catch (_) {}
    }
    const post = await findPostByIdOrSlug(slug, userId);
    if (!post) {
      return error(res, 404, 'POST_NOT_FOUND', 'Post not found');
    }
    return success(res, { item: post });
  } catch (err) {
    console.error(err);
    return error(res, 500, 'POST_GET_BY_SLUG_FAILED', 'Could not load post');
  }
};

/**
 * Create a new post.  Requires authentication via requireAuth middleware.
 * Accepts title, body (content) and optional image file.  Validates required fields.
 */
exports.create = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const { title, body } = req.body;
    if (!title || !body) {
      return error(res, 400, 'POST_CREATE_VALIDATION', 'Title and body are required');
    }
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    const excerpt = body.substring(0, 120);
    const post = await db.Post.create({
      user_id: userId,
      title,
      excerpt,
      content: body,
      image_url,
      published: true,
    });

    // Include mine flag on creation.
    const data = post.toJSON();
    data.mine = true;

    // Provide a `user` object to match list/get shape.
    if (req.user) {
      data.user = { id: req.user.id, name: req.user.name };
    }
    return success(res, { item: data });
  } catch (err) {
    console.error(err);
    return error(res, 500, 'POST_CREATE_FAILED', 'Could not create post');
  }
};

/**
 * Update an existing post.  Must be owner via requireOwner middleware.
 * Supports updating title, body and image.  Body maps to content and excerpt.
 */
exports.update = async (req, res) => {
  try {
    // requireOwner middleware attaches the resource on req.resource.
    const post = req.resource || (await db.Post.findByPk(req.params.id));
    if (!post) {
      return error(res, 404, 'POST_NOT_FOUND', 'Post not found');
    }
    // Only the owner can modify.
    if (post.user_id !== req.user.id) {
      return error(res, 403, 'POST_FORBIDDEN', 'You cannot edit this post');
    }
    const { title, body } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (body !== undefined) {
      updateData.content = body;
      updateData.excerpt = body.substring(0, 120);
    }
    if (req.file) {
      updateData.image_url = `/uploads/${req.file.filename}`;
    }
    if (Object.keys(updateData).length === 0) {
      return error(res, 400, 'POST_UPDATE_EMPTY', 'No changes provided');
    }
    await post.update(updateData);
    const data = post.toJSON();
    data.mine = true;

    // Provide a `user` object to match list/get shape.
    if (req.user) {
      data.user = { id: req.user.id, name: req.user.name };
    }
    return success(res, { item: data });
  } catch (err) {
    console.error(err);
    return error(res, 500, 'POST_UPDATE_FAILED', 'Could not update post');
  }
};

/**
 * Remove a post.  Must be owner via requireOwner middleware.
 */
exports.remove = async (req, res) => {
  try {
    const post = req.resource || (await db.Post.findByPk(req.params.id));
    if (!post) {
      return error(res, 404, 'POST_NOT_FOUND', 'Post not found');
    }
    if (post.user_id !== req.user.id) {
      return error(res, 403, 'POST_FORBIDDEN', 'Forbidden');
    }
    await post.destroy();
    return success(res, { ok: true });
  } catch (err) {
    console.error(err);
    return error(res, 500, 'POST_DELETE_FAILED', 'Could not delete post');
  }
};
