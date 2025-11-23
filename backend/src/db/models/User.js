"use strict";

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      password_hash: { type: DataTypes.STRING(255), allowNull: false },
      name: { type: DataTypes.STRING(100) },
      created_at: { type: DataTypes.DATE },
      updated_at: { type: DataTypes.DATE },
    },
    { tableName: "users", timestamps: true, underscored: true }
  );

  User.associate = (models) => {
    User.hasOne(models.Profile, { as: "profile", foreignKey: "user_id", onDelete: "CASCADE" });
    User.hasMany(models.Post, { as: "posts", foreignKey: "user_id", onDelete: "CASCADE" });
    User.hasMany(models.Comment, { as: "comments", foreignKey: "user_id", onDelete: "CASCADE" });
    User.hasMany(models.PostLike, { as: "likes", foreignKey: "user_id", onDelete: "CASCADE" });
    User.hasMany(models.RefreshToken, { as: "refreshTokens", foreignKey: "user_id", onDelete: "CASCADE" });

    // Self-referential follow graph via Follow join table.
    User.belongsToMany(models.User, {
      as: "following",
      through: models.Follow,
      foreignKey: "follower_user_id",
      otherKey: "followee_user_id",
    });
    User.belongsToMany(models.User, {
      as: "followers",
      through: models.Follow,
      foreignKey: "followee_user_id",
      otherKey: "follower_user_id",
    });

    // Messaging relationships.
    User.belongsToMany(models.Conversation, {
      as: "conversations",
      through: models.ConversationParticipant,
      foreignKey: "user_id",
      otherKey: "conversation_id",
    });
    User.hasMany(models.Message, {
      as: "sentMessages",
      foreignKey: "sender_id",
      onDelete: "CASCADE",
    });
  };

  return User;
};
