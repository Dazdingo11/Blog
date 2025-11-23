"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Ensure column exists before backfilling.
    const table = await queryInterface.describeTable("conversation_participants");
    if (!table.last_read_message_id) return;

    // Set last_read_message_id to the latest message id per conversation, or 0 if none.
    await queryInterface.sequelize.query(`
      UPDATE conversation_participants cp
      LEFT JOIN (
        SELECT conversation_id, MAX(id) AS max_id
        FROM messages
        GROUP BY conversation_id
      ) m ON m.conversation_id = cp.conversation_id
      SET cp.last_read_message_id = COALESCE(m.max_id, 0)
      WHERE cp.last_read_message_id IS NULL;
    `);
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable("conversation_participants");
    if (!table.last_read_message_id) return;
    await queryInterface.sequelize.query(`
      UPDATE conversation_participants
      SET last_read_message_id = NULL;
    `);
  },
};
