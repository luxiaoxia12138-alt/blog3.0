<template>
  <div class="container">
    <div class="header">
      <h2>后台文章管理</h2>
      <NuxtLink to="/admin/new" class="btn-primary">+ 新建文章</NuxtLink>
    </div>

    <!-- 操作栏：批量删除 -->
    <div class="toolbar">
      <button
        class="btn-danger"
        :disabled="selectedIds.length === 0 || deletingBatch"
        @click="handleBatchDelete"
      >
        {{
          deletingBatch ? "批量删除中..." : `批量删除 (${selectedIds.length})`
        }}
      </button>

      <div class="toolbar-right">
        <span>排序：</span>
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
    </div>

    <!-- 提示信息 -->
    <p v-if="message" class="message">{{ message }}</p>

    <!-- 加载中 -->
    <div v-if="pending" class="loading">加载中...</div>

    <!-- 列表 -->
    <table v-else class="table">
      <thead>
        <tr>
          <th>
            <input
              type="checkbox"
              :checked="isAllSelected"
              @change="toggleSelectAll"
            />
          </th>
          <th>ID</th>
          <th>标题</th>
          <th>作者</th>
          <th>状态</th>
          <th>标签</th>
          <th>阅读量</th>
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!list || list.length === 0">
          <td colspan="9" class="empty">暂无文章</td>
        </tr>
        <tr v-for="post in list" :key="post.id">
          <td>
            <input type="checkbox" :value="post.id" v-model="selectedIds" />
          </td>
          <td>{{ post.id }}</td>
          <td>
            <!-- 点击标题跳到前台详情页 -->
            <NuxtLink :to="`/posts/${post.id}`" class="title-link">
              {{ post.title }}
            </NuxtLink>
          </td>
          <td>{{ post.author || "匿名" }}</td>
          <td>
            <span
              class="status-pill"
              :class="
                post.status === 'published'
                  ? 'status-published'
                  : 'status-draft'
              "
            >
              {{ post.status === "published" ? "发布" : "草稿" }}
            </span>
          </td>
          <td>{{ post.tags }}</td>
          <td>{{ post.view_count }}</td>
          <td>{{ formatDate(post.created_at) }}</td>
          <td>
            <button class="link-button" @click="goEdit(post.id)">编辑</button>
            <button
              class="link-button danger"
              :disabled="deletingId === post.id"
              @click="handleDelete(post.id)"
            >
              {{ deletingId === post.id ? "删除中..." : "删除" }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 分页 -->
    <div
      v-if="pagination && pagination.total > pagination.pageSize"
      class="pagination"
    >
      <button
        :disabled="pagination.page <= 1"
        @click="goPage(pagination.page - 1)"
      >
        上一页
      </button>
      <span>第 {{ pagination.page }} 页 / 共 {{ totalPages }} 页</span>
      <button
        :disabled="pagination.page >= totalPages"
        @click="goPage(pagination.page + 1)"
      >
        下一页
      </button>
    </div>
  </div>
</template>

<script setup>
const config = useRuntimeConfig();
const route = useRoute();
const router = useRouter();
const authUser = useAuthUser();
if (process.client) {
  // 如果内存中没有用户，尝试从后端获取
  if (!authUser.value) {
    try {
      const res = await $fetch("http://localhost:3001/api/auth/me", {
        credentials: "include",
      });
      authUser.value = res.user;
    } catch (e) {
      // 没登录 → 跳转到登录页
      router.push("/admin/login");
    }
  }
}
// 当前页 & 排序，从 URL query 解析
const page = computed(() => Number(route.query.page || 1));
const sort = computed(() => route.query.sort || "time");

// 选择状态
const selectedIds = ref([]); // 勾选的文章 ID
const deletingId = ref(null); // 正在删除的单篇 ID
const deletingBatch = ref(false);
const message = ref("");

// 从后端获取文章列表（使用已有的 /api/posts 列表接口）
const { data, pending, refresh } = await useAsyncData(
  () => `admin-posts-${page.value}-${sort.value}`,
  async () => {
    const resp = await $fetch(`${config.public.apiBase}/posts`, {
      query: {
        page: page.value,
        pageSize: 10,
        sort: sort.value,
        // 后端当前是只返回已发布文章，如果以后想看草稿，可以扩展 status 参数
      },
    });
    return resp;
  },
  {
    watch: [page, sort],
  }
);

const list = computed(() => data.value?.list || []);
const pagination = computed(
  () => data.value?.pagination || { page: 1, pageSize: 10, total: 0 }
);
const totalPages = computed(() =>
  Math.max(
    1,
    Math.ceil(pagination.value.total / pagination.value.pageSize || 1)
  )
);

// 全选勾选状态
const isAllSelected = computed(() => {
  if (!list.value.length) return false;
  const ids = list.value.map((p) => p.id);
  return ids.every((id) => selectedIds.value.includes(id));
});

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value = [];
  } else {
    selectedIds.value = list.value.map((p) => p.id);
  }
};

