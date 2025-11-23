const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const base = {
  username: process.env.DB_USER || process.env.MYSQL_USER || 'root',
  // Primary env var is DB_PASSWORD; legacy DB_PASS and MYSQL_PASSWORD still work.
  password: process.env.DB_PASSWORD || process.env.DB_PASS || process.env.MYSQL_PASSWORD || null,
  database: process.env.DB_NAME || 'tech_blog',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  dialect: 'mysql',
  logging: false,
  migrationStorage: 'sequelize',    // History stored in SequelizeMeta
  seederStorage: 'sequelize',
  define: {
    underscored: true,              // Snake_case columns (created_at, user_id, etc.)
    freezeTableName: false,
  },
};

module.exports = {
  development: { ...base },
  test:        { ...base, database: process.env.DB_NAME_TEST || 'blog_test' },
  production:  { ...base },
};
