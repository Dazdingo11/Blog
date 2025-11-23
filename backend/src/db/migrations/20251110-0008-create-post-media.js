"use strict";

module.exports = {
  async up(q, Sequelize) {
    const { DataTypes } = Sequelize;
    await q.createTable("post_media", {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      post_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      url: { type: DataTypes.STRING(512), allowNull: false },
      media_type: { type: DataTypes.ENUM("image"), defaultValue: "image" },
      width: { type: DataTypes.INTEGER },
      height: { type: DataTypes.INTEGER },
      position: { type: DataTypes.INTEGER, defaultValue: 0 },
      created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
    await q.addConstraint("post_media", {
      fields: ["post_id"],
      type: "foreign key",
      name: "fk_postmedia_post",
      references: { table: "posts", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  },
  async down(q) {
    await q.dropTable("post_media");
  },
};
