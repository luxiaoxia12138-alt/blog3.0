export default defineNuxtPlugin(() => {
  const originalFetch = globalThis.$fetch;

  globalThis.$fetch = async (url, options = {}) => {
    try {
      return await originalFetch(url, options);
    } catch (err) {
      return {
        __error: true,
        message: err?.message || "请求失败",
      };
    }
  };
});
