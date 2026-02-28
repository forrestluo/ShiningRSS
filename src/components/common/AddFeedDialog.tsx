import { useState } from "react";
import { X, Loader2, Rss, Plus, Search } from "lucide-react";
import { useAppStore } from "../../stores/app-store";
import { api } from "../../services/tauri-api";

const OPT_NEW_FOLDER = "__new_folder__";

export default function AddFeedDialog() {
  const {
    showAddFeed,
    setShowAddFeed,
    subscribeFeed,
    folders,
    addFolder,
    loadFeeds,
  } = useAppStore();

  const [url, setUrl] = useState("");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [discoveredFeeds, setDiscoveredFeeds] = useState<string[]>([]);

  const handleClose = () => {
    setShowAddFeed(false);
    setUrl("");
    setFolderId(null);
    setShowNewFolder(false);
    setNewFolderName("");
    setError(null);
    setDiscoveredFeeds([]);
  };

  const handleDiscover = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError("请输入网站地址");
      return;
    }
    setDiscovering(true);
    setError(null);
    setDiscoveredFeeds([]);
    try {
      const feeds = await api.discoverFeed(trimmedUrl);
      if (feeds.length === 0) {
        setError("未发现任何 RSS/Atom 订阅源");
      } else {
        setDiscoveredFeeds(feeds);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "自动发现失败");
    } finally {
      setDiscovering(false);
    }
  };

  const handleSubscribe = async () => {
    const feedUrl = url.trim();
    if (!feedUrl) {
      setError("请输入订阅源地址");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let targetFolderId: string | null = folderId;

      if (showNewFolder && newFolderName.trim()) {
        const folder = await addFolder(newFolderName.trim());
        targetFolderId = folder.id;
      } else if (folderId && folderId !== OPT_NEW_FOLDER) {
        targetFolderId = folderId;
      } else {
        targetFolderId = null;
      }

      await subscribeFeed(feedUrl, targetFolderId);
      await loadFeeds();
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "订阅失败，请检查地址是否正确");
    } finally {
      setLoading(false);
    }
  };

  const handleFolderChange = (value: string) => {
    if (value === OPT_NEW_FOLDER) {
      setShowNewFolder(true);
      setFolderId(OPT_NEW_FOLDER);
    } else {
      setShowNewFolder(false);
      setFolderId(value || null);
    }
  };

  if (!showAddFeed) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-md rounded-xl bg-bg-primary p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 rounded-lg p-1.5 text-text-secondary hover:bg-bg-hover hover:text-text-primary"
          onClick={handleClose}
          aria-label="关闭"
        >
          <X size={20} />
        </button>

        <div className="mb-6 flex items-center gap-2">
          <Rss size={24} className="text-primary" />
          <h2 className="text-lg font-semibold text-text-primary">添加订阅源</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              订阅地址
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                className="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-2.5 text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="输入 RSS 订阅源地址..."
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setDiscoveredFeeds([]);
                }}
                disabled={loading}
              />
              <button
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-primary disabled:opacity-60"
                onClick={handleDiscover}
                disabled={loading || discovering}
                title="自动发现"
              >
                {discovering ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Search size={16} />
                )}
                发现
              </button>
            </div>

            {discoveredFeeds.length > 0 && (
              <div className="mt-2 rounded-lg border border-border">
                <p className="px-3 py-1.5 text-xs text-text-tertiary">
                  发现 {discoveredFeeds.length} 个订阅源，点击选择：
                </p>
                {discoveredFeeds.map((feedUrl) => (
                  <button
                    key={feedUrl}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-bg-hover ${
                      url === feedUrl
                        ? "bg-primary-light text-primary"
                        : "text-text-primary"
                    }`}
                    onClick={() => setUrl(feedUrl)}
                  >
                    {feedUrl}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              分组
            </label>
            <select
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2.5 text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={folderId ?? ""}
              onChange={(e) => handleFolderChange(e.target.value)}
              disabled={loading}
            >
              <option value="">无分组</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
              <option value={OPT_NEW_FOLDER}>新建文件夹</option>
            </select>

            {showNewFolder && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  className="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary placeholder:text-text-tertiary"
                  placeholder="输入新文件夹名称"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger dark:bg-red-900/20">
              {error}
            </p>
          )}

          <button
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 font-medium text-white hover:bg-primary-hover disabled:opacity-60"
            onClick={handleSubscribe}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                订阅中...
              </>
            ) : (
              <>
                <Plus size={18} />
                订阅
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
