const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const parseDbUrl = (url) => {
  try {
    const u = new URL(url);
    return {
      username: u.username,
      password: u.password,
      database: u.pathname.slice(1),
      host: u.hostname,
      port: Number(u.port || 3306),
    };
  } catch {
    return null;
  }
};

const urlConfig = parseDbUrl(process.env.DATABASE_URL);

const base = {
  username: urlConfig?.username || process.env.DB_USER || process.env.MYSQL_USER || 'root',
  // Primary env var is DB_PASSWORD; legacy DB_PASS and MYSQL_PASSWORD still work.
  password: urlConfig?.password || process.env.DB_PASSWORD || process.env.DB_PASS || process.env.MYSQL_PASSWORD || null,
  database: urlConfig?.database || process.env.DB_NAME || 'tech_blog',
  host: urlConfig?.host || process.env.DB_HOST || '127.0.0.1',
  port: urlConfig?.port || Number(process.env.DB_PORT || 3306),
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
