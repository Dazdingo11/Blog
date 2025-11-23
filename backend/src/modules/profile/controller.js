const db = require('../../db/models');
const { success, error } = require('../../utils/response');
const { verifyAccess } = require('../../utils/jwt');

exports.getMe = async (req, res) => {
  try {
    const userId = req.user.id;
    // Create a minimal profile if the user never set one.
    let profile = await db.Profile.findOne({ where: { user_id: userId } });
    if (!profile) {
      profile = await db.Profile.create({ user_id: userId });
    }

    const user = await db.User.findByPk(userId, {
      attributes: ['id', 'email', 'name'],
    });

    const followersCount = await db.Follow.count({ where: { followee_user_id: userId } });
    const followingCount = await db.Follow.count({ where: { follower_user_id: userId } });
    const p = profile.toJSON();
    const profileData = {
      id: p.id,
      userId: p.user_id,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
      bio: p.bio,
      followersCount,
      followingCount,
    };
    return success(res, { item: { profile: profileData, user } });
  } catch (err) {
    console.error(err);
    return error(res, 500, 'PROFILE_GET_ME_FAILED', 'Could not load your profile');
  }
};

exports.updateMe = async (req, res) => {
  try {
    const userId = req.user.id;
    const { displayName, avatarUrl, bio } = req.body;
    const profile = await db.Profile.findOne({ where: { user_id: userId } });
    if (!profile) {
      return error(res, 404, 'PROFILE_NOT_FOUND', 'Profile not found');
    }

    const updateData = {};
    if (displayName !== undefined) updateData.display_name = displayName;
    if (avatarUrl !== undefined) updateData.avatar_url = avatarUrl;
    if (bio !== undefined) updateData.bio = bio;
    await profile.update(updateData);

    const p = profile.toJSON();
    const followersCount = await db.Follow.count({ where: { followee_user_id: userId } });
    const followingCount = await db.Follow.count({ where: { follower_user_id: userId } });
    const profileData = {
      id: p.id,
      userId: p.user_id,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
      bio: p.bio,
      followersCount,
      followingCount,
    };
    return success(res, { item: { profile: profileData } });
  } catch (err) {
    console.error(err);
    return error(res, 500, 'PROFILE_UPDATE_ME_FAILED', 'Could not update profile');
  }
};

// Avatar upload expects multipart/form-data with a `file` field.
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return error(res, 400, 'PROFILE_NO_FILE', 'No file uploaded');
    }

    const url = `/uploads/${req.file.filename}`;
    return success(res, { url });
  } catch (err) {
    console.error(err);
    return error(res, 500, 'PROFILE_UPLOAD_AVATAR_FAILED', 'Could not upload avatar');
  }
};

// Profile lookup by user ID, enriched with follower counts and follow state.
async function resolveTargetUserId(raw) {
  const numeric = Number(raw);
  if (!Number.isNaN(numeric) && numeric > 0) return numeric;
  const userByName = await db.User.findOne({ where: { name: raw }, attributes: ['id'] });
  return userByName ? userByName.id : null;
}

exports.getById = async (req, res) => {
  try {
    const targetId = await resolveTargetUserId(req.params.id);
    if (!targetId) {
      return error(res, 404, 'PROFILE_NOT_FOUND', 'Profile not found');
    }

    const profile = await db.Profile.findOne({ where: { user_id: targetId } });
    if (!profile) {
      return error(res, 404, 'PROFILE_NOT_FOUND', 'Profile not found');
    }
    const user = await db.User.findByPk(targetId, { attributes: ['id', 'name'] });
    const followersCount = await db.Follow.count({ where: { followee_user_id: targetId } });
    const followingCount = await db.Follow.count({ where: { follower_user_id: targetId } });

    let isFollowing = false;

    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (token) {
        const { verifyAccess } = require('../../utils/jwt');
        const payload = verifyAccess(token);
        const currentUserId = payload.sub;
        if (currentUserId) {
          const follow = await db.Follow.findOne({
            where: { follower_user_id: currentUserId, followee_user_id: targetId },
          });
          isFollowing = !!follow;
        }
      }
    } catch (e) {
      // Ignore token parsing failures; treat as unauthenticated.
    }
    const p = profile.toJSON();
    const profileData = {
      id: p.id,
      userId: p.user_id,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
      bio: p.bio,
      followersCount,
      followingCount,
      isFollowing,
    };
    return success(res, { item: { profile: profileData, user } });
  } catch (err) {
    console.error(err);
    return error(res, 500, 'PROFILE_GET_BY_ID_FAILED', 'Could not load profile');
  }
};

