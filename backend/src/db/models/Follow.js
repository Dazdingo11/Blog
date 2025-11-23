"use strict";

module.exports = (sequelize, DataTypes) => {
  const Follow = sequelize.define(
    "Follow",
    {
      follower_user_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
      followee_user_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
      created_at: { type: DataTypes.DATE },
    },
    { tableName: "follows", timestamps: false, underscored: true }
  );

  Follow.associate = (models) => {
    Follow.belongsTo(models.User, { as: "follower", foreignKey: "follower_user_id" });
    Follow.belongsTo(models.User, { as: "followee", foreignKey: "followee_user_id" });
  };

  return Follow;
};
