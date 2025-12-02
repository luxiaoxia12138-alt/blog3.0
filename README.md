# 📘 SSR 博客系统开发文档

项目名称：SSR Blog System  
技术栈：Nuxt3 + Express + MySQL + Redis + 火山引擎 AI  
作者：舒英杰

---

## 一、项目概述

本项目实现一个服务端渲染（SSR）博客系统，包括：

- 前台文章列表页（SSR）
- 前台文章详情页（SSR）
- 后台文章管理（新建 / 列表 / 删除 / 批量删除）
- AI 自动写作助手（火山引擎 + 本地降级）
- 完整文章 CRUD API
- MySQL 数据库（文章 / 用户 / 标签 / 多对多）
- Redis 缓存优化（列表缓存 + 详情缓存）
- HTTP 协商缓存（ETag）
- SSR 降级策略（服务端失败 → 客户端重试）

项目覆盖前后端全栈能力，是学习 SSR、高性能架构的优秀实践案例。

---

## 二、技术栈

### 前端（SSR）
- Nuxt 3（Vue 3）
- SSR + Hydration
- useAsyncData 服务端数据获取
- Tailwind 风格 CSS

### 后端
- Express
- RESTful API

### 数据库
- MySQL（四表结构：users / posts / tags / article_tags）

### 缓存
- Redis（列表缓存、详情缓存、缓存失效机制）

### AI
- 火山引擎 Ark ChatCompletion API
- 本地伪 AI 自动降级

---

## 三、项目结构

```
BLOG/
├── backend/
│   ├── src/
│   │   ├── server.js           # Express 入口
│   │   ├── db.js               # MySQL 连接
│   │   ├── redisClient.js      # Redis 客户端
│   │   ├── aiWriter.js         # AI 写作助手
│   │   └── routes/
│   │       └── posts.js        # 文章 API
│   ├── .env                    # 环境变量配置
│   └── package.json
│
└── frontend/
    ├── app.vue                 # 应用顶层布局
    ├── nuxt.config.ts          # Nuxt 配置
    └── app/pages/
         ├── index.vue          # SSR 首页文章列表
         ├── posts/[id].vue     # SSR 查看文章详情
         └── admin/
             ├── new.vue        # 新建文章（含 AI）
             └── list.vue       # 后台文章管理
```

---

## 四、核心功能

### 1. 文章列表页（SSR）
- 服务端渲染文章列表，提高首屏速度
- 支持分页 / 排序 / 标签筛选
- SSR 失败 → 客户端自动重试（降级）

### 2. 文章详情页（SSR）
- 展示全文、作者、标签、阅读量等
- 阅读量自动 +1（Redis 命中时异步更新）
- 标签可点击跳转列表页筛选

### 3. 后台管理（CRUD）
- **新建文章**（支持 AI 自动生成摘要 + 正文草稿）
- 管理列表（展示作者 / 状态 / 标签 / 阅读量）
- 单删 / 批量删除（逻辑删除）

### 4. AI 写作助手
- 输入标题与关键词 → 自动生成草稿
- 主调火山引擎 API

### 5. 缓存系统
- Redis 列表缓存：60 秒  
- Redis 详情缓存：30 秒  
- 写操作后自动 FLUSHALL

### 6. HTTP 协商缓存（ETag）
- 列表接口支持 ETag
- If-None-Match → 304 节省带宽

---

## 五、数据库设计

### users 表
| 字段 | 类型 |
|------|------|
| id | INT |
| username | VARCHAR |
| nickname | VARCHAR |
| created_at | TIMESTAMP |

### posts 表
| 字段 | 类型 |
|------|------|
| id | INT |
| title | VARCHAR |
| author_id | INT |
| summary | TEXT |
| content | LONGTEXT |
| tags | VARCHAR |
| status | ENUM('published','draft') |
| view_count | INT |
| is_deleted | TINYINT |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

### tags 表
| 字段 | 类型 |
|------|------|
| id | INT |
| name | VARCHAR UNIQUE |

### article_tags 表（多对多）
| 字段 | 类型 |
|------|------|
| article_id | INT |
| tag_id | INT |

---

## 六、后端 API 文档

### 获取文章列表
GET `/api/posts`

参数：

| 参数 | 说明 |
|------|------|
| page | 页码 |
| pageSize | 每页数量 |
| tag | 标签筛选 |
| sort | time / views |

特点：Redis 缓存 + ETag（304）

---

### 获取文章详情  
GET `/api/posts/:id`

特点：
- 阅读量自动 +1  
- Redis 命中时异步更新  

---

### 新增文章  
POST `/api/posts`

示例：

```json
{
  "title": "标题",
  "author": "作者名",
  "summary": "摘要内容",
  "content": "正文内容",
  "tags": "Vue,SSR",
  "status": "published"
}
```

---

### 修改文章  
PUT `/api/posts/:id`

字段同新增。

---

### 删除文章  
DELETE `/api/posts/:id`

---

### 批量删除  
DELETE `/api/posts`

```json
{ "ids": [1,2,3] }
```

---

### AI 自动生成文章  
POST `/api/posts/ai-generate`

```json
{
  "title": "SSR 博客系统设计",
  "keywords": "Nuxt,Express,Redis"
}
```

返回：

```json
{
  "summary": "...",
  "content": "..."
}
```

---

## 七、系统流程（架构说明）

### SSR 渲染流程

```
浏览器请求页面
→ Nuxt SSR useAsyncData 调后端 API
→ Redis 查询（命中则返回）
→ 否则查询 MySQL
→ 服务端渲染 HTML
→ 浏览器接收并 Hydration 激活交互
```

### 缓存策略

| 模块 | 类型 | TTL |
|------|------|------|
| 列表页 | Redis + ETag | 60 秒 |
| 详情页 | Redis | 30 秒 |
| 写操作 | 自动 FLUSHALL | - |

---

## 八、运行与构建

### 安装依赖
```bash
npm install
```

### 启动后端
```bash
cd backend
npm run dev
```
访问地址：`http://localhost:3001`

### 启动前端
```bash
cd frontend
npm run dev
```
访问地址：`http://localhost:3000`

---

