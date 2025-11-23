"use strict";

module.exports = (sequelize, DataTypes) => {
  const ConversationParticipant = sequelize.define(
    "ConversationParticipant",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      conversation_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      created_at: { type: DataTypes.DATE },
      last_read_message_id: { type: DataTypes.INTEGER.UNSIGNED },
      hidden: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      hidden_since_message_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    },
    { tableName: "conversation_participants", timestamps: false, underscored: true }
  );

  ConversationParticipant.associate = (models) => {
    ConversationParticipant.belongsTo(models.Conversation, {
      as: "conversation",
      foreignKey: "conversation_id",
    });
    ConversationParticipant.belongsTo(models.User, {
      as: "user",
      foreignKey: "user_id",
    });
  };

  return ConversationParticipant;
};

