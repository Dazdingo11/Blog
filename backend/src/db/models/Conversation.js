"use strict";

module.exports = (sequelize, DataTypes) => {
  const Conversation = sequelize.define(
    "Conversation",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      created_at: { type: DataTypes.DATE },
      updated_at: { type: DataTypes.DATE },
    },
    { tableName: "conversations", timestamps: true, underscored: true }
  );

  Conversation.associate = (models) => {
    Conversation.hasMany(models.ConversationParticipant, {
      as: "conversation_participants",
      foreignKey: "conversation_id",
      onDelete: "CASCADE",
    });
    Conversation.belongsToMany(models.User, {
      as: "participants",
      through: models.ConversationParticipant,
      foreignKey: "conversation_id",
      otherKey: "user_id",
    });
    Conversation.hasMany(models.Message, {
      as: "messages",
      foreignKey: "conversation_id",
      onDelete: "CASCADE",
    });
  };

  return Conversation;
};
