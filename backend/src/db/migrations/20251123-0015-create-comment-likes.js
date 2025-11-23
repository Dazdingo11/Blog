"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    await queryInterface.createTable("comment_likes", {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      comment_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addConstraint("comment_likes", {
      fields: ["comment_id"],
      type: "foreign key",
      name: "fk_comment_likes_comment",
      references: { table: "comments", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    await queryInterface.addConstraint("comment_likes", {
      fields: ["user_id"],
      type: "foreign key",
      name: "fk_comment_likes_user",
      references: { table: "users", field: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    await queryInterface.addConstraint("comment_likes", {
      fields: ["comment_id", "user_id"],
      type: "unique",
      name: "uq_comment_likes_comment_user",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("comment_likes");
  },
};
