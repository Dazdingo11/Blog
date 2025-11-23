"use strict";

module.exports = {
  async up(q, Sequelize) {
    const { DataTypes } = Sequelize;
    await q.createTable("posts", {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      title: { type: DataTypes.STRING(140) },
      excerpt: { type: DataTypes.STRING(300) },
      content: { type: DataTypes.TEXT },
      image_url: { type: DataTypes.STRING(512) },
      published: { type: DataTypes.BOOLEAN, defaultValue: true },
      created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP") },
    });
    await q.addConstraint("posts", {
      fields: ["user_id"],
      type: "foreign key",
      name: "fk_posts_user",
      references: { table: "users", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  },
  async down(q) {
    await q.dropTable("posts");
  },
};
