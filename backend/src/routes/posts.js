// backend/src/routes/posts.js

const express = require("express");
const { generateArticle } = require("../aiWriter");
const router = express.Router();
const db = require("../db");
const crypto = require("crypto");
const redisClient = require("../redisClient");
const { auth, requireRole } = require("../middleware/auth");

/**
 * 工具函数：确保用户存在，返回 userId
 * - 如果 username 已存在，直接返回 id
 * - 不存在，则创建一条并返回新 id
 */
async function ensureUser(username) {
  const name = username || "匿名";

  const [rows] = await db.query(
    "SELECT id FROM users WHERE username = ? LIMIT 1",
    [name]
  );

  if (rows.length > 0) {
    return rows[0].id;
  }

  const [result] = await db.query(
    "INSERT INTO users (username, nickname, password) VALUES (?, ?, ?)",
    [name, name, ""]
  );

  return result.insertId;
}

/**
 * 工具函数：更新文章的标签关联
 * - tagsString 仍然是 "测试,随笔" 这种格式
 * - 维护 tags 表 + article_tags 表
 */
async function updateArticleTags(articleId, tagsString) {
  // 先清空旧关联
  await db.query("DELETE FROM article_tags WHERE article_id = ?", [articleId]);

  if (!tagsString) return;

  const names = tagsString
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const name of names) {
    // 确保 tag 存在
    const [tagRows] = await db.query(
      "SELECT id FROM tags WHERE name = ? LIMIT 1",
      [name]
    );

    let tagId;
    if (tagRows.length > 0) {
      tagId = tagRows[0].id;
    } else {
      const [tagResult] = await db.query("INSERT INTO tags (name) VALUES (?)", [
        name,
      ]);
      tagId = tagResult.insertId;
    }

    // 建立文章和标签的关联
    await db.query(
      "INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)",
      [articleId, tagId]
    );
  }
}

/**
 * 简单缓存失效策略：
 * - 只要有写操作（新增 / 修改 / 删除），就清空 Redis 所有缓存
 *   这样可以保证数据与缓存一致
 */
async function flushAllCache() {
  try {
    if (redisClient.isOpen) {
      await redisClient.sendCommand(["FLUSHALL"]);
      console.log("Redis 缓存已清空");
    }
  } catch (e) {
    console.error("清空 Redis 缓存失败：", e.message);
  }
}

/**
 * 列表接口：
 * - 分页 page / pageSize
 * - 标签筛选 tag
 * - 排序 sort=time/views
 * - 作者信息（users.nickname）
 * - Redis 缓存 + ETag 协商缓存
 */
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const pageSize = parseInt(req.query.pageSize || "10", 10);
    const offset = (page - 1) * pageSize;
    const tag = req.query.tag || "";
    const sort = req.query.sort || "time";

    let orderBy = "p.created_at";
    if (sort === "views") {
      orderBy = "p.view_count";
    }

    let where = `WHERE p.is_deleted = 0 AND p.status = 'published'`;
    const params = [];

    if (tag) {
      where += ` AND FIND_IN_SET(?, p.tags)`;
      params.push(tag);
    }

    // Redis 缓存 key：不同 page/tag/sort 对应不同缓存
    const cacheKey = `posts:list:${page}:${pageSize}:${sort}:${tag || ""}`;

    // 先尝试从 Redis 读缓存
    try {
      if (redisClient.isOpen) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          const etag = crypto.createHash("md5").update(cached).digest("hex");
          if (req.headers["if-none-match"] === etag) {
            res.status(304).end();
            return;
          }
          res.setHeader("ETag", etag);
          res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.send(cached);
          return;
        }
      }
    } catch (e) {
      console.error("读取 Redis 列表缓存失败：", e.message);
    }

    // 没有缓存则查数据库
    const [rows] = await db.query(
      `
      SELECT 
        p.id,
        p.title,
        COALESCE(u.nickname, '匿名') AS author,
        p.summary,
        p.tags,
        p.view_count,
        p.created_at,
        p.status
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      ${where}
      ORDER BY ${orderBy} DESC
      LIMIT ? OFFSET ?
      `,
      [...params, pageSize, offset]
    );

    const [[{ total }]] = await db.query(
      `
      SELECT COUNT(*) AS total
      FROM posts p
      ${where}
      `,
      params
    );

    const responseBody = {
      list: rows,
      pagination: {
        page,
        pageSize,
        total,
      },
    };

    const payload = JSON.stringify(responseBody);
    const etag = crypto.createHash("md5").update(payload).digest("hex");

    // 写入 Redis 缓存
    try {
      if (redisClient.isOpen) {
        await redisClient.setEx(cacheKey, 60, payload); // 列表缓存 60 秒
      }
    } catch (e) {
      console.error("写入 Redis 列表缓存失败：", e.message);
    }

    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.send(payload);
  } catch (err) {
    console.error("获取文章列表失败", err);
    res.status(500).json({ message: "获取文章列表失败" });
  }
});

