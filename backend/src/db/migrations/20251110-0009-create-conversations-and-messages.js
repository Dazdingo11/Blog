"use strict";

module.exports = {
  async up(q, Sequelize) {
    const { DataTypes } = Sequelize;

    await q.createTable("conversations", {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await q.createTable("conversation_participants", {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      conversation_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await q.addConstraint("conversation_participants", {
      fields: ["conversation_id"],
      type: "foreign key",
      name: "fk_conversation_participants_conversation",
      references: { table: "conversations", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    await q.addConstraint("conversation_participants", {
      fields: ["user_id"],
      type: "foreign key",
      name: "fk_conversation_participants_user",
      references: { table: "users", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    await q.addConstraint("conversation_participants", {
      fields: ["conversation_id", "user_id"],
      type: "unique",
      name: "uq_conversation_participants_conversation_user",
    });

    await q.createTable("messages", {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      conversation_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      sender_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: false },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      read_at: { type: DataTypes.DATE },
    });

    await q.addConstraint("messages", {
      fields: ["conversation_id"],
      type: "foreign key",
      name: "fk_messages_conversation",
      references: { table: "conversations", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    await q.addConstraint("messages", {
      fields: ["sender_id"],
      type: "foreign key",
      name: "fk_messages_sender",
      references: { table: "users", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  },

  async down(q) {
    await q.dropTable("messages");
    await q.dropTable("conversation_participants");
    await q.dropTable("conversations");
  },
};

