"use strict";

module.exports = {
  async up(q, Sequelize) {
    const { DataTypes } = Sequelize;
    await q.createTable("post_likes", {
      user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      post_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
    await q.addConstraint("post_likes", {
      fields: ["user_id", "post_id"],
      type: "primary key",
      name: "pk_post_likes",
    });
    await q.addConstraint("post_likes", {
      fields: ["user_id"],
      type: "foreign key",
      name: "fk_postlikes_user",
      references: { table: "users", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    await q.addConstraint("post_likes", {
      fields: ["post_id"],
      type: "foreign key",
      name: "fk_postlikes_post",
      references: { table: "posts", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  },
  async down(q) {
    await q.dropTable("post_likes");
  },
};
