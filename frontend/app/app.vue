<template>
  <div class="app-root">
    <header class="app-header">
      <div class="app-header-inner">
        <NuxtLink to="/" class="logo">
          <span class="logo-dot"></span>
          博客
        </NuxtLink>

        <nav class="nav-links">
          <!-- 首页 永远显示 -->
          <NuxtLink to="/" class="nav-link">首页</NuxtLink>

          <template v-if="authUser">
            <NuxtLink to="/admin/list" class="nav-link">后台管理</NuxtLink>
            <NuxtLink to="/admin/new" class="nav-link nav-primary">
              新建文章
            </NuxtLink>
            <span class="welcome">欢迎，{{ authUser.username }}</span>
            <button class="nav-btn" @click="logout">退出</button>
          </template>

          <!-- ⭐ 未登录时：登录 + 注册 -->
          <template v-else>
            <NuxtLink to="/admin/login" class="nav-btn">登录</NuxtLink>
            <NuxtLink to="/admin/register" class="nav-btn nav-btn-ghost"
              >注册</NuxtLink
            >
          </template>
        </nav>
      </div>
    </header>

    <main class="app-main">
      <NuxtPage />
    </main>

    <footer class="app-footer">
      <div class="app-footer-inner">
        <span>© 博客系统</span>
      </div>
    </footer>
  </div>
</template>

<script setup>
const authUser = useAuthUser();

// 退出登录方法
const logout = async () => {
  await $fetch("http://localhost:3001/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });

  authUser.value = null;
  navigateTo("/admin/login");
};
</script>

<style>
:root {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #111827;
  background-color: #f3f4f6;
}

body {
  margin: 0;
  background: radial-gradient(
    circle at top,
    #e0f2fe 0,
    #f3f4f6 45%,
    #e5e7eb 100%
  );
}

/* 布局 */
.app-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: blur(16px);
  background: linear-gradient(
    to right,
    rgba(15, 23, 42, 0.9),
    rgba(30, 64, 175, 0.9)
  );
  border-bottom: 1px solid rgba(148, 163, 184, 0.4);
}

.app-header-inner {
  max-width: 1080px;
  margin: 0 auto;
  padding: 10px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #e5e7eb;
  font-weight: 600;
  text-decoration: none;
  letter-spacing: 0.03em;
}

.logo-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #38bdf8;
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.9);
}

.nav-links {
  display: flex;
  gap: 12px;
  align-items: center;
}

.nav-link {
  font-size: 14px;
  color: #e5e7eb;
  text-decoration: none;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid transparent;
  transition: all 0.18s ease;
}

.nav-link:hover {
  background: rgba(15, 23, 42, 0.3);
  border-color: rgba(148, 163, 184, 0.6);
}

.nav-primary {
  background: #38bdf8;
  color: #0f172a;
  font-weight: 500;
}

.nav-primary:hover {
  background: #0ea5e9;
  color: #0b1120;
}

.app-main {
  flex: 1;
  padding: 24px 16px 40px;
}

.app-footer {
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.app-footer-inner {
  max-width: 1080px;
  margin: 0 auto;
  padding: 10px 24px 14px;
  font-size: 12px;
  color: #6b7280;
}
.nav-btn {
  background: #38bdf8;
  padding: 6px 14px;
  border-radius: 999px;
  cursor: pointer;
  border: none;
  color: #0f172a;
  font-weight: 500;
  transition: 0.2s;
}

.nav-btn:hover {
  background: #0ea5e9;
}

.welcome {
  color: #e5e7eb;
  font-size: 14px;
  margin-right: 10px;
}
.nav-btn {
  background: #38bdf8;
  padding: 6px 14px;
  border-radius: 999px;
  cursor: pointer;
  border: none;
  color: #0f172a;
  font-weight: 500;
  transition: 0.2s;
}

.nav-btn:hover {
  background: #0ea5e9;
}

.nav-btn-ghost {
  background: transparent;
  border: 1px solid #e5e7eb;
  color: #e5e7eb;
}

.nav-btn-ghost:hover {
  background: rgba(15, 23, 42, 0.4);
}
</style>
