// backend/src/routes/auth.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { auth } = require("../middleware/auth");

// 签发 token 的工具函数
function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

// （可选）注册接口：你可以只在开发阶段开着，线上关掉
router.post("/register", async (req, res) => {
  const { username, password, nickname, role = "user" } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "username & password required" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO users (username, password, nickname, role) VALUES (?, ?, ?, ?)",
      [username, hash, nickname || username, role]
    );
    res.json({ message: "registered" });
  } catch (err) {
    console.error(err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "username already exists" });
    }
    res.status(500).json({ message: "server error" });
  }
});

// 登录接口
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "username & password required" });
  }

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE username = ?", [
      username,
    ]);
    if (!rows.length) {
      return res.status(401).json({ message: "invalid credentials" });
    }

    const user = rows[0];

    // 数据库里 password 存的是 bcrypt 哈希
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: "invalid credentials" });
    }

    const token = signToken(user);

    // 写入 httpOnly cookie（可选）
    res.cookie("token", token, {
      httpOnly: true,
      // secure: true, // 上线 https 时再打开
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      token, // 前端也可以自己存，用 Authorization: Bearer xxx
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ message: "server error" });
  }
});

// 退出登录：清 cookie
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "logged out" });
});

// 获取当前登录用户信息
router.get("/me", auth(false), (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "unauthorized" });
  }
  res.json({ user: req.user });
});

module.exports = router;
