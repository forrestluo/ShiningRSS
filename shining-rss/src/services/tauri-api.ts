import { invoke } from "@tauri-apps/api/core";
import type {
  Folder,
  Feed,
  Article,
  ArticleInput,
  AIConfig,
  FeedResult,
  UnreadCount,
  OpmlFeed,
} from "../types";

const IS_TAURI = "__TAURI_INTERNALS__" in window;

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (IS_TAURI) {
    return invoke<T>(cmd, args);
  }
  throw new Error(`Tauri 命令不可用: ${cmd}`);
}

export const api = {
  initDatabase: () => call<void>("init_database"),

  fetchFeed: (url: string) => call<FeedResult>("fetch_feed", { url }),
  parseOpml: (content: string) => call<OpmlFeed[]>("parse_opml", { content }),
  generateOpml: (feeds: OpmlFeed[]) => call<string>("generate_opml", { feeds }),

  addFolder: (name: string) => call<Folder>("add_folder", { name }),
  getFolders: () => call<Folder[]>("get_folders"),
  updateFolder: (id: string, name: string) =>
    call<void>("update_folder", { id, name }),
  deleteFolder: (id: string) => call<void>("delete_folder", { id }),

  addFeed: (
    title: string,
    url: string,
    feedUrl: string,
    description: string,
    folderId: string | null
  ) =>
    call<Feed>("add_feed", {
      title,
      url,
      feedUrl,
      description,
      folderId,
    }),
  getFeeds: () => call<Feed[]>("get_feeds"),
  updateFeed: (
    id: string,
    title?: string | null,
    folderId?: string | null,
    lastFetchedAt?: string | null
  ) =>
    call<void>("update_feed", {
      id,
      title,
      folderId,
      lastFetchedAt,
    }),
  deleteFeed: (id: string) => call<void>("delete_feed", { id }),

  addArticles: (articles: ArticleInput[]) =>
    call<number>("add_articles", { articles }),
  getArticles: (
    feedId: string | null,
    folderId: string | null,
    starredOnly: boolean,
    unreadOnly: boolean,
    limit: number,
    offset: number
  ) =>
    call<Article[]>("get_articles", {
      feedId,
      folderId,
      starredOnly,
      unreadOnly,
      limit,
      offset,
    }),
  getArticle: (id: string) => call<Article>("get_article", { id }),
  markArticleRead: (id: string, isRead: boolean) =>
    call<void>("mark_article_read", { id, isRead }),
  markArticleStarred: (id: string, isStarred: boolean) =>
    call<void>("mark_article_starred", { id, isStarred }),
  markAllRead: (feedId?: string | null, folderId?: string | null) =>
    call<void>("mark_all_read", { feedId, folderId }),
  getUnreadCounts: () => call<UnreadCount[]>("get_unread_counts"),
  searchArticles: (query: string, limit: number) =>
    call<Article[]>("search_articles", { query, limit }),

  saveAIConfig: (config: AIConfig) =>
    call<void>("save_ai_config", { config }),
  deleteAIConfig: (id: string) =>
    call<void>("delete_ai_config", { id }),
  getAIConfig: () => call<AIConfig[]>("get_ai_config"),
  saveAISummary: (articleId: string, summary: string, model: string) =>
    call<void>("save_ai_summary", { articleId, summary, model }),
  saveAITranslation: (articleId: string, translation: string) =>
    call<void>("save_ai_translation", { articleId, translation }),
  saveAILabels: (articleId: string, labels: string) =>
    call<void>("save_ai_labels", { articleId, labels }),

  saveSettings: (key: string, value: string) =>
    call<void>("save_settings", { key, value }),
  getSettings: () =>
    call<Array<{ key: string; value: string }>>("get_settings"),
};
