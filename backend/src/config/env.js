require('dotenv').config();

const env = (key, fallback) => process.env[key] ?? fallback;

const nodeEnv = env('NODE_ENV', 'development');

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

const dbFromUrl = parseDbUrl(env('DATABASE_URL'));

const dbUser = dbFromUrl?.username ?? env('DB_USER', env('MYSQLUSER', 'root'));
const dbPass = dbFromUrl?.password ?? env(
  'DB_PASSWORD',
  env('DB_PASS', env('MYSQLPASSWORD', ''))
);
const dbName = dbFromUrl?.database ?? env('DB_NAME', env('MYSQLDATABASE', 'tech_blog'));
const dbHost = dbFromUrl?.host ?? env('DB_HOST', env('MYSQLHOST', '127.0.0.1'));
const dbPort = dbFromUrl?.port ?? Number(env('DB_PORT', env('MYSQLPORT', 3306)));

module.exports = {
  nodeEnv,
  port: Number(env('PORT', 3001)),

  db: {
    username: dbUser,
    password: dbPass,
    database: dbName,
    host: dbHost,
    port: dbPort,
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
    sameSite: env('COOKIE_SAME_SITE', 'lax'),
    secure:
      String(
        env('COOKIE_SECURE', nodeEnv === 'production' ? 'true' : 'false')
      )
        .toLowerCase() === 'true',
  },
};
