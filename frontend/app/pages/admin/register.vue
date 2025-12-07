<template>
  <div class="login-wrapper">
    <div class="login-card">
      <h2 class="title">注册新账号</h2>

      <form @submit.prevent="handleRegister" class="form">
        <div class="form-item">
          <label>用户名</label>
          <input v-model="username" type="text" placeholder="请输入用户名" />
        </div>

        <div class="form-item">
          <label>昵称（可选）</label>
          <input v-model="nickname" type="text" placeholder="展示名称" />
        </div>

        <div class="form-item">
          <label>密码</label>
          <input v-model="password" type="password" placeholder="至少 6 位" />
        </div>

        <div class="form-item">
          <label>确认密码</label>
          <input
            v-model="confirmPassword"
            type="password"
            placeholder="再次输入密码"
          />
        </div>

        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
        <p v-if="successMsg" class="success">{{ successMsg }}</p>

        <button class="login-btn" :disabled="loading">
          {{ loading ? "注册中..." : "注册" }}
        </button>

        <p class="tip">
          已有账号？
          <NuxtLink to="/admin/login">去登录</NuxtLink>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
const username = ref("");
const password = ref("");
const confirmPassword = ref("");
const nickname = ref("");
const loading = ref(false);
const errorMsg = ref("");
const successMsg = ref("");

const router = useRouter();

const handleRegister = async () => {
  errorMsg.value = "";
  successMsg.value = "";

  if (!username.value || !password.value) {
    errorMsg.value = "用户名和密码不能为空";
    return;
  }
  if (password.value.length < 6) {
    errorMsg.value = "密码长度至少 6 位";
    return;
  }
  if (password.value !== confirmPassword.value) {
    errorMsg.value = "两次输入的密码不一致";
    return;
  }

  loading.value = true;
  try {
    await $fetch("http://localhost:3001/api/auth/register", {
      method: "POST",
      body: {
        username: username.value,
        password: password.value,
        nickname: nickname.value || username.value,
      },
      credentials: "include",
    });

    successMsg.value = "注册成功，请使用账号密码登录";
    setTimeout(() => {
      router.push("/admin/login");
    }, 1000);
  } catch (err: any) {
    errorMsg.value =
      err?.data?.message || err?.message || "注册失败，请稍后重试";
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
  min-height: calc(100vh - 80px);
  background: transparent;
}

.login-card {
  padding: 32px 28px;
  background: white;
  border-radius: 14px;
  width: 380px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.15);
}

.title {
  text-align: center;
  font-size: 22px;
  margin-bottom: 20px;
  color: #1f2937;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

label {
  font-size: 13px;
  color: #4b5563;
}

input {
  padding: 9px 10px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  outline: none;
  font-size: 14px;
}

input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.25);
}

.login-btn {
  margin-top: 4px;
  padding: 9px;
  background: #2563eb;
  color: white;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 15px;
  font-weight: 500;
}

.login-btn[disabled] {
  opacity: 0.7;
  cursor: not-allowed;
}

.error {
  color: #dc2626;
  font-size: 13px;
}

.success {
  color: #16a34a;
  font-size: 13px;
}

.tip {
  margin-top: 4px;
  font-size: 13px;
  color: #6b7280;
}
</style>
