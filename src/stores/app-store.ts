import { create } from "zustand";
import { api } from "../services/tauri-api";
import { smartSortArticles, setAICallSuccessCallback } from "../services/ai-service";
import type {
  Folder,
  Feed,
  Article,
  AIConfig,
  SidebarItem,
  UnreadCount,
  FeedArticleResult,
  ArticleInput,
} from "../types";

interface AITokenUsage {
  totalCalls: number;
  date: string;
}

export type MobileView = "sidebar" | "list" | "reader";

interface AppState {
  initialized: boolean;
  darkMode: boolean;
  autoSummary: boolean;

  folders: Folder[];
  feeds: Feed[];
  articles: Article[];
  unreadCounts: UnreadCount[];
  aiConfigs: AIConfig[];

  selectedSidebar: SidebarItem;
  selectedArticle: Article | null;
  isRefreshing: boolean;
  searchQuery: string;
  showSettings: boolean;
  settingsTab: string;
  showAddFeed: boolean;
  refreshInterval: number;
  mobileView: MobileView;

  aiSortEnabled: boolean;
  aiSortedArticleIds: string[];
  isAISorting: boolean;

  aiTokenUsage: AITokenUsage;

  init: () => Promise<void>;
  setDarkMode: (dark: boolean) => void;
  setAutoSummary: (auto: boolean) => void;

  loadFolders: () => Promise<void>;
  addFolder: (name: string) => Promise<Folder>;
  updateFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;

  loadFeeds: () => Promise<void>;
  subscribeFeed: (url: string, folderId?: string | null) => Promise<Feed>;
  deleteFeed: (id: string) => Promise<void>;
  refreshFeed: (feedId: string) => Promise<void>;
  refreshAllFeeds: () => Promise<void>;

  loadArticles: () => Promise<void>;
  selectArticle: (article: Article | null) => Promise<void>;
  toggleStarred: (article: Article) => Promise<void>;
  markAllRead: () => Promise<void>;
  loadUnreadCounts: () => Promise<void>;

  setSelectedSidebar: (item: SidebarItem) => void;
  setSearchQuery: (query: string) => void;
  searchArticles: (query: string) => Promise<void>;
  setShowSettings: (show: boolean) => void;
  setSettingsTab: (tab: string) => void;
  setShowAddFeed: (show: boolean) => void;
  setRefreshInterval: (interval: number) => void;
  setMobileView: (view: MobileView) => void;

  loadAIConfigs: () => Promise<void>;
  saveAIConfig: (config: AIConfig) => Promise<void>;
  deleteAIConfig: (id: string) => Promise<void>;
  updateFeedFolder: (feedId: string, folderId: string | null) => Promise<void>;
  updateArticleAISummary: (
    articleId: string,
    summary: string,
    model: string
  ) => void;
  updateArticleAITranslation: (articleId: string, translation: string) => void;
  updateArticleAILabels: (articleId: string, labels: string) => void;

  reorderFolders: (oldIndex: number, newIndex: number) => void;
  reorderFeeds: (feedIds: string[]) => void;

