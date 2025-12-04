<template>
  <div class="page">
    <div class="container">
      <NuxtLink to="/admin/list" class="back-link">← 返回文章管理</NuxtLink>
      <h2>编辑文章（ID：{{ id }}）</h2>

      <p v-if="loading" class="hint">正在加载文章数据...</p>
      <p v-if="error" class="error">加载失败：{{ error }}</p>

      <form v-if="!loading" class="form" @submit.prevent="handleSave">
        <label class="field">
          <span>标题</span>
          <input v-model="form.title" type="text" required />
        </label>

        <label class="field">
          <span>摘要</span>
          <textarea v-model="form.summary" rows="2" />
        </label>

        <label class="field">
          <span>标签（逗号分隔）</span>
          <input v-model="form.tags" type="text" />
        </label>

        <label class="field">
          <span>状态</span>
          <select v-model="form.status">
            <option value="published">发布</option>
            <option value="draft">草稿</option>
          </select>
        </label>

        <label class="field">
          <span>正文</span>
          <textarea v-model="form.content" rows="14" />
        </label>

        <div class="actions">
          <button type="button" class="btn" @click="goBack">取消返回</button>
          <button type="submit" class="btn-primary" :disabled="saving">
            {{ saving ? "保存中..." : "保存修改" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
const config = useRuntimeConfig();
const route = useRoute();
const router = useRouter();

const id = computed(() => route.params.id);

const form = reactive({
  title: "",
  summary: "",
  tags: "",
  content: "",
  status: "published",
});

const loading = ref(true);
const saving = ref(false);
const error = ref("");

// 1. 进入页面时拉取文章详情，填充表单
try {
  const post = await $fetch(`${config.public.apiBase}/posts/${id.value}`);
  form.title = post.title || "";
  form.summary = post.summary || "";
  form.tags = post.tags || "";
  form.content = post.content || "";
  form.status = post.status || "published";
} catch (e) {
  console.error("加载文章失败", e);
  error.value = e?.data?.message || e?.message || "未知错误";
} finally {
  loading.value = false;
}

// 2. 保存修改（注意接口要和后端一致）
const handleSave = async () => {
  saving.value = true;
  error.value = "";
  try {
    await $fetch(`${config.public.apiBase}/posts/${id.value}`, {
      method: "PUT", // 如果后端用 PATCH/POST，就改成对应的
      body: form,
    });
    alert("保存成功！");
    router.push("/admin/list"); // 或者 "/admin"，看你列表路由
  } catch (e) {
    console.error("保存失败", e);
    error.value = e?.data?.message || e?.message || "未知错误";
    alert("保存失败，请查看控制台/接口返回");
  } finally {
    saving.value = false;
  }
};

const goBack = () => {
  router.push("/admin/list");
};
</script>

<style scoped>
.page {
  max-width: 1080px;
  margin: 0 auto;
}
.container {
  max-width: 800px;
  margin: 40px auto;
  padding: 24px 32px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}
.back-link {
  display: inline-block;
  margin-bottom: 8px;
  font-size: 13px;
  color: #2563eb;
  text-decoration: none;
}
.back-link:hover {
  text-decoration: underline;
}
h2 {
  margin: 0 0 16px;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field span {
  font-size: 14px;
  color: #4b5563;
}
input,
textarea,
select {
  border-radius: 8px;
  border: 1px solid #d1d5db;
  padding: 6px 8px;
  font-size: 14px;
}
textarea {
  resize: vertical;
}
.actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.btn {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid #d1d5db;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
}
.btn-primary {
  padding: 6px 14px;
  border-radius: 999px;
  border: none;
  background: #2563eb;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
}
.btn-primary[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}
.hint {
  font-size: 13px;
  color: #6b7280;
}
.error {
  font-size: 13px;
  color: #b91c1c;
}
</style>
