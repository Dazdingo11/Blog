"use strict";

module.exports = {
  async up(q, Sequelize) {
    const { DataTypes } = Sequelize;
    await q.createTable("follows", {
      follower_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      followee_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    });
    await q.addConstraint("follows", {
      fields: ["follower_user_id", "followee_user_id"],
      type: "primary key",
      name: "pk_follows",
    });
    await q.addConstraint("follows", {
      fields: ["follower_user_id"],
      type: "foreign key",
      name: "fk_follows_follower",
      references: { table: "users", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    await q.addConstraint("follows", {
      fields: ["followee_user_id"],
      type: "foreign key",
      name: "fk_follows_followee",
      references: { table: "users", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  },
  async down(q) {
    await q.dropTable("follows");
  },
};
