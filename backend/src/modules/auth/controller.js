const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../../db/models");
const { jwt: jwtCfg, cookie: cookieCfg } = require("../../config/env");
const { success, created, error } = require("../../utils/response");
const { Op } = db.Sequelize;

/** Parse durations like "15m" or "7d" into milliseconds. */
function parseDuration(str, fallbackMs) {
  if (!str || typeof str !== "string") return fallbackMs;
  const m = str.match(/^(\d+)\s*([mhd])$/i);
  if (!m) return fallbackMs;
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  if (unit === "m") return n * 60 * 1000;
  if (unit === "h") return n * 60 * 60 * 1000;
  if (unit === "d") return n * 24 * 60 * 60 * 1000;
  return fallbackMs;
}

const ACCESS_TTL_MS  = parseDuration(jwtCfg.accessTtl, 15 * 60 * 1000);   // defaults to 15m
const REFRESH_TTL_MS = parseDuration(jwtCfg.refreshTtl, 7 * 24 * 60 * 60 * 1000); // defaults to 7d

function signAccessToken(user) {
  const payload = { sub: user.id, email: user.email, name: user.name };
  return jwt.sign(payload, jwtCfg.accessSecret, { expiresIn: Math.floor(ACCESS_TTL_MS/1000) + "s" });
}

function makeRefreshToken() {
  // 256 bits of randomness, hex-encoded for the cookie.
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(raw) {
  return crypto.createHash("sha256").update(raw, "utf8").digest("hex");
}

async function issueRotation(res, userId) {
  // Create a new refresh token record.
  const raw = makeRefreshToken();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  await db.RefreshToken.create({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt
  });

  // Send the raw token back as an httpOnly cookie.
  res.cookie("refresh_token", raw, {
    httpOnly: true,
    secure: cookieCfg.secure,
    sameSite: cookieCfg.sameSite,
    expires: expiresAt,
    path: "/",
  });
}

exports.register = async (req, res) => {
  try {
  const {
    username,
    fullName,
    dob,
    email,
    password,
    passwordConfirm,
  } = req.body || {};

  const cleanUsername = (username || "").toString().trim();
  const cleanFullName = (fullName || "").toString().trim();
  const cleanDob = (dob || "").toString().trim();

  if (!cleanUsername || cleanUsername.length < 2) {
    return error(res, 400, "AUTH_USERNAME_TOO_SHORT", "Username too short");
  }
  if (!cleanFullName) {
    return error(res, 400, "AUTH_FULLNAME_REQUIRED", "Name and surname required");
  }
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return error(res, 400, "AUTH_EMAIL_INVALID", "Invalid email");
  }
  if (!password || password.length < 6) {
    return error(res, 400, "AUTH_PASSWORD_TOO_SHORT", "Password too short");
  }
  if (password !== passwordConfirm) {
    return error(res, 400, "AUTH_PASSWORD_MISMATCH", "Passwords do not match");
  }

  // Block duplicate registrations by email.
  const existing = await db.User.findOne({ where: { email } });
  if (existing) {
    return error(res, 400, "AUTH_EMAIL_EXISTS", "Email already registered");
  }
  // Block duplicate usernames.
  const existingName = await db.User.findOne({ where: { name: cleanUsername } });
  if (existingName) {
    return error(res, 400, "AUTH_NAME_EXISTS", "Username already taken");
  }

  let parsedDob = null;
  if (cleanDob) {
    const dt = new Date(cleanDob);
    if (!Number.isNaN(dt.getTime())) {
      parsedDob = dt.toISOString().slice(0, 10);
    }
  }
  const [firstName, ...restName] = cleanFullName.split(" ").filter(Boolean);
  const lastName = restName.length > 0 ? restName.join(" ") : null;

  const hash = await bcrypt.hash(password, 10);
  const user = await db.User.create({ name: cleanUsername, email, password_hash: hash });

    const accessToken = signAccessToken(user);
    await issueRotation(res, user.id);

    // Create a starter profile if this user doesn't have one yet.
  await db.Profile.findOrCreate({
    where: { user_id: user.id },
    defaults: {
      display_name: cleanFullName || cleanUsername,
      first_name: firstName || null,
      last_name: lastName,
      date_of_birth: parsedDob,
    },
  });

    return created(res, {
      item: { id: user.id, name: user.name, email: user.email },
      accessToken,
    });
  } catch (err) {
    console.error("register error:", err);
    return error(res, 500, "AUTH_REGISTER_FAILED", "Internal error");
  }
};

exports.login = async (req, res) => {
  try {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return error(res, 400, "AUTH_INVALID_CREDENTIALS", "Invalid credentials");
  }

  const identifier = (email || "").toString().trim();
  const user = await db.User.findOne({
    where: {
      [Op.or]: [{ email: identifier }, { name: identifier }],
    },
  });
  if (!user) {
    return error(res, 401, "AUTH_INVALID_CREDENTIALS", "Invalid credentials");
  }

    const ok = await bcrypt.compare(password, user.password_hash || "");
    if (!ok) {
      return error(res, 401, "AUTH_INVALID_CREDENTIALS", "Invalid credentials");
    }

    const accessToken = signAccessToken(user);
    await issueRotation(res, user.id);

    return success(res, {
      item: { id: user.id, name: user.name, email: user.email },
      accessToken,
    });
  } catch (err) {
    console.error("login error:", err);
    return error(res, 500, "AUTH_LOGIN_FAILED", "Internal error");
  }
};

// Refresh access token using the httpOnly refresh cookie.
exports.refresh = async (req, res) => {
  try {
    const raw = req.cookies?.refresh_token;
    if (!raw) {
      return error(res, 401, "AUTH_NO_REFRESH_TOKEN", "No refresh token");
    }

    const tokenHash = hashToken(raw);
    const rec = await db.RefreshToken.findOne({ where: { token_hash: tokenHash } });
    if (!rec || (rec.revoked_at != null) || (new Date(rec.expires_at) < new Date())) {
      return error(res, 401, "AUTH_INVALID_REFRESH_TOKEN", "Invalid refresh token");
    }

    const user = await db.User.findByPk(rec.user_id);
    if (!user) {
      return error(res, 401, "AUTH_INVALID_REFRESH_TOKEN", "Invalid refresh token");
    }

    // Rotate the refresh token to keep it one-time.
    await rec.update({ revoked_at: new Date() });
    await issueRotation(res, user.id);

    const accessToken = signAccessToken(user);
    return success(res, { accessToken });
  } catch (err) {
    console.error("refresh error:", err);
    return error(res, 500, "AUTH_REFRESH_FAILED", "Internal error");
  }
};

exports.logout = async (req, res) => {
  try {
    const raw = req.cookies?.refresh_token;
    if (raw) {
      const tokenHash = hashToken(raw);
      await db.RefreshToken.update(
        { revoked_at: new Date() },
        { where: { token_hash: tokenHash } }
      );
    }
    res.clearCookie("refresh_token", { path: "/" });
    return success(res, { ok: true });
  } catch (err) {
    console.error("logout error:", err);
    return error(res, 500, "AUTH_LOGOUT_FAILED", "Internal error");
  }
};