/**
 * 详情接口：
 * - Redis 缓存
 * - 阅读量 +1
 * - 作者信息
 */
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const cacheKey = `posts:detail:${id}`;

    // 尝试从 Redis 拿详情缓存
    try {
      if (redisClient.isOpen) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          // 命中缓存时，阅读量在后台异步 +1
          db.query(
            `
            UPDATE posts
            SET view_count = view_count + 1
            WHERE id = ? AND is_deleted = 0
            `,
            [id]
          ).catch(() => {});
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.send(cached);
          return;
        }
      }
    } catch (e) {
      console.error("读取 Redis 详情缓存失败：", e.message);
    }

    // 没有缓存：同步 +1 阅读量，再查数据库
    await db.query(
      `
      UPDATE posts
      SET view_count = view_count + 1
      WHERE id = ? AND is_deleted = 0
      `,
      [id]
    );

    const [rows] = await db.query(
      `
      SELECT 
        p.id,
        p.title,
        COALESCE(u.nickname, '匿名') AS author,
        p.summary,
        p.content,
        p.tags,
        p.view_count,
        p.created_at,
        p.updated_at
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      WHERE p.id = ? AND p.is_deleted = 0
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "文章不存在" });
    }

    const payload = JSON.stringify(rows[0]);

    // 写入 Redis 详情缓存
    try {
      if (redisClient.isOpen) {
        await redisClient.setEx(cacheKey, 30, payload); // 详情缓存 30 秒
      }
    } catch (e) {
      console.error("写入 Redis 详情缓存失败：", e.message);
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.send(payload);
  } catch (err) {
    console.error("获取文章详情失败", err);
    res.status(500).json({ message: "获取文章详情失败" });
  }
});

/**
 * 新增文章
 */
router.post("/", auth(), requireRole("admin"), async (req, res) => {
  try {
    const { title, summary, content, tags, status, author } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: "title 和 content 必填" });
    }

    // 确保用户存在
    const authorName = (req.user && req.user.username) || author || "匿名";

    const authorId = await ensureUser(authorName);

    // 插入文章（保留 author 文本字段可选，这里用 author_id 为主）
    const [result] = await db.query(
      `
      INSERT INTO posts (title, author_id, summary, content, tags, status)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        title,
        authorId,
        summary || "",
        content,
        tags || "",
        status || "published",
      ]
    );

    const articleId = result.insertId;

    // 更新标签关联
    await updateArticleTags(articleId, tags);

    // 失效所有缓存
    await flushAllCache();

    res.status(201).json({ id: articleId, message: "创建成功" });
  } catch (err) {
    console.error("新增文章失败", err);
    res.status(500).json({ message: "新增文章失败" });
  }
});

/**
 * 修改文章
 */
router.put("/:id", auth(), requireRole("admin"), async (req, res) => {
  try {
    const id = req.params.id;
    const { title, summary, content, tags, status, author } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: "title 和 content 必填" });
    }

    const authorName = (req.user && req.user.username) || author || "匿名";
    const authorId = await ensureUser(authorName);

    const [result] = await db.query(
      `
      UPDATE posts
      SET title = ?, author_id = ?, summary = ?, content = ?, tags = ?, status = ?
      WHERE id = ? AND is_deleted = 0
      `,
      [
        title,
        authorId,
        summary || "",
        content,
        tags || "",
        status || "published",
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "文章不存在或已删除" });
    }

    await updateArticleTags(id, tags);

    await flushAllCache();

    res.json({ message: "更新成功" });
  } catch (err) {
    console.error("更新文章失败", err);
    res.status(500).json({ message: "更新文章失败" });
  }
});

/**
 * 单条删除（逻辑删除）
 */
router.delete("/:id", auth(), requireRole("admin"), async (req, res) => {
  try {
    const id = req.params.id;

    const [result] = await db.query(
      `
      UPDATE posts
      SET is_deleted = 1
      WHERE id = ?
      `,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "文章不存在" });
    }

    await flushAllCache();

    res.json({ message: "删除成功" });
  } catch (err) {
    console.error("删除文章失败", err);
    res.status(500).json({ message: "删除文章失败" });
  }
});

/**
 * 批量删除
 */
router.delete("/", auth(), requireRole("admin"), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "ids 必须是非空数组" });
    }

    const [result] = await db.query(
      `
      UPDATE posts
      SET is_deleted = 1
      WHERE id IN ( ${ids.map(() => "?").join(", ")} )
      `,
      ids
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "没有匹配到文章" });
    }

    await flushAllCache();

    res.json({ message: "批量删除成功" });
  } catch (err) {
    console.error("批量删除文章失败", err);
    res.status(500).json({ message: "批量删除文章失败" });
  }
});
/**
 * AI 写作助手接口
 * POST /api/posts/ai-generate
 * body: { title: string, keywords?: string }
 */
router.post("/ai-generate", auth(), async (req, res) => {
  try {
    const { title, keywords } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "标题不能为空" });
    }

    const result = await generateArticle({
      title: title.trim(),
      keywords: (keywords || "").trim(),
    });

    res.json({
      summary: result.summary,
      content: result.content,
    });
  } catch (err) {
    console.error("AI 写作助手失败：", err);
    res.status(500).json({
      message: "AI 写作助手生成失败",
      error: err.message || String(err),
    });
  }
});

module.exports = router;
