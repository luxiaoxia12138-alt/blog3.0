// src/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser"); // ✅ 补上
// 路由
const postsRouter = require("./routes/posts");
const authRouter = require("./routes/auth"); // 登录 / 注册 / me

const app = express();

// 跨域设置：记得这里的 origin 要和你前端端口一致
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// 解析 cookie + JSON
app.use(cookieParser()); // ✅ 让 auth 中间件能从 cookie 里拿 token
app.use(express.json());

// 静态资源强缓存：/static 下的文件（JS/CSS/图片等）
app.use(
  "/static",
  express.static(path.join(__dirname, "../public"), {
    etag: true, // 生成 ETag
    lastModified: true, // 设置 Last-Modified
    maxAge: "7d", // 浏览器本地缓存 7 天
    setHeaders: (res, filePath) => {
      // 对于静态资源使用强缓存
      res.setHeader(
        "Cache-Control",
        "public, max-age=604800, immutable" // 7 天，且文件内容不变
      );
    },
  })
);

// 健康检查接口
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// ✅ 挂载登录相关接口
app.use("/api/auth", authRouter);

// ✅ 挂载文章接口：所有 /api/posts 开头的请求都交给 postsRouter
app.use("/api/posts", postsRouter);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend server listening on http://localhost:${PORT}`);
});
