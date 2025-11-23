"use strict";

module.exports = (sequelize, DataTypes) => {
  const Post = sequelize.define(
    "Post",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      title: { type: DataTypes.STRING(140) },
      excerpt: { type: DataTypes.STRING(300) },
      content: { type: DataTypes.TEXT },
      image_url: { type: DataTypes.STRING(512) },
      published: { type: DataTypes.BOOLEAN, defaultValue: true },
      created_at: { type: DataTypes.DATE },
      updated_at: { type: DataTypes.DATE },
    },
    { tableName: "posts", timestamps: true, underscored: true }
  );

  Post.associate = (models) => {
    Post.belongsTo(models.User, { as: "author", foreignKey: "user_id" });
    Post.hasMany(models.Comment, { as: "comments", foreignKey: "post_id", onDelete: "CASCADE" });
    Post.hasMany(models.PostLike, { as: "likes", foreignKey: "post_id", onDelete: "CASCADE" });
    if (models.PostMedia) {
      Post.hasMany(models.PostMedia, { as: "media", foreignKey: "post_id", onDelete: "CASCADE" });
    }
  };

  return Post;
};
