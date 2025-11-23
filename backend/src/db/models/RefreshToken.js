"use strict";

module.exports = (sequelize, DataTypes) => {
  const RefreshToken = sequelize.define(
    "RefreshToken",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      token_hash: { type: DataTypes.CHAR(64), allowNull: false, unique: true },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      revoked_at: { type: DataTypes.DATE },
      created_at: { type: DataTypes.DATE },
      user_agent: { type: DataTypes.STRING(255) },
      ip_hash: { type: DataTypes.CHAR(64) },
    },
    { tableName: "refresh_tokens", timestamps: false, underscored: true }
  );

  RefreshToken.associate = (models) => {
    RefreshToken.belongsTo(models.User, { as: "user", foreignKey: "user_id" });
  };

  return RefreshToken;
};
