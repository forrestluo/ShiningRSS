import { useState, useRef, useEffect } from "react";
import {
  Rss,
  FolderOpen,
  Star,
  RefreshCw,
  Plus,
  Settings,
  ChevronRight,
  ChevronDown,
  Search,
  BookOpen,
} from "lucide-react";
import { useAppStore } from "../../stores/app-store";
import type { Feed, SidebarItem } from "../../types";

function getUnreadCount(
  unreadCounts: { feed_id: string; count: number }[],
  feedId: string
): number {
  return unreadCounts.find((u) => u.feed_id === feedId)?.count ?? 0;
}

function isSelected(selected: SidebarItem, item: SidebarItem): boolean {
  if (selected.type !== item.type) return false;
  if (selected.type === "all" && item.type === "all") return true;
  if (selected.type === "starred" && item.type === "starred") return true;
  if (selected.type === "folder" && item.type === "folder")
    return selected.id === item.id;
  if (selected.type === "feed" && item.type === "feed")
    return selected.id === item.id;
  return false;
}

export default function Sidebar() {
  const {
    selectedSidebar,
    setSelectedSidebar,
    folders,
    feeds,
    unreadCounts,
    setShowSettings,
    setShowAddFeed,
    refreshAllFeeds,
    isRefreshing,
    searchQuery,
    setSearchQuery,
    searchArticles,
  } = useAppStore();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstMountRef = useRef(true);

  const totalUnread = unreadCounts.reduce((sum, u) => sum + u.count, 0);
  const feedsInFolders = new Map<string, Feed[]>();
  for (const folder of folders) {
    feedsInFolders.set(
      folder.id,
      feeds.filter((f) => f.folder_id === folder.id)
    );
  }
  const feedsWithoutFolder = feeds.filter((f) => f.folder_id === null);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchArticles(searchQuery);
      debounceRef.current = null;
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      searchArticles(searchQuery);
    }
  };

  return (
    <aside className="flex h-full w-64 min-w-[256px] flex-col border-r border-border bg-sidebar-bg dark:bg-sidebar-bg">
      {/* App title */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Rss className="h-5 w-5 shrink-0 text-primary" />
        <span className="text-base font-semibold text-text-primary">
          ShiningRSS
        </span>
      </div>

      {/* Search */}
      <div className="border-b border-border px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="搜索文章..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full rounded-md border border-border bg-bg-primary py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-bg-secondary dark:border-border"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        <div className="space-y-0.5 px-2">
          <button
            onClick={() => setSelectedSidebar({ type: "all" })}
            className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-bg-hover dark:hover:bg-bg-hover ${
              isSelected(selectedSidebar, { type: "all" })
                ? "bg-sidebar-active text-primary dark:bg-sidebar-active dark:text-primary"
                : "text-text-primary"
            }`}
          >
            <span className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 shrink-0" />
              全部文章
            </span>
            {totalUnread > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </button>

          <button
            onClick={() => setSelectedSidebar({ type: "starred" })}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-bg-hover dark:hover:bg-bg-hover ${
              isSelected(selectedSidebar, { type: "starred" })
                ? "bg-sidebar-active text-primary dark:bg-sidebar-active dark:text-primary"
                : "text-text-primary"
            }`}
          >
            <Star className="h-4 w-4 shrink-0" />
            收藏
          </button>
        </div>

        {/* Folders */}
        {folders.length > 0 && (
          <div className="mt-4 px-2">
            <div className="mb-1 flex items-center gap-1 px-3 py-1 text-xs font-medium uppercase tracking-wider text-text-tertiary">
              <FolderOpen className="h-3.5 w-3.5" />
              文件夹
            </div>
            <div className="space-y-0.5">
              {folders.map((folder) => {
                const folderFeeds = feedsInFolders.get(folder.id) ?? [];
                const isExpanded = expandedFolders.has(folder.id);
                const folderUnread = folderFeeds.reduce(
                  (sum, f) => sum + getUnreadCount(unreadCounts, f.id),
                  0
                );

                return (
                  <div key={folder.id} className="space-y-0.5">
                    <button
                      onClick={() => toggleFolder(folder.id)}
                      className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm text-text-primary transition-colors hover:bg-bg-hover dark:hover:bg-bg-hover"
                    >
                      <span className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0" />
                        )}
                        <span className="truncate">{folder.name}</span>
                      </span>
                      {folderUnread > 0 && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white">
                          {folderUnread > 99 ? "99+" : folderUnread}
                        </span>
                      )}
                    </button>
                    {isExpanded &&
                      folderFeeds.map((feed) => {
                        const count = getUnreadCount(unreadCounts, feed.id);
                        const selected = isSelected(selectedSidebar, {
                          type: "feed",
                          id: feed.id,
                        });
                        return (
                          <button
                            key={feed.id}
                            onClick={() =>
                              setSelectedSidebar({ type: "feed", id: feed.id })
                            }
                            className={`ml-6 flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-bg-hover dark:hover:bg-bg-hover ${
                              selected
                                ? "bg-sidebar-active text-primary dark:bg-sidebar-active dark:text-primary"
                                : "text-text-primary"
                            }`}
                          >
                            <span className="truncate">{feed.title}</span>
                            {count > 0 && (
                              <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white">
                                {count > 99 ? "99+" : count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Feeds without folder */}
        {feedsWithoutFolder.length > 0 && (
          <div className="mt-4 px-2">
            <div className="mb-1 flex items-center gap-1 px-3 py-1 text-xs font-medium uppercase tracking-wider text-text-tertiary">
              <Rss className="h-3.5 w-3.5" />
              订阅源
            </div>
            <div className="space-y-0.5">
              {feedsWithoutFolder.map((feed) => {
                const count = getUnreadCount(unreadCounts, feed.id);
                const selected = isSelected(selectedSidebar, {
                  type: "feed",
                  id: feed.id,
                });
                return (
                  <button
                    key={feed.id}
                    onClick={() =>
                      setSelectedSidebar({ type: "feed", id: feed.id })
                    }
                    className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-bg-hover dark:hover:bg-bg-hover ${
                      selected
                        ? "bg-sidebar-active text-primary dark:bg-sidebar-active dark:text-primary"
                        : "text-text-primary"
                    }`}
                  >
                    <span className="truncate">{feed.title}</span>
                    {count > 0 && (
                      <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white">
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Bottom toolbar */}
      <div className="flex items-center justify-center gap-1 border-t border-border bg-sidebar-bg px-3 py-2 dark:bg-sidebar-bg">
        <button
          onClick={() => setShowAddFeed(true)}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-text-primary transition-colors hover:bg-bg-hover dark:hover:bg-bg-hover"
          title="添加订阅源"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">添加</span>
        </button>
        <button
          onClick={() => refreshAllFeeds()}
          disabled={isRefreshing}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-text-primary transition-colors hover:bg-bg-hover disabled:opacity-50 dark:hover:bg-bg-hover"
          title="刷新全部"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          <span className="hidden sm:inline">刷新</span>
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-text-primary transition-colors hover:bg-bg-hover dark:hover:bg-bg-hover"
          title="设置"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">设置</span>
        </button>
      </div>
    </aside>
  );
}
