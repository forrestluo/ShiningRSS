import type {
  Folder,
  Feed,
  Article,
  AIConfig,
  FeedResult,
  UnreadCount,
} from "../types";

const MOCK_FOLDERS: Folder[] = [
  { id: "f1", name: "科技", sort_order: 0, created_at: "2024-01-01T00:00:00Z" },
  { id: "f2", name: "设计", sort_order: 1, created_at: "2024-01-01T00:00:00Z" },
];

const MOCK_FEEDS: Feed[] = [
  {
    id: "feed1",
    title: "Hacker News",
    url: "https://news.ycombinator.com",
    feed_url: "https://hnrss.org/frontpage",
    description: "Hacker News RSS Feed",
    favicon: "",
    folder_id: "f1",
    last_fetched_at: new Date().toISOString(),
    refresh_interval: 1800,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: new Date().toISOString(),
  },
  {
    id: "feed2",
    title: "少数派",
    url: "https://sspai.com",
    feed_url: "https://sspai.com/feed",
    description: "少数派 RSS",
    favicon: "",
    folder_id: null,
    last_fetched_at: new Date().toISOString(),
    refresh_interval: 1800,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: new Date().toISOString(),
  },
  {
    id: "feed3",
    title: "Smashing Magazine",
    url: "https://www.smashingmagazine.com",
    feed_url: "https://www.smashingmagazine.com/feed",
    description: "Web design and development articles",
    favicon: "",
    folder_id: "f2",
    last_fetched_at: new Date().toISOString(),
    refresh_interval: 1800,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: new Date().toISOString(),
  },
];

function makeArticle(
  id: string,
  feedId: string,
  feedTitle: string,
  title: string,
  content: string,
  hoursAgo: number,
  isRead: boolean = false,
  isStarred: boolean = false
): Article {
  const pubDate = new Date(Date.now() - hoursAgo * 3600000).toISOString();
  return {
    id,
    feed_id: feedId,
    title,
    url: `https://example.com/article/${id}`,
    content: `<p>${content}</p>`,
    summary: content.slice(0, 200),
    author: "作者",
    published_at: pubDate,
    is_read: isRead,
    is_starred: isStarred,
    ai_summary: null,
    ai_summary_model: null,
    ai_translation: null,
    ai_labels: null,
    created_at: pubDate,
    guid: id,
    feed_title: feedTitle,
    feed_favicon: null,
  };
}

const MOCK_ARTICLES: Article[] = [
  makeArticle(
    "a1", "feed1", "Hacker News",
    "Rust 2024 年度回顾：性能与安全的完美平衡",
    "Rust 编程语言在 2024 年继续保持强劲增长，社区规模扩大了 40%。新版本引入了更好的异步运行时支持和改进的错误处理机制。越来越多的企业开始在生产环境中采用 Rust，特别是在系统编程和 WebAssembly 领域。",
    2, false, true
  ),
  makeArticle(
    "a2", "feed1", "Hacker News",
    "AI 辅助编程的现状与未来：开发者调查报告",
    "最新调查显示，超过 70% 的开发者已经在日常工作中使用 AI 编程工具。GitHub Copilot、Cursor 和其他 AI 编码助手正在改变软件开发的方式。然而，开发者对 AI 生成代码的质量和安全性仍有顾虑。",
    5, false
  ),
  makeArticle(
    "a3", "feed2", "少数派",
    "2024 年值得关注的 10 款效率工具",
    "在数字化工作越来越普及的今天，选择合适的效率工具能大幅提升工作效率。本文精选了 2024 年最值得关注的 10 款效率工具，涵盖笔记管理、任务规划、文件同步等多个类别。",
    8, true
  ),
  makeArticle(
    "a4", "feed3", "Smashing Magazine",
    "Modern CSS Layout Techniques: A Comprehensive Guide",
    "CSS has evolved significantly in recent years, with new layout capabilities that make complex designs much easier to implement. This guide covers CSS Grid, Flexbox, Container Queries, and the new :has() selector, with practical examples for each technique.",
    12, false
  ),
  makeArticle(
    "a5", "feed2", "少数派",
    "macOS Sequoia 深度体验：苹果的 AI 战略初现端倪",
    "macOS Sequoia 带来了 Apple Intelligence 功能，将 AI 深度整合到操作系统中。从智能写作助手到图像生成，再到 Siri 的大幅升级，苹果正在用自己的方式重新定义 AI 与操作系统的融合。本文从多个角度深度体验这些新功能。",
    15, false, true
  ),
  makeArticle(
    "a6", "feed1", "Hacker News",
    "WebAssembly 在边缘计算中的应用前景",
    "WebAssembly 不再局限于浏览器。在边缘计算、无服务器函数和 IoT 设备上，WASM 展现出了巨大的潜力。Fastly、Cloudflare 等 CDN 提供商已经全面支持 WASM 运行时。",
    20
  ),
  makeArticle(
    "a7", "feed3", "Smashing Magazine",
    "Designing for Accessibility: Beyond WCAG Compliance",
    "True accessibility goes beyond meeting WCAG requirements. This article explores inclusive design principles, user research with disabled users, and practical patterns that create genuinely accessible experiences for everyone.",
    24, true
  ),
];

