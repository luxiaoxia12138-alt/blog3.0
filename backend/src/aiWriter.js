// backend/src/aiWriter.js
// 使用火山引擎大模型 API 作为写作助手

const https = require("https");

/**
 * 通过 HTTP POST 请求调用火山引擎大模型
 */
function callVolcengineChat({ apiUrl, apiKey, model, prompt }) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(apiUrl);

      const body = JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const options = {
        hostname: url.hostname,
        path: url.pathname + (url.search || ""),
        method: "POST",
        port: url.port || 443,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          // 这里的鉴权方式要按你火山引擎控制台的要求来
          Authorization: `Bearer ${apiKey}`, // 使用 Bearer Token 认证
        },
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (e) {
            reject(
              new Error(
                "解析火山引擎返回失败: " + e.message + " 原始返回: " + data
              )
            );
          }
        });
      });

      req.on("error", (err) => {
        reject(err);
      });

      req.write(body);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * 根据标题/关键词生成文章正文和摘要（通过火山引擎大模型）
 * @param {Object} opts
 * @param {string} opts.title
 * @param {string} opts.keywords
 */
async function generateArticle({ title, keywords }) {
  const apiKey = process.env.VOLCENGINE_API_KEY;
  const apiUrl = process.env.VOLCENGINE_API_URL;
  const model = process.env.VOLCENGINE_MODEL || "doubao-seed-1-6-vision-250815"; // 使用你自己的模型

  if (!apiKey || !apiUrl) {
    throw new Error("缺少 VOLCENGINE_API_KEY 或 VOLCENGINE_API_URL 配置");
  }

  const cleanTitle = (title || "").trim();
  const cleanKeywords = (keywords || "").trim();

  const prompt = `
你是一个中文博客写作助手，请根据给定标题和关键词生成一篇博客文章草稿，并给出一个简短摘要。
要求：
- 文章语言：中文
- 面向普通读者，风格尽量通俗易懂
- 结构包含：引言、2~3个小节、简单总结
- 字数控制在 600 ~ 1200 字之间
- 摘要 1~2 句话即可
- 输出 JSON 格式，必须是标准 JSON

标题：${cleanTitle}
关键词：${cleanKeywords || "（无特别关键词）"}

输出 JSON 结构如下：
{
  "summary": "这里是文章摘要",
  "content": "这里是文章正文，使用换行分段"
}
`.trim();

  // 调用火山引擎接口
  const resp = await callVolcengineChat({
    apiUrl,
    apiKey,
    model,
    prompt,
  });

  console.log("🔥 火山引擎原始返回：", JSON.stringify(resp, null, 2)); // 打印返回的 JSON

  // 下面这块要根据火山接口的返回格式来解析
  let contentText = "";

  try {
    if (resp.choices && resp.choices[0] && resp.choices[0].message) {
      contentText = resp.choices[0].message.content || "";
    } else if (resp.output && resp.output.choices && resp.output.choices[0]) {
      // 另一种常见返回格式
      contentText = resp.output.choices[0].message?.content || "";
    } else {
      contentText = JSON.stringify(resp);
    }
  } catch (e) {
    contentText = JSON.stringify(resp);
  }

  // 尝试把大模型返回解析成 JSON
  try {
    const parsed = JSON.parse(contentText);
    return {
      summary: String(parsed.summary || "").trim(),
      content: String(parsed.content || "").trim(),
      raw: contentText,
    };
  } catch (e) {
    // 如果不是合法 JSON，就直接当正文用
    return {
      summary: "",
      content: contentText.trim(),
      raw: contentText,
    };
  }
}

module.exports = {
  generateArticle,
};
