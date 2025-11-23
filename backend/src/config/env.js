require('dotenv').config();

const env = (key, fallback) => process.env[key] ?? fallback;

const nodeEnv = env('NODE_ENV', 'development');

module.exports = {
  nodeEnv,
  port: Number(env('PORT', 3001)),

  db: {
    username: env('DB_USER', 'root'),
    // Prefer the canonical DB_PASSWORD but still honor legacy DB_PASS.
    password: env('DB_PASSWORD', env('DB_PASS', '')),
    database: env('DB_NAME', 'tech_blog'),
    host: env('DB_HOST', '127.0.0.1'),
    port: Number(env('DB_PORT', 3306)),
    dialect: 'mysql',
    logging: false,
  },

  jwt: {
    accessSecret: env('JWT_ACCESS_SECRET', 'dev'),
    refreshSecret: env('JWT_REFRESH_SECRET', 'dev'),
    accessTtl: env('JWT_ACCESS_TTL', '15m'),
    refreshTtl: env('JWT_REFRESH_TTL', '7d'),
  },

  corsOrigin: env('CLIENT_ORIGIN', 'http://localhost:3000'),

  cookie: {
    // Local dev usually runs lax/false; cross-site prod should be none/true.
    sameSite: env('COOKIE_SAME_SITE', 'lax'),
    secure: String(env('COOKIE_SECURE', nodeEnv === 'production' ? 'true' : 'false')).toLowerCase() === 'true',
  },
};
