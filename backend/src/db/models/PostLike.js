"use strict";

module.exports = (sequelize, DataTypes) => {
  const PostLike = sequelize.define(
    "PostLike",
    {
      user_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
      post_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
      created_at: { type: DataTypes.DATE },
    },
    { tableName: "post_likes", timestamps: false, underscored: true }
  );

  PostLike.associate = (models) => {
    PostLike.belongsTo(models.User, { as: "user", foreignKey: "user_id" });
    PostLike.belongsTo(models.Post, { as: "post", foreignKey: "post_id" });
  };

  return PostLike;
};
