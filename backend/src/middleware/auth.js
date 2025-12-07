// backend/src/middleware/auth.js
const jwt = require("jsonwebtoken");

/**
 * 认证中间件
 * 默认 required=true：必须登录
 * 如果某些接口“有登录就带 user，没登录也放行”，可以用 auth(false)
 */
function auth(required = true) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization || "";
    const tokenFromHeader = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    // 如果你用 cookie 存 token，也可以从 cookie 里取
    const token = tokenFromHeader || (req.cookies && req.cookies.token);

    if (!token) {
      if (!required) return next();
      return res.status(401).json({ message: "unauthorized" });
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = {
        id: payload.id,
        username: payload.username,
        role: payload.role,
      };
      next();
    } catch (err) {
      console.error("auth error:", err);
      return res.status(401).json({ message: "invalid token" });
    }
  };
}

/**
 * 权限中间件：限制角色
 * 例：requireRole('admin')
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "unauthorized" });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ message: "forbidden" });
    }
    next();
  };
}

module.exports = { auth, requireRole };
