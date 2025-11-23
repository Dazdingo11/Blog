"use strict";

module.exports = {
  async up(q, Sequelize) {
    const { DataTypes } = Sequelize;
    await q.createTable("comments", {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      post_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      parent_comment_id: { type: DataTypes.INTEGER.UNSIGNED },
      body: { type: DataTypes.TEXT, allowNull: false },
      created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
    await q.addConstraint("comments", {
      fields: ["post_id"],
      type: "foreign key",
      name: "fk_comments_post",
      references: { table: "posts", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    await q.addConstraint("comments", {
      fields: ["user_id"],
      type: "foreign key",
      name: "fk_comments_user",
      references: { table: "users", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    await q.addConstraint("comments", {
      fields: ["parent_comment_id"],
      type: "foreign key",
      name: "fk_comments_parent",
      references: { table: "comments", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  },
  async down(q) {
    await q.dropTable("comments");
  },
};
