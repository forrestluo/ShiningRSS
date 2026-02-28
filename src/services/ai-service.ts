import type { AIConfig, Article } from "../types";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

function getErrorMessage(status: number, body: string): string {
  switch (true) {
    case status === 401:
      return "AI API 请求失败: API Key 无效 (401)";
    case status === 429:
      return "AI API 请求失败: 请求过于频繁，请稍后重试 (429)";
    case status >= 500:
      return `AI API 请求失败: 服务器错误 (${status})`;
    default:
      return `AI API 请求失败 (${status}): ${body}`;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let _onAICallSuccess: (() => void) | null = null;

export function setAICallSuccessCallback(cb: () => void) {
  _onAICallSuccess = cb;
}

async function chatCompletion(
  config: AIConfig,
  messages: ChatMessage[]
): Promise<string> {
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      await delay(1000);
    }

    try {
      const result = await chatCompletionOnce(config, messages);
      _onAICallSuccess?.();
      return result;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < maxRetries) {
        console.warn(`AI 调用失败，正在重试 (${attempt + 1}/${maxRetries})...`, lastError.message);
      }
    }
  }

  throw lastError!;
}

async function chatCompletionOnce(
  config: AIConfig,
  messages: ChatMessage[]
): Promise<string> {
  const isAnthropic = config.provider === "anthropic";

  const endpoint = isAnthropic
    ? `${config.api_endpoint}/messages`
    : `${config.api_endpoint}/chat/completions`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  let body: string;

  if (isAnthropic) {
    headers["x-api-key"] = config.api_key;
    headers["anthropic-version"] = "2023-06-01";
    headers["anthropic-dangerous-direct-browser-access"] = "true";

    const systemMsg = messages.find((m) => m.role === "system");
    const userMsgs = messages.filter((m) => m.role !== "system");

    body = JSON.stringify({
      model: config.model,
      max_tokens: 2048,
      system: systemMsg?.content || "",
      messages: userMsgs.map((m) => ({ role: m.role, content: m.content })),
    });
  } else {
    headers["Authorization"] = `Bearer ${config.api_key}`;

    body = JSON.stringify({
      model: config.model,
      messages,
      max_tokens: 2048,
      temperature: 0.3,
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("AI API 请求超时（60秒）");
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(getErrorMessage(response.status, errText));
  }

  const data = await response.json();

  if (isAnthropic) {
    return data.content?.[0]?.text || "";
  }

  return (data as ChatResponse).choices?.[0]?.message?.content || "";
}

export async function generateSummary(
  config: AIConfig,
  article: Article
): Promise<string> {
  const plainContent = stripHtml(article.content || article.summary);
  const truncated = plainContent.slice(0, 6000);

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "你是一个专业的文章摘要助手。请用简洁的中文总结以下文章的核心内容，不超过200字。直接输出摘要内容，不要加任何前缀。",
    },
    {
      role: "user",
      content: `标题：${article.title}\n\n内容：${truncated}`,
    },
  ];

  return chatCompletion(config, messages);
}

export async function translateArticle(
  config: AIConfig,
  article: Article
): Promise<string> {
  const plainContent = stripHtml(article.content || article.summary);
  const truncated = plainContent.slice(0, 8000);

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "你是一个专业的翻译助手。请将以下文章翻译成简体中文。保持原文的格式和段落结构。如果原文已经是中文，请优化其表达。直接输出翻译结果。",
    },
    {
      role: "user",
      content: `标题：${article.title}\n\n${truncated}`,
    },
  ];

  return chatCompletion(config, messages);
}

export async function generateTimelineSummary(
  config: AIConfig,
  articles: Article[]
): Promise<string> {
  const articleSummaries = articles.slice(0, 30).map((a, i) => {
    const plainContent = stripHtml(a.content || a.summary).slice(0, 300);
    return `${i + 1}. [${a.feed_title || "未知来源"}] ${a.title}\n   ${plainContent}`;
  });

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "你是一个专业的新闻分析助手。请分析以下时间线上的文章，从以下角度进行总结：\n1. 主要话题和趋势（3-5个）\n2. 重要事件和发现\n3. 值得关注的观点\n请用结构化的中文输出，每个部分用标题分隔。",
    },
    {
      role: "user",
      content: `以下是最近的 ${articles.length} 篇文章：\n\n${articleSummaries.join("\n\n")}`,
    },
  ];

  return chatCompletion(config, messages);
}

export async function generateLabels(
  config: AIConfig,
  article: Article
): Promise<string[]> {
  const plainContent = stripHtml(article.content || article.summary);
  const truncated = plainContent.slice(0, 3000);

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        '你是一个文章分类助手。请为以下文章生成 2-4 个简短的中文标签。直接输出标签，用逗号分隔，例如："科技,人工智能,深度学习"。不要加任何其他文字。',
    },
    {
      role: "user",
      content: `标题：${article.title}\n\n内容：${truncated}`,
    },
  ];

  const result = await chatCompletion(config, messages);
  return result
    .split(/[,，]/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export async function smartSortArticles(
  config: AIConfig,
  articles: Article[]
): Promise<string[]> {
  const subset = articles.slice(0, 30);

  const articleList = subset
    .map((a, i) => `${i + 1}. ${a.title}`)
    .join("\n");

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "你是一个智能内容排序助手。请根据文章的重要性、时效性和信息价值，对以下文章进行排序。返回排序后的文章编号列表，每行一个编号，不要包含其他文字。",
    },
    {
      role: "user",
      content: articleList,
    },
  ];

  const result = await chatCompletion(config, messages);

  const orderedIndices = result
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/\d+/);
      return match ? parseInt(match[0], 10) : NaN;
    })
    .filter((n) => !isNaN(n) && n >= 1 && n <= subset.length);

  const orderedIds: string[] = [];
  const seen = new Set<number>();
  for (const idx of orderedIndices) {
    if (!seen.has(idx)) {
      seen.add(idx);
      orderedIds.push(subset[idx - 1].id);
    }
  }

  for (const a of subset) {
    if (!orderedIds.includes(a.id)) {
      orderedIds.push(a.id);
    }
  }

  return orderedIds;
}
