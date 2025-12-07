<template>
  <div class="login-wrapper">
    <div class="login-card">
      <h2 class="title">后台管理系统</h2>

      <form @submit.prevent="handleLogin" class="form">
        <div class="form-item">
          <label>用户名</label>
          <input v-model="username" type="text" placeholder="请输入用户名" />
        </div>

        <div class="form-item">
          <label>密码</label>
          <input v-model="password" type="password" placeholder="请输入密码" />
        </div>

        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

        <button class="login-btn" :disabled="loading">
          {{ loading ? "登录中..." : "登录" }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
const username = ref("");
const password = ref("");
const loading = ref(false);
const errorMsg = ref("");

const router = useRouter();
const authUser = useAuthUser();

const handleLogin = async () => {
  if (!username.value || !password.value) {
    errorMsg.value = "用户名和密码不能为空";
    return;
  }
  loading.value = true;
  errorMsg.value = "";

  try {
    const res: any = await $fetch("http://localhost:3001/api/auth/login", {
      method: "POST",
      body: { username: username.value, password: password.value },
      credentials: "include",
    });

    authUser.value = res.user;
    router.push("/admin/list");
  } catch (err: any) {
    errorMsg.value = err?.data?.message || "登录失败，请检查用户名密码";
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #e0f2fe, #dbeafe);
}

.login-card {
  padding: 40px 32px;
  background: white;
  border-radius: 14px;
  width: 360px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.title {
  text-align: center;
  font-size: 22px;
  margin-bottom: 24px;
  color: #1e3a8a;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

input {
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  outline: none;
}

input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 3px #93c5fd;
}

.login-btn {
  padding: 10px;
  background: #2563eb;
  color: white;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 16px;
}

.login-btn:hover {
  background: #1d4ed8;
}

.error {
  color: red;
  font-size: 13px;
}
</style>
