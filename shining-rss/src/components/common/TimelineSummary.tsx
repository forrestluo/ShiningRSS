import { useState } from "react";
import { Sparkles, Loader2, X, FileText } from "lucide-react";
import { useAppStore } from "../../stores/app-store";
import { generateTimelineSummary } from "../../services/ai-service";

export default function TimelineSummary() {
  const { articles, aiConfigs } = useAppStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const defaultConfig = aiConfigs.find((c) => c.is_default) ?? aiConfigs[0];

  const handleClick = async () => {
    if (!defaultConfig) {
      setError("请先在设置中配置 AI 模型");
      setOpen(true);
      return;
    }

    if (articles.length === 0) {
      setError("暂无文章可总结");
      setOpen(true);
      return;
    }

    setOpen(true);
    setLoading(true);
    setSummary(null);
    setError(null);

    try {
      const result = await generateTimelineSummary(defaultConfig, articles);
      setSummary(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成总结失败");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSummary(null);
    setError(null);
  };

  return (
    <>
      <button
        className="flex items-center gap-2 rounded-lg border border-border bg-bg-primary px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-hover"
        onClick={handleClick}
      >
        <Sparkles size={18} className="text-primary" />
        AI 时间线总结
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={handleClose}
        >
          <div
            className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-bg-primary shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border p-4">
              <div className="flex items-center gap-2">
                <FileText size={22} className="text-primary" />
                <h2 className="text-lg font-semibold text-text-primary">
                  AI 时间线总结
                </h2>
              </div>
              <button
                className="rounded-lg p-1.5 text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                onClick={handleClose}
                aria-label="关闭"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loading && (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 size={48} className="animate-spin text-primary" />
                  <p className="mt-4 text-text-secondary">正在生成总结...</p>
                </div>
              )}

              {error && !loading && (
                <div className="rounded-lg bg-red-50 p-4 text-danger dark:bg-red-900/20">
                  {error}
                </div>
              )}

              {summary && !loading && (
                <div className="space-y-4">
                  {summary.split(/\n\n+/).map((paragraph, i) => (
                    <p
                      key={i}
                      className="text-text-primary leading-relaxed"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
