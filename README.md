📘 SSR 博客系统开发文档

项目名称：SSR Blog System
技术栈：Nuxt3 + Express + MySQL + Redis + 火山引擎 AI
作者：舒英杰

一、项目概述

本项目实现一个服务端渲染（SSR）博客系统，包括：

前台文章列表页（SSR）

前台文章详情页（SSR）

用户系统（注册 / 登录 / 鉴权）

后台文章管理（新建 / 编辑 / 列表 / 删除 / 批量删除）

AI 自动写作助手（火山引擎 + 本地降级）

完整文章 CRUD API

MySQL 数据库（文章 / 用户 / 标签 / 多对多）

Redis 缓存优化（列表缓存 + 详情缓存）

HTTP 协商缓存（ETag）

SSR 降级策略（服务端失败 → 客户端重试）

项目覆盖前后端全栈能力，是学习 SSR、高性能架构的优秀实践案例。

二、技术栈
前端（SSR）

Nuxt 3（Vue 3）

SSR + Hydration

useAsyncData 服务端数据获取

Tailwind 风格 CSS

自定义错误处理（client/server 插件）

后端

Express

RESTful API

JWT 用户认证

鉴权中间件（保护后台接口）

数据库

MySQL（四张表：users / posts / tags / article_tags）

缓存

Redis（列表缓存 + 详情缓存 + 缓存清除）

AI（可选）

火山引擎 Ark ChatCompletion API

本地备选降级（避免网络失败）

三、项目结构
BLOG/
├── backend/
│   ├── src/
│   │   ├── server.js              # Express 主入口
│   │   ├── db.js                  # MySQL 连接池
│   │   ├── redisClient.js         # Redis 客户端
│   │   ├── aiWriter.js            # AI 写作助手
│   │   ├── middleware/
│   │   │     └── auth.js          # JWT 鉴权中间件
│   │   └── routes/
│   │         ├── auth.js          # 登录 / 注册
│   │         └── posts.js         # 文章 CRUD
│   └── .env
│
└── frontend/
    ├── app.vue                     # Nuxt 主组件
    ├── nuxt.config.ts              # Nuxt 配置
    ├── app/composables/
    │       └── useAuthUser.ts      # 前端登录态管理
    ├── app/pages/
    │       ├── index.vue           # SSR 首页
    │       ├── posts/[id].vue      # 文章详情页（SSR）
    │       └── admin/
    │             ├── login.vue     # 登录页
    │             ├── register.vue  # 注册页
    │             ├── new.vue       # 新建文章（AI 写作）
    │             ├── list.vue      # 后台文章管理
    │             └── edit/[id].vue # 编辑文章
    ├── plugins/
    │       ├── fetch-error-handle.client.js
    │       └── fetch-error-handle.server.js
    └── public/

四、核心功能说明
1. 用户系统（注册 / 登录 / 鉴权）

注册：POST /api/auth/register

登录：POST /api/auth/login

密码加密（bcrypt）

JWT 登录态（后端认证 + 前端持久化）

登录后自动带上 Authorization 头

未登录无法访问后台接口

2. 前台文章功能（SSR）
文章列表（SSR）

服务端渲染，提高 SEO

排序（按时间 / 阅读量）

标签筛选

分页

SSR 失败自动降级为客户端加载

文章详情（SSR）

阅读量自动 +1（Redis）

支持标签点击跳转

详情缓存（30 秒）

3. 后台文章管理

新建文章（支持 AI 自动生成内容）

编辑文章（标题 / 摘要 / 标签 / 正文 / 状态）

删除文章

批量删除文章

列表分页 / 排序

4. AI 自动写作助手

输入：

{
  "title": "SSR 博客系统设计",
  "keywords": "Nuxt3,Redis,Express"
}


返回：

自动摘要 summary

自动正文 content

AI 调用失败时自动降级到本地生成。

5. Redis 缓存策略
内容	描述	TTL
列表缓存	分页 + 标签 + 排序	60s
详情缓存	单篇文章缓存	30s
增删改文章	自动清空缓存	-
6. HTTP 协商缓存（ETag）

内容无变化 → 返回 304

大幅减少服务端压力

五、数据库结构设计
users 表
字段	类型	说明
id	INT	主键
username	VARCHAR	登录名
password	VARCHAR	加密密码
nickname	VARCHAR	昵称
created_at	TIMESTAMP	创建时间
posts 表
字段	类型
id	INT
title	VARCHAR
author_id	INT
summary	TEXT
content	LONGTEXT
tags	VARCHAR
status	ENUM('published','draft')
view_count	INT
is_deleted	TINYINT
created_at	TIMESTAMP
updated_at	TIMESTAMP
tags / article_tags（多对多）
六、API 文档（简要）
用户
注册

POST /api/auth/register

登录

POST /api/auth/login

返回：

{
  "token": "JWT_VALUE",
  "user": { "id": 1, "username": "test" }
}

文章
获取文章列表

GET /api/posts

获取详情

GET /api/posts/:id

新建文章

POST /api/posts

编辑文章

PUT /api/posts/:id

删除文章

DELETE /api/posts/:id

批量删除

DELETE /api/posts

AI 自动生成

POST /api/posts/ai-generate

七、运行方式
1. 启动后端
cd backend
npm install
npm run dev


访问地址 → http://localhost:3001

2. 启动前端
cd frontend
npm install
npm run dev


访问地址 → http://localhost:3000

八、环境变量模板（backend/.env）
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=123456
MYSQL_DB=ssr_blog

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

JWT_SECRET=your_jwt_secret

AI_API_KEY=xxx
AI_ENDPOINT=https://ark.cn-beijing.volces.com/api/v3/chat

九、未来扩展方向

Markdown 编辑器

图片上传（OSS）

评论系统

用户角色权限

Docker 一键部署

十、总结

本项目实现：

SSR 渲染

用户认证系统

完整文章 CRUD

Redis 缓存

AI 写作助手

后台管理系统
