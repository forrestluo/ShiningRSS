import { useState, useEffect } from "react";
import {
  Star,
  StarOff,
  ExternalLink,
  Sparkles,
  Languages,
  Loader2,
  BookOpen,
  Tag,
  Copy,
  Check,
} from "lucide-react";
import { useAppStore } from "../../stores/app-store";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale/zh-CN";
import DOMPurify from "dompurify";
import {
  generateSummary,
  translateArticle,
  generateLabels,
} from "../../services/ai-service";
import type { AIConfig } from "../../types";

export default function ArticleReader() {
  const {
    selectedArticle,
    toggleStarred,
    updateArticleAISummary,
    updateArticleAITranslation,
    updateArticleAILabels,
    autoSummary,
    aiConfigs,
  } = useAppStore();

  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isLabeling, setIsLabeling] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const defaultConfig: AIConfig | undefined =
    aiConfigs.find((c) => c.is_default) ?? aiConfigs[0];

  const runSummary = async () => {
    if (!selectedArticle || !defaultConfig?.api_key) return;
    setIsSummarizing(true);
    setSummaryError(null);
    try {
      const summary = await generateSummary(defaultConfig, selectedArticle);
      updateArticleAISummary(selectedArticle.id, summary, defaultConfig.model);
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : "生成摘要失败");
    } finally {
      setIsSummarizing(false);
    }
  };

  const runLabels = async () => {
    if (!selectedArticle || !defaultConfig?.api_key) return;
    setIsLabeling(true);
    try {
      const labels = await generateLabels(defaultConfig, selectedArticle);
      updateArticleAILabels(selectedArticle.id, labels.join(","));
    } catch {
      // 静默失败
    } finally {
      setIsLabeling(false);
    }
  };

  const runTranslation = async () => {
    if (!selectedArticle || !defaultConfig?.api_key) return;
    setIsTranslating(true);
    setTranslationError(null);
    try {
      const translation = await translateArticle(defaultConfig, selectedArticle);
      updateArticleAITranslation(selectedArticle.id, translation);
    } catch (e) {
      setTranslationError(e instanceof Error ? e.message : "翻译失败");
    } finally {
      setIsTranslating(false);
    }
  };

  useEffect(() => {
    if (!selectedArticle || !autoSummary || !defaultConfig?.api_key) return;
    if (selectedArticle.ai_summary) return;

    runSummary();
    if (!selectedArticle.ai_labels) {
      runLabels();
    }
  }, [selectedArticle?.id, autoSummary, !!selectedArticle?.ai_summary]);

  if (!selectedArticle) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-bg-primary p-8 text-center">
        <BookOpen className="mb-4 size-16 text-text-tertiary" />
        <p className="text-text-secondary">选择一篇文章开始阅读</p>
      </div>
    );
  }

  const labels = selectedArticle.ai_labels
    ? selectedArticle.ai_labels.split(/[,，]/).map((l) => l.trim()).filter(Boolean)
    : [];

  const handleCopyLink = () => {
    if (selectedArticle.url) {
      navigator.clipboard.writeText(selectedArticle.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const publishedDate = selectedArticle.published_at
    ? format(new Date(selectedArticle.published_at), "yyyy年M月d日 HH:mm", {
        locale: zhCN,
      })
    : "";

  const contentHtml = selectedArticle.content || selectedArticle.summary || "";
  const sanitizedContent = DOMPurify.sanitize(contentHtml);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-bg-primary">
      {/* Header toolbar */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleStarred(selectedArticle)}
            className="rounded p-1.5 text-text-secondary transition hover:bg-bg-hover hover:text-primary"
            title={selectedArticle.is_starred ? "取消收藏" : "收藏"}
          >
            {selectedArticle.is_starred ? (
              <Star className="size-5 fill-primary text-primary" />
            ) : (
              <StarOff className="size-5" />
            )}
          </button>
          <button
            onClick={() => selectedArticle.url && window.open(selectedArticle.url)}
            className="rounded p-1.5 text-text-secondary transition hover:bg-bg-hover hover:text-primary"
            title="在浏览器中打开"
          >
            <ExternalLink className="size-5" />
          </button>
          <button
            onClick={handleCopyLink}
            className="rounded p-1.5 text-text-secondary transition hover:bg-bg-hover hover:text-primary"
            title="复制链接"
          >
            {copied ? (
              <Check className="size-5 text-success" />
            ) : (
              <Copy className="size-5" />
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Article metadata */}
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
          {selectedArticle.feed_title && (
            <span>{selectedArticle.feed_title}</span>
          )}
          {selectedArticle.author && (
            <>
              <span>·</span>
              <span>{selectedArticle.author}</span>
            </>
          )}
          {publishedDate && (
            <>
              <span>·</span>
              <span>{publishedDate}</span>
            </>
          )}
        </div>

        {/* Article title */}
        <h1 className="mb-4 text-2xl font-bold text-text-primary">
          {selectedArticle.title}
        </h1>

        {/* AI Summary card */}
        <div className="mb-4">
          {selectedArticle.ai_summary ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="size-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  AI 摘要
                  {selectedArticle.ai_summary_model && (
                    <span className="ml-1 text-blue-600/80 dark:text-blue-400/80">
                      ({selectedArticle.ai_summary_model})
                    </span>
                  )}
                </span>
              </div>
              <p className="text-sm text-text-secondary">
                {selectedArticle.ai_summary}
              </p>
            </div>
          ) : isSummarizing ? (
            <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950/30">
              <Loader2 className="size-4 animate-spin text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-text-secondary">
                正在生成摘要...
              </span>
            </div>
          ) : summaryError ? (
            <div className="rounded-lg border border-danger/30 bg-danger/10 p-4">
              <p className="text-sm text-danger">{summaryError}</p>
              <button
                onClick={runSummary}
                className="mt-2 text-sm text-primary hover:underline"
              >
                重试
              </button>
            </div>
          ) : autoSummary ? null : (
            <button
              onClick={runSummary}
              disabled={!defaultConfig?.api_key}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-800 transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50"
            >
              <Sparkles className="size-4" />
              AI 摘要
            </button>
          )}
        </div>

        {/* AI Labels */}
        {(labels.length > 0 || isLabeling) && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {isLabeling && (
              <span className="inline-flex items-center gap-1.5 text-sm text-text-tertiary">
                <Loader2 className="size-3.5 animate-spin" />
                正在生成标签...
              </span>
            )}
            {labels.map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary"
              >
                <Tag className="size-3" />
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Article content */}
        <div
          className="article-content mb-6"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />

        {/* AI Translation section */}
        <div className="mb-6">
          <button
            onClick={runTranslation}
            disabled={isTranslating || !defaultConfig?.api_key}
            className="inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800 transition hover:bg-green-100 disabled:opacity-50 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300 dark:hover:bg-green-950/50"
          >
            {isTranslating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Languages className="size-4" />
            )}
            翻译为中文
          </button>

          {selectedArticle.ai_translation && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
              <div className="mb-2 flex items-center gap-2">
                <Languages className="size-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-800 dark:text-green-300">
                  AI 翻译
                </span>
              </div>
              <div
                className="article-content text-sm text-text-secondary"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(selectedArticle.ai_translation),
                }}
              />
            </div>
          )}

          {isTranslating && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950/30">
              <Loader2 className="size-4 animate-spin text-green-600 dark:text-green-400" />
              <span className="text-sm text-text-secondary">正在翻译...</span>
            </div>
          )}

          {translationError && !selectedArticle.ai_translation && (
            <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-4">
              <p className="text-sm text-danger">{translationError}</p>
              <button
                onClick={runTranslation}
                className="mt-2 text-sm text-primary hover:underline"
              >
                重试
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
