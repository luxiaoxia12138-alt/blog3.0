<template>
  <div class="container">
    <button class="back-btn" @click="goBack">返回列表</button>

    <!-- ===== 整页优先判断：降级模式 ===== -->
    <template v-if="ssrFailed">
      <!-- 浏览器端重试也失败 -->
      <div v-if="clientError" class="fallback">
        <p>文章内容暂时加载失败，请检查网络或稍后重试。</p>
        <p class="error-msg">错误信息：{{ clientErrorMessage }}</p>
        <button @click="reloadOnClient">刷新重试</button>
      </div>

      <!-- SSR 阶段 / 浏览器正在重试：骨架屏 -->
      <div v-else class="skeleton">
        <p class="fallback-tip">
          当前为降级模式：服务端获取文章失败，正在由浏览器尝试加载数据...
        </p>
        <div class="skeleton-title"></div>
        <div class="skeleton-meta"></div>
        <div class="skeleton-line" v-for="n in 6" :key="n"></div>
      </div>
    </template>

    <!-- ===== 正常模式 ===== -->
    <template v-else>
      <div v-if="pending && !data">加载中...</div>

      <div v-else-if="!data">暂无内容</div>

      <div v-else class="post-detail">
        <h1>{{ data.title }}</h1>
        <p class="meta">
          作者：{{ data.author || "匿名" }} ｜ 发布于：{{
            formatDate(data.created_at)
          }}
          ｜ 阅读：{{ data.view_count }}
        </p>

        <p class="tags" v-if="data.tags && data.tags.length">
          标签：
          <span v-for="tag in data.tags.split(',')" :key="tag" class="tag">
            {{ tag }}
          </span>
        </p>

        <div class="content">
          <p v-for="(line, index) in contentLines" :key="index">
            {{ line }}
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
const route = useRoute();
const router = useRouter();
const config = useRuntimeConfig();

const id = computed(() => route.params.id);

// 降级状态
const ssrFailed = ref(false);
const clientError = ref(null);
const clientErrorMessage = computed(() =>
  clientError.value
    ? String(clientError.value?.message || clientError.value)
    : ""
);

// SSR 预取文章详情
const { data, pending } = await useAsyncData(
  () => `post-${id.value}`,
  async () => {
    try {
      const resp = await $fetch(`${config.public.apiBase}/posts/${id.value}`);
      return resp;
    } catch (err) {
      // SSR 阶段失败：标记降级，不抛错
      ssrFailed.value = true;
      return null;
    }
  },
  {
    watch: [id],
  }
);

// 正文按行拆分显示
const contentLines = computed(() => {
  if (!data.value || !data.value.content) return [];
  return String(data.value.content)
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
});

// 浏览器端重试（降级恢复）
const reloadOnClient = async () => {
  clientError.value = null;
  try {
    const result = await $fetch(`${config.public.apiBase}/posts/${id.value}`);
    data.value = result;
    ssrFailed.value = false;
  } catch (err) {
    clientError.value = err;
  }
};

// 挂载后，如果 SSR 没拿到数据，自动走一次 CSR
onMounted(async () => {
  if (ssrFailed.value || !data.value) {
    await reloadOnClient();
  }
});

const goBack = () => {
  router.push("/");
};

const formatDate = (str) => {
  return new Date(str).toLocaleString();
};
</script>

<style scoped>
body {
  background: #f5f5f7;
}

.container {
  max-width: 900px;
  margin: 40px auto;
  padding: 24px 32px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.back-btn {
  margin-bottom: 16px;
  padding: 6px 12px;
  background: #409eff;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.post-detail h1 {
  font-size: 24px;
  margin-bottom: 8px;
}

.meta {
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 10px;
}

.tags {
  margin-bottom: 16px;
  font-size: 13px;
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  background: #eff6ff;
  color: #1d4ed8;
  margin-right: 6px;
  margin-top: 4px;
}

.content p {
  margin-bottom: 10px;
  line-height: 1.7;
  font-size: 14px;
  color: #374151;
}

/* 骨架和降级提示沿用之前的 */
.skeleton {
  margin-top: 8px;
}

.fallback-tip {
  font-size: 13px;
  color: #999;
  margin-bottom: 12px;
}

.skeleton-title {
  width: 70%;
  height: 24px;
  background: #eee;
  border-radius: 4px;
  margin-bottom: 8px;
}

.skeleton-meta {
  width: 40%;
  height: 14px;
  background: #f0f0f0;
  border-radius: 4px;
  margin-bottom: 16px;
}

.skeleton-line {
  width: 100%;
  height: 12px;
  background: #f5f5f5;
  border-radius: 4px;
  margin-bottom: 8px;
}

.fallback {
  margin-top: 16px;
  padding: 12px;
  border-radius: 6px;
  background: #fff7e6;
  border: 1px solid #ffd591;
}

.error-msg {
  font-size: 12px;
  color: #ff4d4f;
  margin: 4px 0 8px;
}
</style>
