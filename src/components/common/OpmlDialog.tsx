import { useState, useCallback } from "react";
import { Upload, Download, FileUp, Check, Loader2, X } from "lucide-react";
import { useAppStore } from "../../stores/app-store";
import { api } from "../../services/tauri-api";
import type { OpmlFeed } from "../../types";

export default function OpmlDialog() {
  const { feeds, folders, subscribeFeed } = useAppStore();

  const [parsedFeeds, setParsedFeeds] = useState<(OpmlFeed & { selected: boolean })[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileContent = useCallback(async (content: string) => {
    setError(null);
    setParsedFeeds([]);
    try {
      const result = await api.parseOpml(content);
      if (result.length === 0) {
        setError("未在文件中找到任何订阅源");
        return;
      }
      setParsedFeeds(result.map((f) => ({ ...f, selected: true })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "解析 OPML 文件失败");
    }
  }, []);

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => handleFileContent(reader.result as string);
      reader.readAsText(file);
    },
    [handleFileContent]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => handleFileContent(reader.result as string);
      reader.readAsText(file);
      e.target.value = "";
    },
    [handleFileContent]
  );

  const toggleFeed = (index: number) => {
    setParsedFeeds((prev) =>
      prev.map((f, i) => (i === index ? { ...f, selected: !f.selected } : f))
    );
  };

  const toggleAll = () => {
    const allSelected = parsedFeeds.every((f) => f.selected);
    setParsedFeeds((prev) => prev.map((f) => ({ ...f, selected: !allSelected })));
  };

  const handleImport = async () => {
    const selected = parsedFeeds.filter((f) => f.selected);
    if (selected.length === 0) return;

    setImporting(true);
    setError(null);
    let successCount = 0;

    for (let i = 0; i < selected.length; i++) {
      const feed = selected[i];
      setImportProgress(`正在导入 (${i + 1}/${selected.length}): ${feed.title}`);
      try {
        await subscribeFeed(feed.xml_url);
        successCount++;
      } catch (e) {
        console.error(`导入 ${feed.title} 失败:`, e);
      }
    }

    setImporting(false);
    setImportProgress(null);
    setParsedFeeds([]);
    if (successCount > 0) {
      setError(null);
      setImportProgress(`成功导入 ${successCount} 个订阅源`);
      setTimeout(() => setImportProgress(null), 3000);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const folderMap = new Map(folders.map((f) => [f.id, f.name]));
      const opmlFeeds: OpmlFeed[] = feeds.map((f) => ({
        title: f.title,
        xml_url: f.feed_url,
        html_url: f.url,
        folder: f.folder_id ? folderMap.get(f.folder_id) ?? "" : "",
      }));

      const opmlContent = await api.generateOpml(opmlFeeds);

      const blob = new Blob([opmlContent], { type: "text/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "shiningrss-subscriptions.opml";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "导出失败");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-text-primary">数据管理</h2>

      {/* Import section */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 font-medium text-text-primary">
          <Upload size={18} />
          导入 OPML
        </h3>

        <div
          className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
            dragOver
              ? "border-primary bg-primary-light"
              : "border-border hover:border-primary/50"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
        >
          <FileUp size={32} className="mb-2 text-text-tertiary" />
          <p className="mb-1 text-sm text-text-secondary">
            拖拽 OPML/XML 文件到此处
          </p>
          <p className="text-xs text-text-tertiary">或</p>
          <label className="mt-2 cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover">
            选择文件
            <input
              type="file"
              accept=".opml,.xml"
              className="hidden"
              onChange={handleFileSelect}
            />
          </label>
        </div>

        {parsedFeeds.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-secondary">
                找到 {parsedFeeds.length} 个订阅源
              </p>
              <button
                className="text-sm text-primary hover:underline"
                onClick={toggleAll}
              >
                {parsedFeeds.every((f) => f.selected) ? "取消全选" : "全选"}
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
              {parsedFeeds.map((feed, i) => (
                <label
                  key={i}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-bg-hover"
                >
                  <input
                    type="checkbox"
                    checked={feed.selected}
                    onChange={() => toggleFeed(i)}
                    className="rounded border-border"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-text-primary">
                      {feed.title || feed.xml_url}
                    </p>
                    {feed.folder && (
                      <p className="text-xs text-text-tertiary">{feed.folder}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>

            <button
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover disabled:opacity-60"
              onClick={handleImport}
              disabled={importing || parsedFeeds.filter((f) => f.selected).length === 0}
            >
              {importing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  导入中...
                </>
              ) : (
                <>
                  <Check size={16} />
                  导入选中 ({parsedFeeds.filter((f) => f.selected).length})
                </>
              )}
            </button>
          </div>
        )}

        {importProgress && !importing && (
          <p className="text-sm text-success">{importProgress}</p>
        )}
        {importing && importProgress && (
          <p className="text-sm text-text-secondary">{importProgress}</p>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Export section */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 font-medium text-text-primary">
          <Download size={18} />
          导出 OPML
        </h3>
        <p className="text-sm text-text-tertiary">
          将所有订阅源导出为 OPML 文件，方便迁移到其他阅读器
        </p>
        <button
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover disabled:opacity-60"
          onClick={handleExport}
          disabled={exporting || feeds.length === 0}
        >
          {exporting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              导出中...
            </>
          ) : (
            <>
              <Download size={16} />
              导出 OPML ({feeds.length} 个订阅源)
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger dark:bg-red-900/20">
          <X size={16} />
          {error}
        </div>
      )}
    </div>
  );
}
