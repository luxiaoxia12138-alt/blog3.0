# 📘 SSR 博客系统开发文档

项目名称：SSR Blog System  
技术栈：Nuxt3 + Express + MySQL + Redis + 火山引擎 AI  
作者：舒英杰

---

## 一、项目概述

本项目实现一个服务端渲染（SSR）博客系统，包括：

- 前台文章列表页（SSR）
- 前台文章详情页（SSR）
- 用户系统（注册 / 登录 / 鉴权）
- 后台文章管理（新建 / 编辑 / 列表 / 删除 / 批量删除）
- AI 自动写作助手（火山引擎 + 本地降级）
- 完整文章 CRUD API
- MySQL 数据库（文章 / 用户 / 标签 / 多对多）
- Redis 缓存优化（列表缓存 + 详情缓存）
- HTTP 协商缓存（ETag）
- SSR 降级策略（服务端失败 → 客户端重试）



---

## 二、技术栈

### 前端（SSR）
- Nuxt 3（Vue 3）
- SSR + Hydration
- useAsyncData 服务端数据获取
- Tailwind 风格 CSS
- 前端登录态 composable
- client/server 错误处理插件

### 后端
- Express
- RESTful API
- JWT 用户鉴权
- 登录态中间件保护后台接口

### 数据库
- MySQL（users / posts / tags / article_tags）

### 缓存
- Redis 列表缓存、详情缓存、缓存清理机制

### AI
- 火山引擎 Ark ChatCompletion API
- 本地降级生成草稿

---

## 三、项目结构


BLOG/  
    backend/  
        src/  
            server.js              # Express 入口  
            db.js                  # MySQL  
            redisClient.js         # Redis  
            aiWriter.js            # AI 自动写作  
            middleware/  
                auth.js            # JWT 鉴权  
            routes/  
                auth.js            # 登录 / 注册  
                posts.js           # 文章 CRUD  
        .env  
    frontend/  
        app.vue  
        nuxt.config.ts  
        app/composables/useAuthUser.ts  
        app/pages/  
            index.vue              # SSR 首页  
            posts/[id].vue         # SSR 详情页  
            admin/  
                login.vue  
                register.vue  
                new.vue  
                list.vue  
                edit/[id].vue  
        plugins/  
            fetch-error-handle.client.js  
            fetch-error-handle.server.js  
        public/

---

## 四、核心功能说明

### 1. 用户系统（注册 / 登录 / 鉴权）

- 注册：POST /api/auth/register
- 登录：POST /api/auth/login
- 密码加密（bcrypt）
- 颁发 JWT
- 前端本地存储 token（localStorage + composable）
- 后端 auth 中间件校验登录态

---

### 2. 前台功能（SSR）

#### 文章列表
- SSR 渲染  
- 分页、排序（时间 / 浏览量）  
- 标签筛选  
- SSR 降级：失败时前端重新获取  

#### 文章详情
- SSR 渲染  
- Redis 缓存 30 秒  
- 阅读量 +1（异步更新）  
- 标签跳转  

---

### 3. 后台文章管理系统

- 新建文章（支持 AI 自动生成内容）
- 编辑文章
- 删除文章、批量删除文章
- 分页、排序、状态展示

---

### 4. AI 自动写作助手

示例请求：

    {
      "title": "SSR 博客系统设计",
      "keywords": "Nuxt3,Redis,Express"
    }

返回内容：
- 自动摘要 summary  
- 自动正文 content  

AI 失败 → 自动使用本地降级方案。

---

## 五、Redis 缓存策略

模块 | 内容 | TTL  
------|------|------  
列表缓存 | 分页 + 标签 + 排序组合缓存 | 60s  
详情缓存 | 单篇文章缓存 | 30s  
写操作 | 新建/编辑/删除后自动清空缓存 | -  

---

## 六、数据库结构

### users 表
字段 | 类型  
------|------  
id | INT  
username | VARCHAR  
password | VARCHAR（bcrypt 哈希）  
nickname | VARCHAR  
created_at | TIMESTAMP  

### posts 表
字段 | 类型  
------|------  
id | INT  
title | VARCHAR  
author_id | INT  
summary | TEXT  
content | LONGTEXT  
tags | VARCHAR  
status | ENUM('published','draft')  
view_count | INT  
is_deleted | TINYINT  
created_at | TIMESTAMP  
updated_at | TIMESTAMP  

---

## 七、API 文档（简要）

### 用户相关
注册：POST /api/auth/register  
登录：POST /api/auth/login  

响应示例：

    {
      "token": "JWT_TOKEN",
      "user": { "id": 1, "username": "admin" }
    }

### 文章相关
获取文章列表：GET /api/posts  
获取文章详情：GET /api/posts/:id  
新建文章：POST /api/posts  
编辑文章：PUT /api/posts/:id  
删除文章：DELETE /api/posts/:id  
批量删除：DELETE /api/posts  
AI 生成：POST /api/posts/ai-generate  

---

## 八、运行方式

### 1）启动后端

    cd backend
    npm install
    npm run dev

后端访问地址：  
http://localhost:3001

### 2）启动前端

    cd frontend
    npm install
    npm run dev

前端访问地址：  
http://localhost:3000

---

## 九、环境变量示例（backend/.env）

    MYSQL_HOST=localhost
    MYSQL_USER=root
    MYSQL_PASSWORD=123456
    MYSQL_DB=ssr_blog

    REDIS_HOST=127.0.0.1
    REDIS_PORT=6379

    JWT_SECRET=your_jwt_secret

    AI_API_KEY=xxx
    AI_ENDPOINT=https://ark.cn-beijing.volces.com/api/v3/chat

---


## 十、总结

本项目包含：

- SSR 渲染  
- 用户注册/登录/鉴权  
- 完整文章 CRUD  
- Redis 缓存  
- AI 自动写作助手  
- 后台管理系统  

