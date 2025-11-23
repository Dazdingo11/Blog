"use strict";

module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define(
    "Message",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      conversation_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      sender_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: false },
      created_at: { type: DataTypes.DATE },
      read_at: { type: DataTypes.DATE },
    },
    { tableName: "messages", timestamps: false, underscored: true }
  );

  Message.associate = (models) => {
    Message.belongsTo(models.Conversation, {
      as: "conversation",
      foreignKey: "conversation_id",
    });
    Message.belongsTo(models.User, {
      as: "sender",
      foreignKey: "sender_id",
    });
  };

  return Message;
};