// 跳转分页
const goPage = (p) => {
  router.push({
    query: {
      page: p,
      sort: sort.value,
    },
  });
};

// 切换排序
const changeSort = (newSort) => {
  router.push({
    query: {
      page: 1,
      sort: newSort,
    },
  });
};

// 跳转编辑页（之后可以实现 /admin/edit/[id].vue）
const goEdit = (id) => {
  router.push(`/admin/edit/${id}`);
};

// 删除单篇文章
const handleDelete = async (id) => {
  if (!confirm(`确认删除文章 ID = ${id} 吗？`)) return;

  deletingId.value = id;
  message.value = "";
  try {
    await $fetch(`${config.public.apiBase}/posts/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    message.value = `文章 ${id} 删除成功`;
    // 删除成功后刷新列表
    selectedIds.value = selectedIds.value.filter((x) => x !== id);
    await refresh();
  } catch (err) {
    console.error("删除失败", err);
    message.value =
      "删除失败：" + (err?.data?.message || err?.message || "未知错误");
  } finally {
    deletingId.value = null;
  }
};

// 批量删除
const handleBatchDelete = async () => {
  if (!selectedIds.value.length) return;
  if (!confirm(`确认批量删除这 ${selectedIds.value.length} 篇文章吗？`)) return;

  deletingBatch.value = true;
  message.value = "";

  try {
    await $fetch(`${config.public.apiBase}/posts`, {
      method: "DELETE",
      body: {
        ids: selectedIds.value,
      },
      credentials: "include",
    });
    message.value = `批量删除成功，共删除 ${selectedIds.value.length} 篇`;
    selectedIds.value = [];
    await refresh();
  } catch (err) {
    console.error("批量删除失败", err);
    message.value =
      "批量删除失败：" + (err?.data?.message || err?.message || "未知错误");
  } finally {
    deletingBatch.value = false;
  }
};

// 时间格式化（简单版）
const formatDate = (value) => {
  if (!value) return "";
  try {
    const d = new Date(value);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(
      2,
      "0"
    )}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return String(value);
  }
};
</script>

<style scoped>
.container {
  max-width: 1000px;
  margin: 40px auto;
  padding: 24px 32px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

h2 {
  font-size: 22px;
  margin: 0;
}

.btn-primary {
  padding: 6px 14px;
  background: #2563eb;
  color: #fff;
  border-radius: 999px;
  text-decoration: none;
  font-size: 14px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.btn-danger {
  padding: 6px 12px;
  border-radius: 999px;
  border: none;
  background: #ef4444;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.btn-danger[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.sort-btn {
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid #d1d5db;
  background: #fff;
  font-size: 13px;
  cursor: pointer;
  color: #555;
  transition: all 0.2s ease;
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

.message {
  font-size: 13px;
  margin-bottom: 10px;
  color: #16a34a;
}

.loading {
  padding: 20px 0;
  text-align: center;
  color: #6b7280;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.table th,
.table td {
  padding: 8px 10px;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
  vertical-align: middle;
}

.table th {
  background: #f9fafb;
  font-weight: 500;
}

.empty {
  text-align: center;
  padding: 16px 0;
  color: #9ca3af;
}

.title-link {
  color: #2563eb;
  text-decoration: none;
}

.title-link:hover {
  text-decoration: underline;
}

.link-button {
  border: none;
  background: none;
  color: #2563eb;
  cursor: pointer;
  padding: 0 4px;
  font-size: 13px;
}

.link-button.danger {
  color: #ef4444;
}

.link-button[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}

.status-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
}

.status-published {
  background: #dcfce7;
  color: #166534;
}

.status-draft {
  background: #fef3c7;
  color: #92400e;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}

.pagination button {
  padding: 4px 10px;
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
</style>
