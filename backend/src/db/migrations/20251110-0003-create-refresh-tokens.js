"use strict";

module.exports = {
  async up(q, Sequelize) {
    const { DataTypes } = Sequelize;
    await q.createTable("refresh_tokens", {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      token_hash: { type: DataTypes.CHAR(64), allowNull: false, unique: true },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      revoked_at: { type: DataTypes.DATE },
      created_at: { type: DataTypes.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      user_agent: { type: DataTypes.STRING(255) },
      ip_hash: { type: DataTypes.CHAR(64) },
    });
    await q.addConstraint("refresh_tokens", {
      fields: ["user_id"],
      type: "foreign key",
      name: "fk_refresh_user",
      references: { table: "users", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  },
  async down(q) {
    await q.dropTable("refresh_tokens");
  },
};
