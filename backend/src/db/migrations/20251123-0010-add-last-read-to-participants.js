"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable("conversation_participants");
    if (!table.last_read_message_id) {
      await queryInterface.addColumn("conversation_participants", "last_read_message_id", {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        after: "created_at",
      });
    }
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable("conversation_participants");
    if (table.last_read_message_id) {
      await queryInterface.removeColumn("conversation_participants", "last_read_message_id");
    }
  },
};
