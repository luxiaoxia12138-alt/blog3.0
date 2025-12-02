<template>
  <div class="page">
    <div class="article-layout" v-if="post">
      <div class="article-main">
        <NuxtLink to="/" class="back-link">← 返回首页</NuxtLink>

        <p class="article-tagline">博客 · 文章详情</p>
        <h1 class="article-title">{{ post.title }}</h1>

        <div class="article-meta">
          <span>👤 {{ post.author || "匿名" }}</span>
          <span>·</span>
          <span>📅 {{ formatDate(post.created_at) }}</span>
          <span>·</span>
          <span>👁️ {{ post.view_count }} 次浏览</span>
        </div>

        <div v-if="tags && tags.length" class="article-tags">
          <button
            v-for="tag in tags"
            :key="tag"
            class="tag-chip"
            @click="goTag(tag)"
          >
            # {{ tag }}
          </button>
        </div>

        <div class="article-content">
          <p v-if="post.summary" class="article-summary">
            {{ post.summary }}
          </p>
          <div class="article-body">
            <!-- 简单按换行拆段落 -->
            <p
              v-for="(line, idx) in splitLines(post.content)"
              :key="idx"
              class="article-paragraph"
            >
              {{ line }}
            </p>
          </div>
        </div>
      </div>

      <aside class="article-side">
        <div class="side-card">
          <h3>文章信息</h3>
          <ul>
            <li>
              <span>状态：</span>
              <span>{{ post.status === "published" ? "已发布" : "草稿" }}</span>
            </li>
            <li>
              <span>创建时间：</span>
              <span>{{ formatDateTime(post.created_at) }}</span>
            </li>
            <li>
              <span>最后更新：</span>
              <span>{{
                formatDateTime(post.updated_at || post.created_at)
              }}</span>
            </li>
          </ul>
        </div>

        <div class="side-card side-tip">
          <h3>提示</h3>
          <p>
            本页面由 Nuxt 3 在服务端预渲染生成，首屏加载更快，对 SEO 更友好。
          </p>
        </div>
      </aside>
    </div>

    <div v-else class="loading-area">
      <p v-if="pending">正在加载文章...</p>
      <p v-else>未找到该文章，可能已经被删除。</p>
      <NuxtLink to="/" class="back-link">返回首页</NuxtLink>
    </div>
  </div>
</template>

<script setup>
const config = useRuntimeConfig();
const route = useRoute();
const router = useRouter();

const id = computed(() => route.params.id);

const { data, pending } = await useAsyncData(
  () => `post-detail-${id.value}`,
  async () => {
    try {
      const resp = await $fetch(`${config.public.apiBase}/posts/${id.value}`);
      return resp;
    } catch (err) {
      console.error("获取文章详情失败：", err);
      return null;
    }
  }
);

const post = computed(() => data.value || null);

const tags = computed(() => {
  if (!post.value?.tags) return [];
  return post.value.tags
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
});

const splitLines = (content) => {
  if (!content) return [];
  return String(content)
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
};

const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatDateTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${mm}`;
};

const goTag = (tag) => {
  router.push({
    path: "/",
    query: {
      page: 1,
      tag,
      sort: "time",
    },
  });
};
</script>

<style scoped>
.page {
  max-width: 1080px;
  margin: 0 auto;
}

.article-layout {
  display: grid;
  grid-template-columns: minmax(0, 2.3fr) minmax(0, 0.9fr);
  gap: 18px;
}

.article-main {
  background: #ffffff;
  border-radius: 18px;
  padding: 18px 22px;
  border: 1px solid rgba(209, 213, 219, 0.9);
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.12);
}

.back-link {
  display: inline-block;
  margin-bottom: 4px;
  font-size: 13px;
  color: #2563eb;
  text-decoration: none;
}

.back-link:hover {
  text-decoration: underline;
}

.article-tagline {
  font-size: 12px;
  color: #0369a1;
  background: #e0f2fe;
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  margin-bottom: 6px;
}

.article-title {
  font-size: 26px;
  margin: 4px 0 8px;
}

.article-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 13px;
  color: #6b7280;
}

.article-tags {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* 标签 chip */
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

.tag-chip:hover {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.article-content {
  margin-top: 14px;
}

.article-summary {
  padding: 10px 12px;
  border-left: 3px solid #38bdf8;
  background: #f0f9ff;
  color: #0f172a;
  font-size: 14px;
  border-radius: 8px;
}

.article-body {
  margin-top: 16px;
  font-size: 15px;
  line-height: 1.8;
  color: #111827;
}

.article-paragraph {
  margin: 0 0 12px;
}

/* 侧边栏 */
.article-side {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.side-card {
  background: #ffffff;
  border-radius: 14px;
  padding: 14px 16px;
  border: 1px solid rgba(209, 213, 219, 0.9);
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
  font-size: 13px;
}

.side-card h3 {
  margin: 0 0 8px;
  font-size: 14px;
}

.side-card ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.side-card li {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 4px;
}

.side-card li span:first-child {
  color: #6b7280;
}

.side-tip p {
  margin: 4px 0 0;
  color: #4b5563;
}

.loading-area {
  max-width: 600px;
  margin: 40px auto;
  text-align: center;
  color: #6b7280;
}

/* 响应式 */
@media (max-width: 768px) {
  .article-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .article-main {
    padding: 14px 14px;
  }
}
</style>
