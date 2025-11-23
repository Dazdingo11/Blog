const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const db = require('../../db/models');
const { success, error } = require('../../utils/response');
const { Op } = require('sequelize');
const { markConversationRead } = require('./read');

// List conversations with the latest message and the other participant.
router.get('/conversations', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const rows = await db.Conversation.findAll({
      include: [
        {
          model: db.ConversationParticipant,
          as: 'conversation_participants',
          where: { user_id: userId, hidden: false },
          attributes: [],
        },
        {
          model: db.User,
          as: 'participants',
          attributes: ['id', 'name'],
          include: [
            {
              model: db.Profile,
              as: 'profile',
              attributes: ['avatar_url'],
              required: false,
            },
          ],
          through: { attributes: ['last_read_message_id', 'hidden', 'hidden_since_message_id'] },
        },
        {
          model: db.Message,
          as: 'messages',
          separate: true,
          limit: 1,
          order: [['created_at', 'DESC']],
          include: [{ model: db.User, as: 'sender', attributes: ['id', 'name'] }],
        },
      ],
      order: [['updated_at', 'DESC']],
    });

    const raw = (
      await Promise.all(
        rows.map(async (c) => {
          const json = c.toJSON();
          const lastMessage = json.messages && json.messages[0] ? json.messages[0] : null;
          const participants = (json.participants || []).map((u) => ({
            id: u.id,
            name: u.name,
            avatarUrl: u.profile?.avatar_url || null,
          }));
          const others = participants.filter((u) => u.id !== userId);
          const participantRecord = (json.participants || []).find((u) => u.id === userId);
          const lastReadId =
            participantRecord?.ConversationParticipant?.last_read_message_id ??
            (lastMessage?.id ?? 0);
          const hiddenSinceId =
            participantRecord?.ConversationParticipant?.hidden_since_message_id || 0;
          const floorId = Math.max(Number(lastReadId) || 0, Number(hiddenSinceId) || 0);

          // Skip threads that only contain the current user.
          if (!others.length) {
            return null;
          }

          const unreadCount = await db.Message.count({
            where: {
              conversation_id: json.id,
              id: { [Op.gt]: floorId },
            },
          });

          return {
            id: json.id,
            participants,
            otherParticipant: others[0],
            lastMessage,
            updatedAt: json.updated_at,
            unreadCount,
          };
        })
      )
    ).filter(Boolean);

    // Keep only the newest thread per other user.
    const byUser = new Map();
    for (const convo of raw) {
      const otherId = convo.otherParticipant.id;
      const existing = byUser.get(otherId);
      if (!existing) {
        byUser.set(otherId, convo);
      } else {
        const prev = new Date(existing.updatedAt).getTime();
        const curr = new Date(convo.updatedAt).getTime();
        if (curr > prev) {
          byUser.set(otherId, convo);
        }
      }
    }

    const items = Array.from(byUser.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return success(res, { items });
  } catch (err) {
    next(err);
  }
});

// Create or reuse a one-to-one conversation between two users.
router.post('/conversations', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { userId: otherUserIdRaw } = req.body || {};
    const otherUserId = Number(otherUserIdRaw);

    if (!otherUserId || otherUserId === userId) {
      return error(res, 400, 'CONVERSATION_BAD_TARGET', 'Invalid conversation target');
    }

    const other = await db.User.findByPk(otherUserId);
    if (!other) {
      return error(res, 404, 'CONVERSATION_USER_NOT_FOUND', 'Target user not found');
    }

    // Reuse an existing 1:1 if it already exists.
    const existingLinks = await db.ConversationParticipant.findAll({
      attributes: ['conversation_id'],
      where: { user_id: { [Op.in]: [userId, otherUserId] } },
      group: ['conversation_id'],
      having: db.Sequelize.literal('COUNT(DISTINCT user_id) = 2'),
      limit: 1,
    });

    let convo;
    if (existingLinks.length > 0) {
      convo = await db.Conversation.findByPk(existingLinks[0].conversation_id);
      // If either side hid the thread, unhide so they can resume.
      await db.ConversationParticipant.update(
        { hidden: false },
        { where: { conversation_id: convo.id, user_id: { [Op.in]: [userId, otherUserId] } } }
      );
    } else {
      convo = await db.Conversation.create({});
      await db.ConversationParticipant.bulkCreate([
        { conversation_id: convo.id, user_id: userId, last_read_message_id: 0, hidden: false },
        { conversation_id: convo.id, user_id: otherUserId, last_read_message_id: 0, hidden: false },
      ]);
    }

    return success(res, { item: { id: convo.id } });
  } catch (err) {
    next(err);
  }
});

// Paginated messages for a conversation (only if participant).
router.get('/conversations/:id/messages', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const convoId = req.params.id;
    const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
    const beforeId = req.query.beforeId ? Number(req.query.beforeId) : null;

    const participant = await db.ConversationParticipant.findOne({
      where: { conversation_id: convoId, user_id: userId, hidden: false },
    });
    if (!participant) {
      return error(res, 403, 'CONVERSATION_FORBIDDEN', 'You are not in this conversation');
    }

    const where = { conversation_id: convoId };
    if (beforeId) {
      where.id = { [Op.lt]: beforeId };
    }
    if (participant.hidden_since_message_id) {
      where.id = {
        ...(where.id || {}),
        [Op.gt]: participant.hidden_since_message_id,
      };
    }

    const rows = await db.Message.findAll({
      where,
      order: [['id', 'DESC']],
      limit,
      include: [
        {
          model: db.User,
          as: 'sender',
          attributes: ['id', 'name'],
          include: [{ model: db.Profile, as: 'profile', attributes: ['avatar_url'], required: false }],
        },
      ],
    });

    const itemsDesc = rows.map((m) => {
      const json = m.toJSON();
      return {
        id: json.id,
        conversationId: json.conversation_id,
        sender: {
          id: json.sender?.id,
          name: json.sender?.name,
          avatarUrl: json.sender?.profile?.avatar_url || null,
        },
        body: json.body,
        createdAt: json.created_at,
        readAt: json.read_at,
        isMine: json.sender_id === userId,
      };
    });

    // UI expects oldest first.
    const items = itemsDesc.slice().reverse();
    const hasMore = rows.length === limit;

    // Mark as read through the newest fetched message.
    if (items.length > 0) {
      const newestId = items[items.length - 1].id;
      await db.ConversationParticipant.update(
        { last_read_message_id: newestId },
        { where: { conversation_id: convoId, user_id: userId } }
      );
    }

    return success(res, { items, hasMore });
  } catch (err) {
    next(err);
  }
});

