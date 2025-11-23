"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Ensure existing duplicate usernames are resolved before adding uniqueness.
    const [dupes] = await queryInterface.sequelize.query(`
      SELECT name, GROUP_CONCAT(id) AS ids, COUNT(*) AS cnt
      FROM users
      WHERE name IS NOT NULL AND name <> ''
      GROUP BY name
      HAVING cnt > 1
    `);

    for (const row of dupes) {
      const ids = String(row.ids || "").split(",").map((v) => Number(v)).filter(Boolean);
      // Keep the first id as-is; rename the rest with a suffix.
      ids.slice(1).forEach((id, idx) => {
        const newName = `${row.name}-${id}`;
        // Best effort; if this collides, append the index.
        const fallbackName = `${row.name}-${id}-${idx}`;
        queryInterface.sequelize
          .query(
            "UPDATE users SET name = :newName WHERE id = :id",
            { replacements: { newName, id } }
          )
          .catch(() =>
            queryInterface.sequelize.query(
              "UPDATE users SET name = :fallbackName WHERE id = :id",
              { replacements: { fallbackName, id } }
            )
          );
      });
    }

    // Add a unique index on users.name to prevent duplicate usernames.
    // Allow NULLs to coexist; only non-null values must be unique.
    await queryInterface.addIndex("users", ["name"], {
      name: "uq_users_name",
      unique: true,
      where: {
        name: { [Sequelize.Op.ne]: null },
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("users", "uq_users_name");
  },
};
