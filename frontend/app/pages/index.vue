<template>
  <div class="page">
    <!-- 顶部介绍区域 -->
    <section class="hero">
      <div class="hero-main">
        <p class="hero-label">Nuxt SSR · Express · MySQL · Redis</p>
        <h1 class="hero-title">博客系统</h1>
        <p class="hero-subtitle">搭配了ai写作助手的博客系统，欢迎使用！</p>
      </div>
      <div class="hero-side">
        <div class="hero-metric">
          <span class="metric-label">文章总数</span>
          <span class="metric-value">{{ pagination.total }}</span>
        </div>
        <div class="hero-metric">
          <span class="metric-label">当前页</span>
          <span class="metric-value">{{ pagination.page }}</span>
        </div>
        <NuxtLink to="/admin/new" class="hero-button"> ✨ 发布新文章 </NuxtLink>
      </div>
    </section>

    <!-- 工具栏：排序 + 当前筛选 -->
    <section class="toolbar">
      <div class="toolbar-left">
        <span class="toolbar-label">排序：</span>
        <button
          class="sort-btn"
          :class="{ active: sort === 'time' }"
          @click="changeSort('time')"
        >
          按时间
        </button>
        <button
          class="sort-btn"
          :class="{ active: sort === 'views' }"
          @click="changeSort('views')"
        >
          按阅读量
        </button>
      </div>

      <div class="toolbar-right" v-if="currentTag">
        <span class="tag-chip active">
          当前标签：{{ currentTag }}
          <button class="tag-chip-close" @click="clearTag">×</button>
        </span>
      </div>
    </section>

    <!-- 标签云（从当前文章里收集） -->
    <section v-if="allTags.length" class="tags-cloud">
      <span class="tags-title">快速筛选标签：</span>
      <button
        v-for="tag in allTags"
        :key="tag"
        class="tag-chip"
        :class="{ active: tag === currentTag }"
        @click="filterByTag(tag)"
      >
        # {{ tag }}
      </button>
    </section>

    <!-- 内容区域：SSR / 降级 / 列表 -->
    <section class="content">
      <!-- SSR 请求失败降级提示（可选） -->
      <div v-if="ssrFailed" class="error-box">
        <h3>😢 服务器获取文章失败</h3>
        <p>你仍然可以点击下方按钮重新尝试从客户端加载数据。</p>
        <button class="hero-button" @click="reloadClient">重新加载</button>
      </div>

      <!-- 正常列表 -->
      <div v-else>
        <div v-if="pending" class="loading">加载文章中...</div>

        <div v-else>
          <div v-if="posts.length === 0" class="empty">
            暂无文章，可以先去后台发布一篇。
          </div>

          <div class="posts-list">
            <article v-for="post in posts" :key="post.id" class="post-card">
              <div class="post-main">
                <NuxtLink :to="`/posts/${post.id}`" class="post-title">
                  {{ post.title }}
                </NuxtLink>
                <p class="post-summary">
                  {{ post.summary || "这篇文章暂时没有摘要。" }}
                </p>
              </div>

              <div class="post-meta">
                <div class="post-meta-left">
                  <span class="meta-item">
                    👤 {{ post.author || "匿名" }}
                  </span>
                  <span class="meta-dot">·</span>
                  <span class="meta-item">
                    📅 {{ formatDate(post.created_at) }}
                  </span>
                  <span class="meta-dot">·</span>
                  <span class="meta-item">
                    👁️ {{ post.view_count }} 次浏览
                  </span>
                </div>
                <div class="post-meta-right">
                  <button
                    v-for="tag in splitTags(post.tags)"
                    :key="tag"
                    class="tag-chip small"
                    @click="filterByTag(tag)"
                  >
                    # {{ tag }}
                  </button>
                </div>
              </div>
            </article>
          </div>

          <!-- 分页 -->
          <div v-if="pagination.total > pagination.pageSize" class="pagination">
            <button
              :disabled="pagination.page <= 1"
              @click="goPage(pagination.page - 1)"
            >
              上一页
            </button>
            <span>第 {{ pagination.page }} / {{ totalPages }} 页</span>
            <button
              :disabled="pagination.page >= totalPages"
              @click="goPage(pagination.page + 1)"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
const config = useRuntimeConfig();
const route = useRoute();
const router = useRouter();

// 当前页、标签、排序
const page = computed(() => Number(route.query.page || 1));
const currentTag = computed(() => route.query.tag || "");
const sort = computed(() => route.query.sort || "time");

const ssrFailed = ref(false);

// SSR 获取文章列表
const { data, pending, refresh } = await useAsyncData(
  () => `posts-page-${page.value}-tag-${currentTag.value}-sort-${sort.value}`,
  async () => {
    try {
      const resp = await $fetch(`${config.public.apiBase}/posts`, {
        query: {
          page: page.value,
          pageSize: 5,
          tag: currentTag.value,
          sort: sort.value,
        },
      });
      ssrFailed.value = false;
      return resp;
    } catch (err) {
      console.error("SSR 获取文章失败：", err);
      ssrFailed.value = true;
      return { list: [], pagination: { page: 1, pageSize: 5, total: 0 } };
    }
  },
  {
    watch: [page, currentTag, sort],
  }
);

const posts = computed(() => data.value?.list || []);
const pagination = computed(
  () =>
    data.value?.pagination || {
      page: 1,
      pageSize: 5,
      total: 0,
    }
);
const totalPages = computed(() =>
  Math.max(
    1,
    Math.ceil(pagination.value.total / pagination.value.pageSize || 1)
  )
);

