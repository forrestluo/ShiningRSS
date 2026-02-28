export interface Folder {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface Feed {
  id: string;
  title: string;
  url: string;
  feed_url: string;
  description: string;
  favicon: string;
  folder_id: string | null;
  last_fetched_at: string | null;
  refresh_interval: number;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: string;
  feed_id: string;
  title: string;
  url: string;
  content: string;
  summary: string;
  author: string;
  published_at: string;
  is_read: boolean;
  is_starred: boolean;
  ai_summary: string | null;
  ai_summary_model: string | null;
  ai_translation: string | null;
  ai_labels: string | null;
  created_at: string;
  guid: string;
  feed_title: string | null;
  feed_favicon: string | null;
}

export interface ArticleInput {
  id: string;
  feed_id: string;
  title: string;
  url: string;
  content: string;
  summary: string;
  author: string;
  published_at: string;
  guid: string;
}

export interface AIConfig {
  id: string;
  provider: string;
  api_key: string;
  api_endpoint: string;
  model: string;
  is_default: boolean;
}

export interface FeedResult {
  title: string;
  description: string;
  link: string;
  feed_url: string;
  articles: FeedArticleResult[];
}

export interface FeedArticleResult {
  title: string;
  link: string;
  content: string;
  summary: string;
  author: string;
  published_at: string;
  guid: string;
}

export interface UnreadCount {
  feed_id: string;
  count: number;
}

export interface OpmlFeed {
  title: string;
  xml_url: string;
  html_url: string;
  folder: string;
}

export type ViewMode = "all" | "unread" | "starred";

export type SidebarItem =
  | { type: "all" }
  | { type: "starred" }
  | { type: "folder"; id: string }
  | { type: "feed"; id: string };

export interface AIProvider {
  id: string;
  name: string;
  defaultEndpoint: string;
  models: string[];
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: "openai",
    name: "OpenAI",
    defaultEndpoint: "https://api.openai.com/v1",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    defaultEndpoint: "https://api.anthropic.com/v1",
    models: ["claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    defaultEndpoint: "https://api.deepseek.com/v1",
    models: ["deepseek-chat", "deepseek-reasoner"],
  },
  {
    id: "custom",
    name: "自定义（OpenAI 兼容）",
    defaultEndpoint: "",
    models: [],
  },
];
