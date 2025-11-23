"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    await queryInterface.addColumn("profiles", "first_name", {
      type: DataTypes.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn("profiles", "last_name", {
      type: DataTypes.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn("profiles", "date_of_birth", {
      type: DataTypes.DATEONLY,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("profiles", "date_of_birth");
    await queryInterface.removeColumn("profiles", "last_name");
    await queryInterface.removeColumn("profiles", "first_name");
  },
};
