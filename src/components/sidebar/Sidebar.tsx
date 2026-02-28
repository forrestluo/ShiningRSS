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
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAppStore } from "../../stores/app-store";
import type { Feed, Folder, SidebarItem } from "../../types";

function getUnreadCount(
  unreadCounts: { feed_id: string; count: number }[],
  feedId: string
): number {
  return unreadCounts.find((u) => u.feed_id === feedId)?.count ?? 0;
}

function isItemSelected(selected: SidebarItem, item: SidebarItem): boolean {
  if (selected.type !== item.type) return false;
  if (selected.type === "all" && item.type === "all") return true;
  if (selected.type === "starred" && item.type === "starred") return true;
  if (selected.type === "folder" && item.type === "folder")
    return selected.id === item.id;
  if (selected.type === "feed" && item.type === "feed")
    return selected.id === item.id;
  return false;
}

function SortableFolder({
  folder,
  children,
  isExpanded,
  folderUnread,
  onToggle,
}: {
  folder: Folder;
  children: React.ReactNode;
  isExpanded: boolean;
  folderUnread: number;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: folder.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="space-y-0.5">
      <div className="flex items-center">
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab p-1 text-text-tertiary hover:text-text-secondary active:cursor-grabbing"
          aria-label="拖拽排序"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onToggle}
          className="flex flex-1 items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm text-text-primary transition-colors hover:bg-bg-hover dark:hover:bg-bg-hover"
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
      </div>
      {isExpanded && children}
    </div>
  );
}

function SortableFeedItem({
  feed,
  count,
  selected,
  onClick,
  indented,
}: {
  feed: Feed;
  count: number;
  selected: boolean;
  onClick: () => void;
  indented?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: feed.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center ${indented ? "ml-5" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab p-1 text-text-tertiary hover:text-text-secondary active:cursor-grabbing"
        aria-label="拖拽排序"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onClick}
        className={`flex flex-1 items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-bg-hover dark:hover:bg-bg-hover ${
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
    </div>
  );
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
    reorderFolders,
    reorderFeeds,
  } = useAppStore();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstMountRef = useRef(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleFolderDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = folders.findIndex((f) => f.id === active.id);
    const newIndex = folders.findIndex((f) => f.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderFolders(oldIndex, newIndex);
    }
  };

  const handleFeedDragEnd = (
    feedList: Feed[],
    event: DragEndEvent
  ) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = feedList.findIndex((f) => f.id === active.id);
    const newIndex = feedList.findIndex((f) => f.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(feedList, oldIndex, newIndex);
      reorderFeeds(reordered.map((f) => f.id));
    }
  };

  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-sidebar-bg dark:bg-sidebar-bg md:w-64 md:min-w-[256px] lg:w-64 lg:min-w-[256px]">
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
              isItemSelected(selectedSidebar, { type: "all" })
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
              isItemSelected(selectedSidebar, { type: "starred" })
                ? "bg-sidebar-active text-primary dark:bg-sidebar-active dark:text-primary"
                : "text-text-primary"
            }`}
          >
            <Star className="h-4 w-4 shrink-0" />
            收藏
          </button>
        </div>

        {/* Folders - Drag sortable */}
        {folders.length > 0 && (
          <div className="mt-4 px-2">
            <div className="mb-1 flex items-center gap-1 px-3 py-1 text-xs font-medium uppercase tracking-wider text-text-tertiary">
              <FolderOpen className="h-3.5 w-3.5" />
              文件夹
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleFolderDragEnd}
            >
              <SortableContext
                items={folders.map((f) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-0.5">
                  {folders.map((folder) => {
                    const folderFeeds = feedsInFolders.get(folder.id) ?? [];
                    const isExpanded = expandedFolders.has(folder.id);
                    const folderUnread = folderFeeds.reduce(
                      (sum, f) => sum + getUnreadCount(unreadCounts, f.id),
                      0
                    );

                    return (
                      <SortableFolder
                        key={folder.id}
                        folder={folder}
                        isExpanded={isExpanded}
                        folderUnread={folderUnread}
                        onToggle={() => toggleFolder(folder.id)}
                      >
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(e) => handleFeedDragEnd(folderFeeds, e)}
                        >
                          <SortableContext
                            items={folderFeeds.map((f) => f.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {folderFeeds.map((feed) => {
                              const count = getUnreadCount(
                                unreadCounts,
                                feed.id
                              );
                              const selected = isItemSelected(selectedSidebar, {
                                type: "feed",
                                id: feed.id,
                              });
                              return (
                                <SortableFeedItem
                                  key={feed.id}
                                  feed={feed}
                                  count={count}
                                  selected={selected}
                                  indented
                                  onClick={() =>
                                    setSelectedSidebar({
                                      type: "feed",
                                      id: feed.id,
                                    })
                                  }
                                />
                              );
                            })}
                          </SortableContext>
                        </DndContext>
                      </SortableFolder>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {/* Feeds without folder - Drag sortable */}
        {feedsWithoutFolder.length > 0 && (
          <div className="mt-4 px-2">
            <div className="mb-1 flex items-center gap-1 px-3 py-1 text-xs font-medium uppercase tracking-wider text-text-tertiary">
              <Rss className="h-3.5 w-3.5" />
              订阅源
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => handleFeedDragEnd(feedsWithoutFolder, e)}
            >
              <SortableContext
                items={feedsWithoutFolder.map((f) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-0.5">
                  {feedsWithoutFolder.map((feed) => {
                    const count = getUnreadCount(unreadCounts, feed.id);
                    const selected = isItemSelected(selectedSidebar, {
                      type: "feed",
                      id: feed.id,
                    });
                    return (
                      <SortableFeedItem
                        key={feed.id}
                        feed={feed}
                        count={count}
                        selected={selected}
                        onClick={() =>
                          setSelectedSidebar({ type: "feed", id: feed.id })
                        }
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
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