// 从所有文章中收集标签，用于标签云
const allTags = computed(() => {
  const set = new Set();
  for (const p of posts.value) {
    if (!p.tags) continue;
    p.tags
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((t) => set.add(t));
  }
  return Array.from(set);
});

const splitTags = (tagsStr) => {
  if (!tagsStr) return [];
  return tagsStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

// 跳页
const goPage = (p) => {
  router.push({
    query: {
      page: p,
      sort: sort.value,
      ...(currentTag.value ? { tag: currentTag.value } : {}),
    },
  });
};

// 切换排序
const changeSort = (newSort) => {
  router.push({
    query: {
      page: 1,
      sort: newSort,
      ...(currentTag.value ? { tag: currentTag.value } : {}),
    },
  });
};

// 筛选标签
const filterByTag = (tag) => {
  router.push({
    query: {
      page: 1,
      tag,
      sort: sort.value,
    },
  });
};

const clearTag = () => {
  router.push({
    query: {
      page: 1,
      sort: sort.value,
    },
  });
};

// 降级模式下客户端重新拉一遍
const reloadClient = async () => {
  try {
    await refresh();
  } catch (err) {
    console.error("客户端重新加载失败：", err);
  }
};

// 时间格式
const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
</script>

<style scoped>
.page {
  max-width: 1080px;
  margin: 0 auto;
}

/* 顶部区域 */
.hero {
  display: grid;
  grid-template-columns: minmax(0, 2.3fr) minmax(0, 1fr);
  gap: 18px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 18px;
  padding: 18px 20px;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.12);
  border: 1px solid rgba(148, 163, 184, 0.25);
  margin-bottom: 18px;
}

.hero-main {
  padding-right: 8px;
}

.hero-label {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  color: #0369a1;
  background: #e0f2fe;
  padding: 2px 8px;
  border-radius: 999px;
  margin-bottom: 4px;
}

.hero-title {
  font-size: 26px;
  margin: 4px 0;
  letter-spacing: 0.04em;
}

.hero-subtitle {
  font-size: 14px;
  color: #4b5563;
  line-height: 1.6;
}

.hero-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  justify-content: center;
}

.hero-metric {
  background: #0f172a;
  color: #e5e7eb;
  border-radius: 14px;
  padding: 8px 12px;
  min-width: 120px;
}

.metric-label {
  font-size: 11px;
  opacity: 0.7;
}

.metric-value {
  display: block;
  font-size: 18px;
  font-weight: 600;
}

.hero-button {
  margin-top: 4px;
  padding: 7px 14px;
  border-radius: 999px;
  border: none;
  background: #22c55e;
  color: #052e16;
  font-size: 13px;
  cursor: pointer;
  text-decoration: none;
  font-weight: 500;
}

.hero-button:hover {
  background: #16a34a;
}

/* 工具栏 */
.toolbar {
  margin: 14px 0 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.toolbar-label {
  color: #4b5563;
}

.toolbar-right {
  display: flex;
  align-items: center;
}

/* 排序按钮 */
.sort-btn {
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  font-size: 13px;
  cursor: pointer;
  color: #555;
  transition: all 0.15s ease;
}

.sort-btn:hover {
  background: #eef6ff;
  border-color: #93c5fd;
}

.sort-btn.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #fff;
}

/* 标签云 */
.tags-cloud {
  margin-bottom: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  font-size: 13px;
}

.tags-title {
  font-weight: 500;
  color: #4b5563;
}

/* 标签样式 */
.tag-chip {
  border-radius: 999px;
  padding: 3px 10px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  font-size: 12px;
  color: #4b5563;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tag-chip.small {
  padding: 2px 8px;
  font-size: 11px;
}

.tag-chip:hover {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.tag-chip.active {
  background: #1d4ed8;
  border-color: #1d4ed8;
  color: #f9fafb;
}

.tag-chip-close {
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  margin-left: 4px;
}

/* 内容区 */
.content {
  margin-top: 4px;
}

/* 错误/加载/空列表 */
.error-box {
  padding: 18px;
  border-radius: 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #7f1d1d;
  text-align: left;
}

.loading {
  padding: 18px 0;
  text-align: center;
  color: #6b7280;
}

.empty {
  padding: 24px 0;
  text-align: center;
  color: #9ca3af;
}

/* 文章列表 */
.posts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.post-card {
  background: #ffffff;
  border-radius: 14px;
  padding: 12px 14px;
  border: 1px solid rgba(209, 213, 219, 0.9);
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.06);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.post-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  text-decoration: none;
}

.post-title:hover {
  color: #2563eb;
}

.post-summary {
  margin: 2px 0 0;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.6;
}

.post-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.post-meta-left {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6b7280;
}

.meta-dot {
  color: #d1d5db;
}

.post-meta-right {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* 分页 */
.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: center;
  gap: 12px;
  align-items: center;
  font-size: 14px;
}

.pagination button {
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid #d1d5db;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
}

.pagination button[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 响应式 */
@media (max-width: 768px) {
  .hero {
    grid-template-columns: minmax(0, 1fr);
  }

  .hero-side {
    align-items: flex-start;
  }

  .toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .post-card {
    padding: 10px 10px;
  }

  .app-main {
    padding: 16px 10px 32px;
  }
}
</style>
