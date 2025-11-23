"use strict";

module.exports = (sequelize, DataTypes) => {
  const CommentLike = sequelize.define(
    "CommentLike",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      comment_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      created_at: { type: DataTypes.DATE },
    },
    { tableName: "comment_likes", timestamps: false, underscored: true }
  );

  CommentLike.associate = (models) => {
    CommentLike.belongsTo(models.Comment, { as: "comment", foreignKey: "comment_id" });
    CommentLike.belongsTo(models.User, { as: "user", foreignKey: "user_id" });
  };

  return CommentLike;
};

