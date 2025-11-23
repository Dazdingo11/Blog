"use strict";

module.exports = (sequelize, DataTypes) => {
  const Profile = sequelize.define(
    "Profile",
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
      display_name: { type: DataTypes.STRING(100) },
      first_name: { type: DataTypes.STRING(100) },
      last_name: { type: DataTypes.STRING(100) },
      date_of_birth: { type: DataTypes.DATEONLY },
      avatar_url: { type: DataTypes.STRING(512) },
      bio: { type: DataTypes.STRING(300) },
      created_at: { type: DataTypes.DATE },
      updated_at: { type: DataTypes.DATE },
    },
    { tableName: "profiles", timestamps: true, underscored: true }
  );

  Profile.associate = (models) => {
    Profile.belongsTo(models.User, { as: "user", foreignKey: "user_id" });
  };

  return Profile;
};
