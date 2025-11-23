const db = require('../../db/models');
const { success, error } = require('../../utils/response');

async function markConversationRead(req, res, next) {
  try {
    const userId = req.user.id;
    const convoId = req.params.id;
    const messageId = req.body?.messageId ? Number(req.body.messageId) : null;

    const participant = await db.ConversationParticipant.findOne({
      where: { conversation_id: convoId, user_id: userId, hidden: false },
    });
    if (!participant) {
      return error(res, 403, 'CONVERSATION_FORBIDDEN', 'You are not in this conversation');
    }

    let latestId = messageId;
    if (!latestId) {
      const latest = await db.Message.findOne({
        where: { conversation_id: convoId },
        order: [['id', 'DESC']],
        attributes: ['id'],
      });
      latestId = latest ? latest.id : null;
    }

    if (latestId) {
      await participant.update({ last_read_message_id: latestId });
    }

    return success(res, { ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { markConversationRead };
