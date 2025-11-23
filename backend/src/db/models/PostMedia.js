"use strict";

module.exports = (sequelize, DataTypes) => {
  const PostMedia = sequelize.define(
    "PostMedia",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      post_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      url: { type: DataTypes.STRING(512), allowNull: false },
      media_type: { type: DataTypes.ENUM("image"), defaultValue: "image" },
      width: { type: DataTypes.INTEGER },
      height: { type: DataTypes.INTEGER },
      position: { type: DataTypes.INTEGER, defaultValue: 0 },
      created_at: { type: DataTypes.DATE },
    },
    { tableName: "post_media", timestamps: false, underscored: true }
  );

  PostMedia.associate = (models) => {
    PostMedia.belongsTo(models.Post, { as: "post", foreignKey: "post_id" });
  };

  return PostMedia;
};