// Mark read up to a specific message (or latest).
router.post('/conversations/:id/read', auth, markConversationRead);

// Send a message to a conversation.
router.post('/conversations/:id/messages', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const convoId = req.params.id;
    const text = (req.body?.body || '').toString().trim();

    if (!text) {
      return error(res, 400, 'MESSAGE_BODY_REQUIRED', 'Message body required');
    }

    const participant = await db.ConversationParticipant.findOne({
      where: { conversation_id: convoId, user_id: userId, hidden: false },
    });
    if (!participant) {
      return error(res, 403, 'CONVERSATION_FORBIDDEN', 'You are not in this conversation');
    }

    const convo = await db.Conversation.findByPk(convoId);
    if (!convo) {
      return error(res, 404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
    }

    const message = await db.Message.create({
      conversation_id: convoId,
      sender_id: userId,
      body: text,
    });

    await convo.update({ updated_at: new Date() });

    const saved = await db.Message.findByPk(message.id, {
      include: [
        {
          model: db.User,
          as: 'sender',
          attributes: ['id', 'name'],
          include: [{ model: db.Profile, as: 'profile', attributes: ['avatar_url'], required: false }],
        },
      ],
    });
    const json = saved.toJSON();

    const payload = {
      id: json.id,
      conversationId: json.conversation_id,
      sender: {
        id: json.sender?.id,
        name: json.sender?.name,
        avatarUrl: json.sender?.profile?.avatar_url || null,
      },
      body: json.body,
      createdAt: json.created_at,
      readAt: json.read_at,
      isMine: true,
    };

    // Fan out the new message to every participant.
    try {
      const io = req.app.get('io');
      if (io) {
        const participants = await db.ConversationParticipant.findAll({
          where: { conversation_id: convoId },
          attributes: ['user_id', 'hidden'],
        });
        // Unhide any participants who previously hid the conversation so they get the new thread, but
        // keep their hidden_since_message_id to avoid resurrecting old history.
        await db.ConversationParticipant.update(
          { hidden: false },
          { where: { conversation_id: convoId, hidden: true } }
        );
        for (const p of participants) {
          io.to(`user:${p.user_id}`).emit('message:new', {
            conversationId: convoId,
            message: {
              ...payload,
              isMine: p.user_id === userId,
            },
          });
        }
        await db.ConversationParticipant.update(
          { last_read_message_id: message.id },
          { where: { conversation_id: convoId, user_id: userId } }
        );
      }
    } catch (emitErr) {
      console.error('Socket emit failed:', emitErr);
    }

    return success(res, { item: payload });
  } catch (err) {
    next(err);
  }
});

// Delete a conversation for all participants.
router.delete('/conversations/:id', auth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const convoId = req.params.id;
    const scopeRaw = (req.body?.scope || req.query.scope || 'all').toString().toLowerCase();
    const scope = scopeRaw === 'self' ? 'self' : 'all';

    const participant = await db.ConversationParticipant.findOne({
      where: { conversation_id: convoId, user_id: userId, hidden: false },
    });
    if (!participant) {
      return error(res, 403, 'CONVERSATION_FORBIDDEN', 'You are not in this conversation');
    }

    const convo = await db.Conversation.findByPk(convoId);
    if (!convo) {
      return error(res, 404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
    }

    if (scope === 'self') {
      // Soft-hide this participant's view of the conversation only.
      const latest = await db.Message.findOne({
        where: { conversation_id: convoId },
        order: [['id', 'DESC']],
        attributes: ['id'],
      });
      const latestId = latest?.id || 0;
      await participant.update({
        hidden: true,
        hidden_since_message_id: latestId,
        last_read_message_id: latestId,
      });

      try {
        const io = req.app.get('io');
        if (io) {
          io.to(`user:${userId}`).emit('conversation:deleted', {
            conversationId: Number(convoId),
            scope: 'self',
          });
        }
      } catch (emitErr) {
        console.error('Socket emit failed (conversation:deleted self):', emitErr);
      }

      return success(res, { ok: true, scope: 'self' });
    }

    // Delete for all participants. Clean up children explicitly to avoid FK issues.
    const participants = await db.ConversationParticipant.findAll({
      where: { conversation_id: convoId },
      attributes: ['user_id'],
    });

    await db.Message.destroy({ where: { conversation_id: convoId } });
    await db.ConversationParticipant.destroy({ where: { conversation_id: convoId } });
    await convo.destroy();

    try {
      const io = req.app.get('io');
      if (io) {
        for (const p of participants) {
          io.to(`user:${p.user_id}`).emit('conversation:deleted', {
            conversationId: Number(convoId),
            scope: 'all',
          });
        }
      }
    } catch (emitErr) {
      console.error('Socket emit failed (conversation:deleted):', emitErr);
    }

    return success(res, { ok: true, scope: 'all' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
