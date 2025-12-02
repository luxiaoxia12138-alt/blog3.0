export default defineNuxtPlugin(() => {
  const originalFetch = globalThis.$fetch;

  globalThis.$fetch = async (url, options = {}) => {
    try {
      return await originalFetch(url, options);
    } catch (err) {
      // ★ SSR 失败不让 Nuxt 整个崩掉
      return {
        __error: true,
        message: err?.message || "SSR 请求失败",
      };
    }
  };
});
