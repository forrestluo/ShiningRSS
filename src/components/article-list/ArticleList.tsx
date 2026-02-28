import { useRef, useCallback } from "react";
import { Star, Check, CheckCheck, Clock, Sparkles, FileText, ArrowLeft, ArrowUpDown, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale/zh-CN";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAppStore } from "../../stores/app-store";
import type { Article, SidebarItem } from "../../types";
import TimelineSummary from "../common/TimelineSummary";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function getSnippet(article: Article, maxLen = 120): string {
  const text = article.summary || article.content || "";
  const stripped = stripHtml(text);
  if (stripped.length <= maxLen) return stripped;
  return stripped.slice(0, maxLen) + "…";
}

function getViewTitle(
  sidebar: SidebarItem,
  feeds: { id: string; title: string }[],
  folders: { id: string; name: string }[]
): string {
  switch (sidebar.type) {
    case "all":
      return "全部";
    case "starred":
      return "收藏";
    case "feed": {
      const feed = feeds.find((f) => f.id === sidebar.id);
      return feed?.title ?? "未知订阅";
    }
    case "folder": {
      const folder = folders.find((f) => f.id === sidebar.id);
      return folder?.name ?? "未知文件夹";
    }
    default:
      return "全部";
  }
}

function getUnreadCount(
  sidebar: SidebarItem,
  articles: Article[],
  unreadCounts: { feed_id: string; count: number }[],
  feeds: { id: string; folder_id: string | null }[]
): number {
  switch (sidebar.type) {
    case "all":
      return unreadCounts.reduce((sum, u) => sum + u.count, 0);
    case "feed":
      return unreadCounts.find((u) => u.feed_id === sidebar.id)?.count ?? 0;
    case "folder": {
      const feedIds = feeds
        .filter((f) => f.folder_id === sidebar.id)
        .map((f) => f.id);
      return unreadCounts
        .filter((u) => feedIds.includes(u.feed_id))
        .reduce((sum, u) => sum + u.count, 0);
    }
    case "starred":
      return articles.filter((a) => !a.is_read).length;
    default:
      return 0;
  }
}

function parseAiLabels(labels: string | null): string[] {
  if (!labels) return [];
  try {
    const parsed = JSON.parse(labels);
    return Array.isArray(parsed) ? parsed : [labels];
  } catch {
    return labels
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 text-inherit dark:bg-yellow-500/40 rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export default function ArticleList() {
  const {
    articles,
    feeds,
    folders,
    unreadCounts,
    selectedSidebar,
    selectedArticle,
    selectArticle,
    markAllRead,
    setMobileView,
    searchQuery,
    aiSortEnabled,
    aiSortedArticleIds,
    isAISorting,
    toggleAISort,
  } = useAppStore();

  const parentRef = useRef<HTMLDivElement>(null);

  const viewTitle = getViewTitle(selectedSidebar, feeds, folders);
  const unreadCount = getUnreadCount(
    selectedSidebar,
    articles,
    unreadCounts,
    feeds
  );

  const sortedArticles = (() => {
    if (aiSortEnabled && aiSortedArticleIds.length > 0) {
      const idOrder = new Map(aiSortedArticleIds.map((id, i) => [id, i]));
      return [...articles].sort((a, b) => {
        const ai = idOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const bi = idOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        return ai - bi;
      });
    }
    return [...articles].sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    );
  })();

  const virtualizer = useVirtualizer({
    count: sortedArticles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
  });

  const handleBack = useCallback(() => {
    setMobileView("sidebar");
  }, [setMobileView]);

  return (
    <div className="flex w-full flex-col border-r border-border bg-bg-primary md:w-80 md:min-w-[320px] lg:w-80 lg:min-w-[320px]">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={handleBack}
              className="md:hidden shrink-0 rounded p-1 text-text-secondary hover:bg-bg-hover hover:text-primary transition-colors"
              aria-label="返回"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="font-semibold text-text-primary truncate">
              {viewTitle}
            </h2>
            {unreadCount > 0 && (
              <span className="flex-shrink-0 text-sm text-text-secondary">
                ({unreadCount})
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <TimelineSummary />
            <button
              type="button"
              onClick={() => toggleAISort()}
              disabled={isAISorting}
              className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 text-sm rounded transition-colors ${
                aiSortEnabled
                  ? "text-primary bg-primary-light"
                  : "text-text-secondary hover:text-primary hover:bg-bg-hover"
              }`}
              title="AI 智能排序"
            >
              {isAISorting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ArrowUpDown size={14} />
              )}
              AI 排序
            </button>
            <button
              type="button"
              onClick={() => markAllRead()}
              className="flex-shrink-0 flex items-center gap-1 px-2 py-1 text-sm text-text-secondary hover:text-primary hover:bg-bg-hover rounded transition-colors"
            >
              <CheckCheck size={14} />
              已读
            </button>
          </div>
        </div>
      </div>

      {/* Article list - virtualized */}
      <div ref={parentRef} className="flex-1 overflow-y-auto">
        {sortedArticles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-text-secondary">
            <FileText size={48} className="mb-3 opacity-50" />
            <p className="text-sm">暂无文章</p>
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const article = sortedArticles[virtualItem.index];
              const isSelected = selectedArticle?.id === article.id;
              const aiLabels = parseAiLabels(article.ai_labels);

              return (
                <div
                  key={article.id}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => selectArticle(article)}
                    className={`w-full text-left px-4 py-3 flex gap-3 items-start cursor-pointer transition-colors hover:bg-bg-hover ${
                      isSelected ? "bg-primary-light" : ""
                    }`}
                  >
                    {/* Unread dot */}
                    <div className="flex-shrink-0 w-2 mt-2">
                      {!article.is_read && (
                        <span className="block w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-text-secondary mb-0.5 truncate">
                        {article.feed_title ?? "未知订阅"}
                      </p>

                      <p
                        className={`mb-1 truncate ${
                          article.is_read ? "font-normal" : "font-bold"
                        } text-text-primary`}
                      >
                        <HighlightText text={article.title || "无标题"} query={searchQuery} />
                      </p>

                      <p className="text-sm text-text-secondary line-clamp-2 mb-1">
                        <HighlightText text={getSnippet(article)} query={searchQuery} />
                      </p>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-text-tertiary">
                          <Clock size={12} />
                          {formatDistanceToNow(
                            new Date(article.published_at),
                            {
                              addSuffix: true,
                              locale: zhCN,
                            }
                          )}
                        </span>
                        {article.is_read && (
                          <Check
                            size={14}
                            className="text-success flex-shrink-0"
                          />
                        )}
                        {article.is_starred && (
                          <Star
                            size={14}
                            className="text-warning fill-warning flex-shrink-0"
                          />
                        )}
                        {article.ai_summary && (
                          <Sparkles
                            size={14}
                            className="text-accent flex-shrink-0"
                          />
                        )}
                        {aiLabels.length > 0 &&
                          aiLabels.map((label) => (
                            <span
                              key={label}
                              className="px-1.5 py-0.5 text-xs rounded bg-bg-tertiary text-text-secondary"
                            >
                              {label}
                            </span>
                          ))}
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
