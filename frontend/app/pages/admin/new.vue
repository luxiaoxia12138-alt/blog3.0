<template>
  <div class="container">
    <h2>新建文章</h2>

    <!-- 标题 -->
    <div class="field">
      <label>标题：</label>
      <input v-model="form.title" placeholder="请输入文章标题" />
    </div>

    <!-- 作者 -->
    <div class="field">
      <label>作者：</label>
      <input v-model="form.author" placeholder="请输入作者名称，比如：张三" />
    </div>

    <!-- AI 关键词 -->
    <div class="field">
      <label>关键词（可选，用于 AI 写作）：</label>
      <input
        v-model="aiKeywords"
        placeholder="比如：SSR、Nuxt、Redis、性能优化"
      />
    </div>

    <!-- AI 写作助手 -->
    <div class="field ai-block">
      <button type="button" @click="handleAIGenerate" :disabled="aiLoading">
        {{ aiLoading ? "AI 正在生成..." : "✨ 使用 AI 生成文章草稿" }}
      </button>
      <p class="ai-tip">
        使用方法：先填写标题（必填），可以补充一些关键词，再点击上面的按钮，AI
        会帮你生成正文和摘要。
      </p>
      <p v-if="aiError" class="ai-error">AI 生成失败：{{ aiError }}</p>
    </div>

    <!-- 摘要 -->
    <div class="field">
      <label>摘要：</label>
      <textarea
        v-model="form.summary"
        rows="3"
        placeholder="可以手写，也可以直接使用 AI 生成的摘要"
      />
    </div>

    <!-- 正文 -->
    <div class="field">
      <label>正文：</label>
      <textarea
        v-model="form.content"
        rows="12"
        placeholder="AI 会生成一篇草稿，你也可以自己写或修改"
      />
    </div>

    <!-- 标签 -->
    <div class="field">
      <label>标签（用英文逗号分隔）：</label>
      <input v-model="form.tags" placeholder="比如：SSR,Nuxt,练习" />
    </div>

    <!-- 状态 -->
    <div class="field">
      <label>状态：</label>
      <select v-model="form.status">
        <option value="published">发布</option>
        <option value="draft">草稿</option>
      </select>
    </div>

    <!-- 提交结果提示 -->
    <p v-if="message" class="submit-msg">{{ message }}</p>

    <!-- 操作按钮 -->
    <div class="actions">
      <button type="button" @click="submit" :disabled="submitting">
        {{ submitting ? "提交中..." : "提交文章" }}
      </button>
      <NuxtLink to="/" class="back-link">返回前台首页</NuxtLink>
    </div>
  </div>
</template>

<script setup>
const config = useRuntimeConfig();
const router = useRouter();

// 表单数据
const form = reactive({
  title: "",
  author: "", // ⭐ 作者字段加回来
  summary: "",
  content: "",
  tags: "",
  status: "published",
});

// AI 写作助手状态
const aiKeywords = ref("");
const aiLoading = ref(false);
const aiError = ref("");

// 提交相关状态
const submitting = ref(false);
const message = ref("");

// 调用后端 AI 接口
const handleAIGenerate = async () => {
  aiError.value = "";
  console.log("[AI] 点击按钮");

  if (!form.title || !form.title.trim()) {
    aiError.value = "请先填写标题，再使用 AI 生成。";
    return;
  }

  aiLoading.value = true;
  try {
    const result = await $fetch(`${config.public.apiBase}/posts/ai-generate`, {
      method: "POST",
      body: {
        title: form.title,
        keywords: aiKeywords.value,
      },
    });

    console.log("[AI] 接口返回：", result);

    if (result.summary) {
      form.summary = result.summary;
    }
    if (result.content) {
      form.content = result.content;
    }

    if (!result.summary && !result.content) {
      aiError.value = "AI 返回内容为空，请稍后重试。";
    }
  } catch (err) {
    console.error("[AI] 生成失败", err);
    aiError.value =
      err?.data?.message || err?.message || "AI 写作助手调用失败，请稍后重试。";
  } finally {
    aiLoading.value = false;
  }
};

// 提交文章
const submit = async () => {
  message.value = "";
  submitting.value = true;
  try {
    await $fetch(`${config.public.apiBase}/posts`, {
      method: "POST",
      body: form, // 这里会把 author 一起传给后端
    });
    message.value = "文章提交成功！";
    // 如果你之前提交完会跳转后台列表，可以放开这行：
    // router.push('/admin/list')
  } catch (err) {
    console.error("提交失败", err);
    message.value =
      "提交失败：" + (err?.data?.message || err?.message || "未知错误");
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 40px auto;
  padding: 24px 32px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

h2 {
  font-size: 22px;
  margin-bottom: 16px;
}

.field {
  margin-bottom: 16px;
}

label {
  display: block;
  font-size: 14px;
  margin-bottom: 4px;
}

input,
textarea,
select {
  width: 100%;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  font-size: 14px;
  box-sizing: border-box;
}

.ai-block button {
  padding: 6px 12px;
  background: #10b981;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.ai-block button[disabled] {
  opacity: 0.7;
  cursor: not-allowed;
}

.ai-tip {
  font-size: 12px;
  color: #6b7280;
  margin-top: 6px;
}

.ai-error {
  font-size: 12px;
  color: #ef4444;
  margin-top: 6px;
}

.submit-msg {
  font-size: 13px;
  margin: 8px 0;
  color: #16a34a;
}

.actions {
  margin-top: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.actions > button {
  padding: 6px 12px;
  background: #409eff;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.actions > button[disabled] {
  opacity: 0.7;
  cursor: not-allowed;
}

.back-link {
  font-size: 13px;
  color: #6b7280;
  text-decoration: underline;
}
</style>
