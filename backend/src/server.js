// src/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

// 引入文章路由
const postsRouter = require("./routes/posts");

const app = express();

app.use(express.json());
app.use(cors());
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

// 挂载文章接口：所有 /api/posts 开头的请求都交给 postsRouter
app.use("/api/posts", postsRouter);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend server listening on http://localhost:${PORT}`);
});
