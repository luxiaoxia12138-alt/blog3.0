// src/redisClient.js
const redis = require("redis");

const client = redis.createClient({
  url: "redis://127.0.0.1:6379", // 本地 Redis 默认地址
});

client.on("error", (err) => {
  console.error("Redis 连接出错：", err.message);
});

client.on("connect", () => {
  console.log("Redis 连接成功");
});

// 不用 await，让它在后台自己连，失败了也不会影响整个服务
client.connect().catch((err) => {
  console.error("Redis connect 失败：", err.message);
});

module.exports = client;
