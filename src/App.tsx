import { useEffect } from "react";
import { useAppStore } from "./stores/app-store";
import Sidebar from "./components/sidebar/Sidebar";
import ArticleList from "./components/article-list/ArticleList";
import ArticleReader from "./components/reader/ArticleReader";
import SettingsPanel from "./components/settings/SettingsPanel";
import AddFeedDialog from "./components/common/AddFeedDialog";

function App() {
  const { initialized, init, showSettings, showAddFeed, refreshInterval, refreshAllFeeds, mobileView } =
    useAppStore();

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!initialized || refreshInterval <= 0) return;
    const ms = refreshInterval * 60 * 1000;
    const id = setInterval(() => {
      refreshAllFeeds();
    }, ms);
    return () => clearInterval(id);
  }, [initialized, refreshInterval, refreshAllFeeds]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const store = useAppStore.getState();

      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case "j":
        case "ArrowDown": {
          e.preventDefault();
          const { articles, selectedArticle, selectArticle } = store;
          const currentIndex = selectedArticle
            ? articles.findIndex((a) => a.id === selectedArticle.id)
            : -1;
          if (currentIndex < articles.length - 1) {
            selectArticle(articles[currentIndex + 1]);
          }
          break;
        }
        case "k":
        case "ArrowUp": {
          e.preventDefault();
          const { articles, selectedArticle, selectArticle } = store;
          const currentIndex = selectedArticle
            ? articles.findIndex((a) => a.id === selectedArticle.id)
            : articles.length;
          if (currentIndex > 0) {
            selectArticle(articles[currentIndex - 1]);
          }
          break;
        }
        case "s": {
          const { selectedArticle, toggleStarred } = store;
          if (selectedArticle) {
            toggleStarred(selectedArticle);
          }
          break;
        }
        case "r": {
          if (e.shiftKey) {
            store.refreshAllFeeds();
          }
          break;
        }
        case "Escape": {
          const { showSettings, setShowSettings, showAddFeed, setShowAddFeed } =
            store;
          if (showSettings) setShowSettings(false);
          if (showAddFeed) setShowAddFeed(false);
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!initialized) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-text-secondary text-sm">正在加载...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex bg-bg-primary text-text-primary">
      {/* Mobile: show one panel at a time */}
      <div
        className={`md:hidden ${mobileView === "sidebar" ? "flex w-full" : "hidden"}`}
      >
        <Sidebar />
      </div>
      <div
        className={`md:hidden ${mobileView === "list" ? "flex w-full" : "hidden"}`}
      >
        <ArticleList />
      </div>
      <div
        className={`md:hidden ${mobileView === "reader" ? "flex w-full" : "hidden"}`}
      >
        <ArticleReader />
      </div>

      {/* Tablet (md): two-panel layout */}
      <div className="hidden md:flex lg:hidden h-full w-full">
        <Sidebar />
        <ArticleList />
        <ArticleReader />
      </div>

      {/* Desktop (lg+): three-panel layout */}
      <div className="hidden lg:flex h-full w-full">
        <Sidebar />
        <ArticleList />
        <ArticleReader />
      </div>

      {showSettings && <SettingsPanel />}
      {showAddFeed && <AddFeedDialog />}
    </div>
  );
}

export default App;