async function resolveCurrentUserId(req) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;
    const payload = verifyAccess(token);
    return payload.sub || null;
  } catch (err) {
    return null;
  }
}

// List followers of a user.
exports.listFollowers = async (req, res) => {
  try {
    const targetId = await resolveTargetUserId(req.params.id);
    if (!targetId) {
      return error(res, 400, 'PROFILE_BAD_ID', 'Invalid target');
    }

    const currentUserId = await resolveCurrentUserId(req);
    const rows = await db.Follow.findAll({
      where: { followee_user_id: targetId },
      include: [
        {
          model: db.User,
          as: 'follower',
          attributes: ['id', 'name'],
          include: [{ model: db.Profile, as: 'profile', attributes: ['avatar_url'], required: false }],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    let followingMap = new Set();
    if (currentUserId) {
      const follows = await db.Follow.findAll({
        attributes: ['followee_user_id'],
        where: { follower_user_id: currentUserId },
      });
      followingMap = new Set(follows.map((f) => Number(f.followee_user_id)));
    }

    const items = rows
      .map((row) => {
        const f = row.toJSON();
        if (!f.follower) return null;
        return {
          id: f.follower.id,
          name: f.follower.name,
          avatarUrl: f.follower.profile?.avatar_url || null,
          isFollowing: currentUserId ? followingMap.has(Number(f.follower.id)) : false,
        };
      })
      .filter(Boolean);

    return success(res, { items });
  } catch (err) {
    console.error(err);
    return error(res, 500, 'PROFILE_LIST_FOLLOWERS_FAILED', 'Could not load followers');
  }
};

// List accounts the user is following.
exports.listFollowing = async (req, res) => {
  try {
    const targetId = await resolveTargetUserId(req.params.id);
    if (!targetId) {
      return error(res, 400, 'PROFILE_BAD_ID', 'Invalid target');
    }

    const currentUserId = await resolveCurrentUserId(req);
    const rows = await db.Follow.findAll({
      where: { follower_user_id: targetId },
      include: [
        {
          model: db.User,
          as: 'followee',
          attributes: ['id', 'name'],
          include: [{ model: db.Profile, as: 'profile', attributes: ['avatar_url'], required: false }],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    let followingMap = new Set();
    if (currentUserId) {
      const follows = await db.Follow.findAll({
        attributes: ['followee_user_id'],
        where: { follower_user_id: currentUserId },
      });
      followingMap = new Set(follows.map((f) => Number(f.followee_user_id)));
    }

    const items = rows
      .map((row) => {
        const f = row.toJSON();
        if (!f.followee) return null;
        return {
          id: f.followee.id,
          name: f.followee.name,
          avatarUrl: f.followee.profile?.avatar_url || null,
          isFollowing: currentUserId ? followingMap.has(Number(f.followee.id)) : false,
        };
      })
      .filter(Boolean);

    return success(res, { items });
  } catch (err) {
    console.error(err);
    return error(res, 500, 'PROFILE_LIST_FOLLOWING_FAILED', 'Could not load following');
  }
};

// Follow another user.
exports.followUser = async (req, res) => {
  try {
    const followerId = req.user.id;
    const followeeId = await resolveTargetUserId(req.params.id);
    if (!followeeId) {
      return error(res, 404, 'PROFILE_NOT_FOUND', 'Profile not found');
    }
    if (String(followerId) === String(followeeId)) {
      return error(res, 400, 'PROFILE_FOLLOW_SELF', 'You cannot follow yourself');
    }
    await db.Follow.findOrCreate({
      where: { follower_user_id: followerId, followee_user_id: followeeId },
      defaults: { created_at: new Date() },
    });
    return success(res, { ok: true });
  } catch (err) {
    console.error(err);
    return error(res, 500, 'PROFILE_FOLLOW_FAILED', 'Could not follow user');
  }
};

// Unfollow another user.
exports.unfollowUser = async (req, res) => {
  try {
    const followerId = req.user.id;
    const followeeId = await resolveTargetUserId(req.params.id);
    if (!followeeId) {
      return error(res, 404, 'PROFILE_NOT_FOUND', 'Profile not found');
    }
    await db.Follow.destroy({ where: { follower_user_id: followerId, followee_user_id: followeeId } });
    return success(res, { ok: true });
  } catch (err) {
    console.error(err);
    return error(res, 500, 'PROFILE_UNFOLLOW_FAILED', 'Could not unfollow user');
  }
};
