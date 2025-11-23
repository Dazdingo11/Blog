"use strict";

module.exports = (sequelize, DataTypes) => {
  const Comment = sequelize.define(
    "Comment",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      post_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      parent_comment_id: { type: DataTypes.INTEGER.UNSIGNED },
      body: { type: DataTypes.TEXT, allowNull: false },
      created_at: { type: DataTypes.DATE },
    },
    { tableName: "comments", timestamps: false, underscored: true }
  );

  Comment.associate = (models) => {
    Comment.belongsTo(models.Post, { as: "post", foreignKey: "post_id" });
    Comment.belongsTo(models.User, { as: "author", foreignKey: "user_id" });
    Comment.belongsTo(models.Comment, { as: "parent", foreignKey: "parent_comment_id" });
    Comment.hasMany(models.Comment, { as: "replies", foreignKey: "parent_comment_id", onDelete: "CASCADE" });
  };

  return Comment;
};