const MOCK_UNREAD_COUNTS: UnreadCount[] = [
  { feed_id: "feed1", count: 3 },
  { feed_id: "feed2", count: 1 },
  { feed_id: "feed3", count: 1 },
];

export const mockApi = {
  initDatabase: async () => {},

  fetchFeed: async (_url: string): Promise<FeedResult> => ({
    title: "Mock Feed",
    description: "A mock feed for preview",
    link: _url,
    feed_url: _url,
    articles: [],
  }),

  parseOpml: async (_content: string) => [],
  generateOpml: async () => "",
  discoverFeed: async (_url: string): Promise<string[]> => [],

  addFolder: async (name: string): Promise<Folder> => ({
    id: crypto.randomUUID(),
    name,
    sort_order: 0,
    created_at: new Date().toISOString(),
  }),
  getFolders: async () => [...MOCK_FOLDERS],
  updateFolder: async () => {},
  deleteFolder: async () => {},

  addFeed: async (
    title: string,
    url: string,
    feedUrl: string,
    description: string,
    folderId: string | null
  ): Promise<Feed> => ({
    id: crypto.randomUUID(),
    title,
    url,
    feed_url: feedUrl,
    description,
    favicon: "",
    folder_id: folderId,
    last_fetched_at: null,
    refresh_interval: 1800,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }),
  getFeeds: async () => [...MOCK_FEEDS],
  updateFeed: async () => {},
  deleteFeed: async () => {},

  addArticles: async () => 0,
  getArticles: async (
    feedId: string | null,
    _folderId: string | null,
    starredOnly: boolean,
    _unreadOnly: boolean,
    _limit: number,
    _offset: number
  ): Promise<Article[]> => {
    let result = [...MOCK_ARTICLES];
    if (feedId) result = result.filter((a) => a.feed_id === feedId);
    if (starredOnly) result = result.filter((a) => a.is_starred);
    return result;
  },
  getArticle: async (id: string): Promise<Article> =>
    MOCK_ARTICLES.find((a) => a.id === id) || MOCK_ARTICLES[0],
  markArticleRead: async () => {},
  markArticleStarred: async () => {},
  markAllRead: async () => {},
  getUnreadCounts: async () => [...MOCK_UNREAD_COUNTS],
  searchArticles: async (query: string): Promise<Article[]> =>
    MOCK_ARTICLES.filter(
      (a) =>
        a.title.toLowerCase().includes(query.toLowerCase()) ||
        a.content.toLowerCase().includes(query.toLowerCase())
    ),

  saveAIConfig: async () => {},
  deleteAIConfig: async () => {},
  getAIConfig: async (): Promise<AIConfig[]> => [],
  saveAISummary: async () => {},
  saveAITranslation: async () => {},
  saveAILabels: async () => {},

  saveSettings: async () => {},
  getSettings: async (): Promise<Array<{ key: string; value: string }>> => [],
};
