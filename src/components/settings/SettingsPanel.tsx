import { useState } from "react";
import {
  X,
  Bot,
  Palette,
  Rss,
  Plus,
  Trash2,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAppStore } from "../../stores/app-store";
import { AI_PROVIDERS, type AIConfig } from "../../types";
import type { Feed } from "../../types";

const TABS = [
  { id: "ai", label: "AI 模型", icon: Bot },
  { id: "appearance", label: "外观", icon: Palette },
  { id: "feeds", label: "订阅管理", icon: Rss },
] as const;

export default function SettingsPanel() {
  const {
    showSettings,
    setShowSettings,
    settingsTab,
    setSettingsTab,
    darkMode,
    setDarkMode,
    autoSummary,
    setAutoSummary,
    aiConfigs,
    saveAIConfig,
    deleteAIConfig,
    folders,
    feeds,
    deleteFeed,
    updateFeedFolder,
  } = useAppStore();

  const [editingConfig, setEditingConfig] = useState<AIConfig | null>(null);
  const [newConfig, setNewConfig] = useState<Partial<AIConfig> | null>(null);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});

  const toggleApiKeyVisibility = (id: string) => {
    setShowApiKey((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveConfig = async (config: AIConfig) => {
    try {
      await saveAIConfig(config);
      setEditingConfig(null);
    } catch (e) {
      console.error("保存 AI 配置失败:", e);
    }
  };

  const handleDeleteConfig = async (id: string) => {
    try {
      await deleteAIConfig(id);
      setEditingConfig(null);
    } catch (e) {
      console.error("删除 AI 配置失败:", e);
    }
  };

  const handleAddConfig = () => {
    const provider = AI_PROVIDERS[0];
    setNewConfig({
      id: crypto.randomUUID(),
      provider: provider.id,
      api_key: "",
      api_endpoint: provider.defaultEndpoint,
      model: provider.models[0] ?? "",
      is_default: aiConfigs.length === 0,
    });
  };

  const handleSaveNewConfig = async () => {
    if (!newConfig || !newConfig.provider || !newConfig.api_key || !newConfig.model) return;
    try {
      await saveAIConfig({
        id: newConfig.id!,
        provider: newConfig.provider,
        api_key: newConfig.api_key,
        api_endpoint: newConfig.api_endpoint ?? "",
        model: newConfig.model,
        is_default: newConfig.is_default ?? false,
      });
      setNewConfig(null);
    } catch (e) {
      console.error("添加 AI 配置失败:", e);
    }
  };

  const getFolderNameForId = (folderId: string | null) => {
    if (!folderId) return "无分组";
    const folder = folders.find((f) => f.id === folderId);
    return folder?.name ?? "未知";
  };

  if (!showSettings) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={() => setShowSettings(false)}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl bg-bg-primary shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 rounded-lg p-1.5 text-text-secondary hover:bg-bg-hover hover:text-text-primary"
          onClick={() => setShowSettings(false)}
          aria-label="关闭"
        >
          <X size={20} />
        </button>

        <nav className="flex w-48 flex-col border-r border-border bg-bg-secondary p-3">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                settingsTab === tab.id
                  ? "bg-primary-light text-primary dark:bg-primary-light"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              }`}
              onClick={() => setSettingsTab(tab.id)}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto p-6">
          {settingsTab === "ai" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-text-primary">AI 模型配置</h2>

              {aiConfigs.map((config) => (
                <div
                  key={config.id}
                  className="rounded-lg border border-border bg-bg-secondary p-4"
                >
                  {editingConfig?.id === config.id ? (
                    <AIConfigForm
                      config={editingConfig}
                      showKey={showApiKey[config.id] ?? false}
                      onToggleKey={() => toggleApiKeyVisibility(config.id)}
                      onSave={handleSaveConfig}
                      onDelete={() => handleDeleteConfig(config.id)}
                      onCancel={() => setEditingConfig(null)}
                    />
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-text-primary">
                          {AI_PROVIDERS.find((p) => p.id === config.provider)?.name ?? config.provider} - {config.model}
                          {config.is_default && (
                            <span className="ml-2 text-xs text-primary">默认</span>
                          )}
                        </p>
                        <p className="text-sm text-text-tertiary">{config.api_endpoint || "默认端点"}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="rounded-lg bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary-hover"
                          onClick={() => setEditingConfig(config)}
                        >
                          编辑
                        </button>
                        <button
                          className="rounded-lg px-3 py-1.5 text-sm text-danger hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => handleDeleteConfig(config.id)}
                        >
                          <Trash2 size={16} className="inline" /> 删除
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {newConfig ? (
                <div className="rounded-lg border border-border border-dashed bg-bg-secondary p-4">
                  <AIConfigForm
                    config={newConfig as AIConfig}
                    showKey={showApiKey["new"] ?? false}
                    onToggleKey={() => toggleApiKeyVisibility("new")}
                    onSave={handleSaveNewConfig}
                    onCancel={() => setNewConfig(null)}
                    isNew
                  />
                </div>
              ) : (
                <button
                  className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-4 text-text-secondary transition-colors hover:border-primary hover:text-primary"
                  onClick={handleAddConfig}
                >
                  <Plus size={20} />
                  添加配置
                </button>
              )}
            </div>
          )}

          {settingsTab === "appearance" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-text-primary">外观设置</h2>

              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="font-medium text-text-primary">深色模式</p>
                  <p className="text-sm text-text-tertiary">切换应用主题</p>
                </div>
                <button
                  className={`relative h-8 w-14 rounded-full transition-colors ${
                    darkMode ? "bg-primary" : "bg-bg-tertiary"
                  }`}
                  onClick={() => setDarkMode(!darkMode)}
                  role="switch"
                  aria-checked={darkMode}
                >
                  <span
                    className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                      darkMode ? "left-7" : "left-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="font-medium text-text-primary">AI 自动摘要</p>
                  <p className="text-sm text-text-tertiary">
                    开启后，查看文章时自动生成AI摘要；关闭后需手动点击按钮生成
                  </p>
                </div>
                <button
                  className={`relative h-8 w-14 rounded-full transition-colors ${
                    autoSummary ? "bg-primary" : "bg-bg-tertiary"
                  }`}
                  onClick={() => setAutoSummary(!autoSummary)}
                  role="switch"
                  aria-checked={autoSummary}
                >
                  <span
                    className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                      autoSummary ? "left-7" : "left-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {settingsTab === "feeds" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-text-primary">订阅管理</h2>

              <div className="space-y-2">
                {feeds.map((feed) => (
                  <FeedRow
                    key={feed.id}
                    feed={feed}
                    folders={folders}
                    getFolderName={getFolderNameForId}
                    onDelete={() => deleteFeed(feed.id)}
                    onMoveFolder={(folderId) => updateFeedFolder(feed.id, folderId)}
                  />
                ))}
                {feeds.length === 0 && (
                  <p className="py-8 text-center text-text-tertiary">暂无订阅源</p>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

interface AIConfigFormProps {
  config: AIConfig | Partial<AIConfig>;
  showKey: boolean;
  onToggleKey: () => void;
  onSave: (config: AIConfig) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isNew?: boolean;
}

function AIConfigForm({
  config,
  showKey,
  onToggleKey,
  onSave,
  onCancel,
  onDelete,
  isNew,
}: AIConfigFormProps) {
  const [local, setLocal] = useState({
    provider: config.provider ?? "openai",
    api_key: config.api_key ?? "",
    api_endpoint: config.api_endpoint ?? "",
    model: config.model ?? "",
    is_default: config.is_default ?? false,
  });

  const provider = AI_PROVIDERS.find((p) => p.id === local.provider);
  const models = provider?.models ?? [];
  const isCustom = local.provider === "custom";

  const handleProviderChange = (providerId: string) => {
    const p = AI_PROVIDERS.find((x) => x.id === providerId);
    setLocal((prev) => ({
      ...prev,
      provider: providerId,
      api_endpoint: p?.defaultEndpoint ?? "",
      model: p?.models[0] ?? prev.model,
    }));
  };

  const handleSave = () => {
    const fullConfig: AIConfig = {
      id: config.id!,
      provider: local.provider,
      api_key: local.api_key,
      api_endpoint: local.api_endpoint,
      model: local.model,
      is_default: local.is_default,
    };
    onSave(fullConfig);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-text-secondary">提供商</label>
        <select
          className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary"
          value={local.provider}
          onChange={(e) => handleProviderChange(e.target.value)}
        >
          {AI_PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-text-secondary">API Key</label>
        <div className="flex gap-2">
          <input
            type={showKey ? "text" : "password"}
            className="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary"
            value={local.api_key}
            onChange={(e) => setLocal((p) => ({ ...p, api_key: e.target.value }))}
            placeholder="输入 API Key"
          />
          <button
            type="button"
            className="rounded-lg border border-border p-2 text-text-secondary hover:bg-bg-hover"
            onClick={onToggleKey}
          >
            {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-text-secondary">API 端点</label>
        <input
          type="url"
          className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary"
          value={local.api_endpoint}
          onChange={(e) => setLocal((p) => ({ ...p, api_endpoint: e.target.value }))}
          placeholder="https://api.openai.com/v1"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-text-secondary">模型</label>
        {isCustom ? (
          <input
            type="text"
            className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary"
            value={local.model}
            onChange={(e) => setLocal((p) => ({ ...p, model: e.target.value }))}
            placeholder="输入模型名称"
          />
        ) : (
          <select
            className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary"
            value={local.model}
            onChange={(e) => setLocal((p) => ({ ...p, model: e.target.value }))}
          >
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        )}
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={local.is_default}
          onChange={(e) => setLocal((p) => ({ ...p, is_default: e.target.checked }))}
          className="rounded border-border"
        />
        <span className="text-sm text-text-secondary">设为默认</span>
      </label>

      <div className="flex gap-2">
        <button
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover"
          onClick={handleSave}
        >
          <Save size={16} />
          保存
        </button>
        <button
          className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
          onClick={onCancel}
        >
          取消
        </button>
        {onDelete && !isNew && (
          <button
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-danger hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={onDelete}
          >
            <Trash2 size={16} />
            删除
          </button>
        )}
      </div>
    </div>
  );
}

interface FeedRowProps {
  feed: Feed;
  folders: { id: string; name: string }[];
  getFolderName: (folderId: string | null) => string;
  onDelete: () => void;
  onMoveFolder: (folderId: string | null) => void;
}

function FeedRow({ feed, folders, getFolderName, onDelete, onMoveFolder }: FeedRowProps) {
  const [showMove, setShowMove] = useState(false);

  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-text-primary">{feed.title}</p>
        <p className="text-sm text-text-tertiary">
          {getFolderName(feed.folder_id)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {showMove ? (
          <select
            className="rounded-lg border border-border bg-bg-primary px-2 py-1 text-sm text-text-primary"
            value={feed.folder_id ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              onMoveFolder(val ? val : null);
              setShowMove(false);
            }}
            onBlur={() => setShowMove(false)}
            autoFocus
          >
            <option value="">无分组</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        ) : (
          <button
            className="rounded-lg px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover"
            onClick={() => setShowMove(true)}
          >
            移动
          </button>
        )}
        <button
          className="rounded-lg px-3 py-1.5 text-sm text-danger hover:bg-red-50 dark:hover:bg-red-900/20"
          onClick={onDelete}
        >
          <Trash2 size={16} className="inline" /> 删除
        </button>
      </div>
    </div>
  );
}