  toggleAISort: () => Promise<void>;
  incrementAIUsage: () => void;
}

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useAppStore = create<AppState>()((set, get) => {
  setAICallSuccessCallback(() => {
    get().incrementAIUsage();
  });

  return {
    initialized: false,
    darkMode: false,
    autoSummary: true,

    folders: [],
    feeds: [],
    articles: [],
    unreadCounts: [],
    aiConfigs: [],

    selectedSidebar: { type: "all" },
    selectedArticle: null,
    isRefreshing: false,
    searchQuery: "",
    showSettings: false,
    settingsTab: "ai",
    showAddFeed: false,
    refreshInterval: 0,
    mobileView: "sidebar",

    aiSortEnabled: false,
    aiSortedArticleIds: [],
    isAISorting: false,

    aiTokenUsage: { totalCalls: 0, date: getTodayString() },

    init: async () => {
      try {
        await api.initDatabase();

        const settingsArr = await api.getSettings();
        const settingsMap = new Map(settingsArr.map((s) => [s.key, s.value]));

        const darkMode = settingsMap.get("darkMode") === "true";
        const autoSummary = settingsMap.get("autoSummary") !== "false";
        const refreshInterval = parseInt(settingsMap.get("refreshInterval") ?? "0", 10) || 0;

        if (darkMode) {
          document.documentElement.classList.add("dark");
        }

        set({ darkMode, autoSummary, refreshInterval, initialized: true });

        await Promise.all([
          get().loadFolders(),
          get().loadFeeds(),
          get().loadAIConfigs(),
        ]);
        await get().loadArticles();
        await get().loadUnreadCounts();
      } catch (e) {
        console.error("初始化失败:", e);
        set({ initialized: true });
      }
    },

    setDarkMode: (dark: boolean) => {
      if (dark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      set({ darkMode: dark });
      api.saveSettings("darkMode", String(dark)).catch(console.error);
    },

    setAutoSummary: (auto: boolean) => {
      set({ autoSummary: auto });
      api.saveSettings("autoSummary", String(auto)).catch(console.error);
    },

    loadFolders: async () => {
      try {
        const folders = await api.getFolders();
        set({ folders });
      } catch (e) {
        console.error("加载文件夹失败:", e);
      }
    },

    addFolder: async (name: string) => {
      const folder = await api.addFolder(name);
      set((s) => ({ folders: [...s.folders, folder] }));
      return folder;
    },

    updateFolder: async (id: string, name: string) => {
      await api.updateFolder(id, name);
      set((s) => ({
        folders: s.folders.map((f) => (f.id === id ? { ...f, name } : f)),
      }));
    },

    deleteFolder: async (id: string) => {
      await api.deleteFolder(id);
      set((s) => ({
        folders: s.folders.filter((f) => f.id !== id),
        feeds: s.feeds.map((f) =>
          f.folder_id === id ? { ...f, folder_id: null } : f
        ),
      }));
    },

    loadFeeds: async () => {
      try {
        const feeds = await api.getFeeds();
        set({ feeds });
      } catch (e) {
        console.error("加载订阅源失败:", e);
      }
    },

    subscribeFeed: async (url: string, folderId: string | null = null) => {
      const result = await api.fetchFeed(url);
      const feed = await api.addFeed(
        result.title,
        result.link || url,
        result.feed_url || url,
        result.description,
        folderId ?? null
      );

      const articleInputs: ArticleInput[] = result.articles.map(
        (a: FeedArticleResult) => ({
          id: crypto.randomUUID(),
          feed_id: feed.id,
          title: a.title,
          url: a.link,
          content: a.content,
          summary: a.summary,
          author: a.author,
          published_at: a.published_at || new Date().toISOString(),
          guid: a.guid,
        })
      );

      if (articleInputs.length > 0) {
        await api.addArticles(articleInputs);
      }

      const now = new Date().toISOString();
      await api.updateFeed(feed.id, undefined, undefined, now);

      set((s) => ({ feeds: [...s.feeds, { ...feed, last_fetched_at: now }] }));
      await get().loadArticles();
      await get().loadUnreadCounts();

      return feed;
    },

    deleteFeed: async (id: string) => {
      await api.deleteFeed(id);
      set((s) => ({
        feeds: s.feeds.filter((f) => f.id !== id),
        articles: s.articles.filter((a) => a.feed_id !== id),
      }));
      await get().loadUnreadCounts();
    },

    refreshFeed: async (feedId: string) => {
      const { feeds } = get();
      const feed = feeds.find((f) => f.id === feedId);
      if (!feed) return;

      set({ isRefreshing: true });
      try {
        const result = await api.fetchFeed(feed.feed_url);
        const articleInputs: ArticleInput[] = result.articles.map(
          (a: FeedArticleResult) => ({
            id: crypto.randomUUID(),
            feed_id: feedId,
            title: a.title,
            url: a.link,
            content: a.content,
            summary: a.summary,
            author: a.author,
            published_at: a.published_at || new Date().toISOString(),
            guid: a.guid,
          })
        );

        if (articleInputs.length > 0) {
          await api.addArticles(articleInputs);
        }

        const now = new Date().toISOString();
        await api.updateFeed(feedId, undefined, undefined, now);

        set((s) => ({
          feeds: s.feeds.map((f) =>
            f.id === feedId ? { ...f, last_fetched_at: now } : f
          ),
        }));
        await get().loadArticles();
        await get().loadUnreadCounts();
      } finally {
        set({ isRefreshing: false });
      }
    },

    refreshAllFeeds: async () => {
      const { feeds } = get();
      set({ isRefreshing: true });
      try {
        for (const feed of feeds) {
          try {
            const result = await api.fetchFeed(feed.feed_url);
            const articleInputs: ArticleInput[] = result.articles.map(
              (a: FeedArticleResult) => ({
                id: crypto.randomUUID(),
                feed_id: feed.id,
                title: a.title,
                url: a.link,
                content: a.content,
                summary: a.summary,
                author: a.author,
                published_at: a.published_at || new Date().toISOString(),
                guid: a.guid,
              })
            );

            if (articleInputs.length > 0) {
              await api.addArticles(articleInputs);
            }

            const now = new Date().toISOString();
            await api.updateFeed(feed.id, undefined, undefined, now);
          } catch (e) {
            console.error(`刷新 ${feed.title} 失败:`, e);
          }
        }
        await get().loadFeeds();
        await get().loadArticles();
        await get().loadUnreadCounts();
      } finally {
        set({ isRefreshing: false });
      }
    },

    loadArticles: async () => {
      const { selectedSidebar, searchQuery } = get();

      try {
        let articles: Article[];

        if (searchQuery) {
          articles = await api.searchArticles(searchQuery, 200);
        } else {
          let feedId: string | null = null;
          let folderId: string | null = null;
          let starredOnly = false;

          switch (selectedSidebar.type) {
            case "feed":
              feedId = selectedSidebar.id;
              break;
            case "folder":
              folderId = selectedSidebar.id;
              break;
            case "starred":
              starredOnly = true;
              break;
          }

          articles = await api.getArticles(
            feedId,
            folderId,
            starredOnly,
            false,
            200,
            0
          );
        }

        set({ articles });
      } catch (e) {
        console.error("加载文章失败:", e);
      }
    },

    selectArticle: async (article: Article | null) => {
      set({ selectedArticle: article, ...(article ? { mobileView: "reader" as MobileView } : {}) });
      if (article && !article.is_read) {
        try {
          await api.markArticleRead(article.id, true);
          set((s) => ({
            articles: s.articles.map((a) =>
              a.id === article.id ? { ...a, is_read: true } : a
            ),
            selectedArticle: s.selectedArticle
              ? { ...s.selectedArticle, is_read: true }
              : null,
          }));
          await get().loadUnreadCounts();
        } catch (e) {
          console.error("标记已读失败:", e);
        }
      }
    },

    toggleStarred: async (article: Article) => {
      const newStarred = !article.is_starred;
      try {
        await api.markArticleStarred(article.id, newStarred);
        set((s) => ({
          articles: s.articles.map((a) =>
            a.id === article.id ? { ...a, is_starred: newStarred } : a
          ),
          selectedArticle:
            s.selectedArticle?.id === article.id
              ? { ...s.selectedArticle, is_starred: newStarred }
              : s.selectedArticle,
        }));
      } catch (e) {
        console.error("切换收藏失败:", e);
      }
    },

    markAllRead: async () => {
      const { selectedSidebar } = get();
      try {
        switch (selectedSidebar.type) {
          case "feed":
            await api.markAllRead(selectedSidebar.id, null);
            break;
          case "folder":
            await api.markAllRead(null, selectedSidebar.id);
            break;
          default:
            await api.markAllRead(null, null);
            break;
        }
        set((s) => ({
          articles: s.articles.map((a) => ({ ...a, is_read: true })),
        }));
        await get().loadUnreadCounts();
      } catch (e) {
        console.error("标记全部已读失败:", e);
      }
    },

    loadUnreadCounts: async () => {
      try {
        const unreadCounts = await api.getUnreadCounts();
        set({ unreadCounts });
      } catch (e) {
        console.error("加载未读数失败:", e);
      }
    },

    setSelectedSidebar: (item: SidebarItem) => {
      set({ selectedSidebar: item, selectedArticle: null, searchQuery: "", mobileView: "list" as MobileView });
      setTimeout(() => get().loadArticles(), 0);
    },

    setSearchQuery: (query: string) => {
      set({ searchQuery: query });
    },

    searchArticles: async (query: string) => {
      set({ searchQuery: query, selectedArticle: null });
      if (query.trim()) {
        try {
          const articles = await api.searchArticles(query, 200);
          set({ articles });
        } catch (e) {
          console.error("搜索失败:", e);
        }
      } else {
        await get().loadArticles();
      }
    },

    setShowSettings: (show: boolean) => set({ showSettings: show }),
    setSettingsTab: (tab: string) => set({ settingsTab: tab }),
    setShowAddFeed: (show: boolean) => set({ showAddFeed: show }),
    setRefreshInterval: (interval: number) => {
      set({ refreshInterval: interval });
      api.saveSettings("refreshInterval", String(interval)).catch(console.error);
    },
    setMobileView: (view: MobileView) => set({ mobileView: view }),

    loadAIConfigs: async () => {
      try {
        const configs = await api.getAIConfig();
        set({ aiConfigs: configs });
      } catch (e) {
        console.error("加载 AI 配置失败:", e);
      }
    },

    saveAIConfig: async (config: AIConfig) => {
      await api.saveAIConfig(config);
      await get().loadAIConfigs();
    },

    deleteAIConfig: async (id: string) => {
      await api.deleteAIConfig(id);
      await get().loadAIConfigs();
    },

    updateFeedFolder: async (feedId: string, folderId: string | null) => {
      await api.updateFeed(
        feedId,
        undefined,
        folderId === null ? "" : folderId,
        undefined
      );
      set((s) => ({
        feeds: s.feeds.map((f) =>
          f.id === feedId ? { ...f, folder_id: folderId } : f
        ),
      }));
    },

    updateArticleAISummary: (articleId: string, summary: string, model: string) => {
      set((s) => ({
        articles: s.articles.map((a) =>
          a.id === articleId
            ? { ...a, ai_summary: summary, ai_summary_model: model }
            : a
        ),
        selectedArticle:
          s.selectedArticle?.id === articleId
            ? {
                ...s.selectedArticle,
                ai_summary: summary,
                ai_summary_model: model,
              }
            : s.selectedArticle,
      }));
      api.saveAISummary(articleId, summary, model).catch(console.error);
    },

    updateArticleAITranslation: (articleId: string, translation: string) => {
      set((s) => ({
        articles: s.articles.map((a) =>
          a.id === articleId ? { ...a, ai_translation: translation } : a
        ),
        selectedArticle:
          s.selectedArticle?.id === articleId
            ? { ...s.selectedArticle, ai_translation: translation }
            : s.selectedArticle,
      }));
      api.saveAITranslation(articleId, translation).catch(console.error);
    },

    updateArticleAILabels: (articleId: string, labels: string) => {
      set((s) => ({
        articles: s.articles.map((a) =>
          a.id === articleId ? { ...a, ai_labels: labels } : a
        ),
        selectedArticle:
          s.selectedArticle?.id === articleId
            ? { ...s.selectedArticle, ai_labels: labels }
            : s.selectedArticle,
      }));
      api.saveAILabels(articleId, labels).catch(console.error);
    },

    reorderFolders: (oldIndex: number, newIndex: number) => {
      set((s) => {
        const newFolders = [...s.folders];
        const [moved] = newFolders.splice(oldIndex, 1);
        newFolders.splice(newIndex, 0, moved);
        return { folders: newFolders };
      });
    },

    reorderFeeds: (feedIds: string[]) => {
      set((s) => {
        const feedMap = new Map(s.feeds.map((f) => [f.id, f]));
        const reordered = feedIds
          .map((id) => feedMap.get(id))
          .filter((f): f is Feed => f != null);
        const remaining = s.feeds.filter((f) => !feedIds.includes(f.id));
        return { feeds: [...reordered, ...remaining] };
      });
    },

    toggleAISort: async () => {
      const { aiSortEnabled, articles, aiConfigs } = get();

      if (aiSortEnabled) {
        set({ aiSortEnabled: false, aiSortedArticleIds: [] });
        return;
      }

      const defaultConfig = aiConfigs.find((c) => c.is_default) ?? aiConfigs[0];
      if (!defaultConfig) {
        console.error("请先在设置中配置 AI 模型");
        return;
      }

      if (articles.length === 0) return;

      set({ isAISorting: true });
      try {
        const sortedIds = await smartSortArticles(defaultConfig, articles);
        set({ aiSortEnabled: true, aiSortedArticleIds: sortedIds });
      } catch (e) {
        console.error("AI 排序失败:", e);
      } finally {
        set({ isAISorting: false });
      }
    },

    incrementAIUsage: () => {
      const today = getTodayString();
      set((s) => {
        const current = s.aiTokenUsage;
        if (current.date === today) {
          return { aiTokenUsage: { totalCalls: current.totalCalls + 1, date: today } };
        }
        return { aiTokenUsage: { totalCalls: 1, date: today } };
      });
    },
  };
});
