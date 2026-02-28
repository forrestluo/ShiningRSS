use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

pub struct Database {
    pub path: PathBuf,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Folder {
    pub id: String,
    pub name: String,
    pub sort_order: i32,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Feed {
    pub id: String,
    pub title: String,
    pub url: String,
    pub feed_url: String,
    pub description: String,
    pub favicon: String,
    pub folder_id: Option<String>,
    pub last_fetched_at: Option<String>,
    pub refresh_interval: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Article {
    pub id: String,
    pub feed_id: String,
    pub title: String,
    pub url: String,
    pub content: String,
    pub summary: String,
    pub author: String,
    pub published_at: String,
    pub is_read: bool,
    pub is_starred: bool,
    pub ai_summary: Option<String>,
    pub ai_summary_model: Option<String>,
    pub ai_translation: Option<String>,
    pub ai_labels: Option<String>,
    pub created_at: String,
    pub guid: String,
    pub feed_title: Option<String>,
    pub feed_favicon: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ArticleInput {
    pub id: String,
    pub feed_id: String,
    pub title: String,
    pub url: String,
    pub content: String,
    pub summary: String,
    pub author: String,
    pub published_at: String,
    pub guid: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AIConfig {
    pub id: String,
    pub provider: String,
    pub api_key: String,
    pub api_endpoint: String,
    pub model: String,
    pub is_default: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UnreadCount {
    pub feed_id: String,
    pub count: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Settings {
    pub key: String,
    pub value: String,
}

fn open_db(app: &tauri::AppHandle) -> Result<rusqlite::Connection, String> {
    let state = app.state::<Mutex<Database>>();
    let db = state.lock().map_err(|e| format!("获取数据库锁失败: {}", e))?;
    let conn = rusqlite::Connection::open(&db.path)
        .map_err(|e| format!("打开数据库失败: {}", e))?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
        .map_err(|e| format!("设置 PRAGMA 失败: {}", e))?;
    Ok(conn)
}

#[tauri::command]
pub fn init_database(app: tauri::AppHandle) -> Result<(), String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("获取应用数据目录失败: {}", e))?;

    std::fs::create_dir_all(&app_dir)
        .map_err(|e| format!("创建数据目录失败: {}", e))?;

    let db_path = app_dir.join("shiningrss.db");

    app.manage(Mutex::new(Database {
        path: db_path.clone(),
    }));

    let conn = rusqlite::Connection::open(&db_path)
        .map_err(|e| format!("打开数据库失败: {}", e))?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
        .map_err(|e| format!("设置 PRAGMA 失败: {}", e))?;

    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS folders (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            sort_order INTEGER DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS feeds (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            url TEXT NOT NULL,
            feed_url TEXT NOT NULL UNIQUE,
            description TEXT DEFAULT '',
            favicon TEXT DEFAULT '',
            folder_id TEXT,
            last_fetched_at TEXT,
            refresh_interval INTEGER DEFAULT 1800,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS articles (
            id TEXT PRIMARY KEY,
            feed_id TEXT NOT NULL,
            title TEXT NOT NULL,
            url TEXT DEFAULT '',
            content TEXT DEFAULT '',
            summary TEXT DEFAULT '',
            author TEXT DEFAULT '',
            published_at TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            is_starred INTEGER DEFAULT 0,
            ai_summary TEXT,
            ai_summary_model TEXT,
            ai_translation TEXT,
            ai_labels TEXT,
            guid TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE,
            UNIQUE(feed_id, guid)
        );

        CREATE TABLE IF NOT EXISTS ai_configs (
            id TEXT PRIMARY KEY,
            provider TEXT NOT NULL,
            api_key TEXT NOT NULL,
            api_endpoint TEXT DEFAULT '',
            model TEXT NOT NULL,
            is_default INTEGER DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_articles_feed_id ON articles(feed_id);
        CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
        CREATE INDEX IF NOT EXISTS idx_articles_is_read ON articles(is_read);
        CREATE INDEX IF NOT EXISTS idx_articles_is_starred ON articles(is_starred);
        CREATE INDEX IF NOT EXISTS idx_feeds_folder_id ON feeds(folder_id);
        ",
    )
    .map_err(|e| format!("创建表失败: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn add_folder(app: tauri::AppHandle, name: String) -> Result<Folder, String> {
    let conn = open_db(&app)?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO folders (id, name, sort_order, created_at) VALUES (?1, ?2, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM folders), ?3)",
        params![id, name, now],
    )
    .map_err(|e| format!("添加文件夹失败: {}", e))?;

    Ok(Folder {
        id,
        name,
        sort_order: 0,
        created_at: now,
    })
}

#[tauri::command]
pub fn get_folders(app: tauri::AppHandle) -> Result<Vec<Folder>, String> {
    let conn = open_db(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, name, sort_order, created_at FROM folders ORDER BY sort_order")
        .map_err(|e| format!("查询文件夹失败: {}", e))?;

    let folders = stmt
        .query_map([], |row| {
            Ok(Folder {
                id: row.get(0)?,
                name: row.get(1)?,
                sort_order: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| format!("读取文件夹失败: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(folders)
}

#[tauri::command]
pub fn update_folder(app: tauri::AppHandle, id: String, name: String) -> Result<(), String> {
    let conn = open_db(&app)?;
    conn.execute("UPDATE folders SET name = ?1 WHERE id = ?2", params![name, id])
        .map_err(|e| format!("更新文件夹失败: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn delete_folder(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let conn = open_db(&app)?;
    conn.execute("UPDATE feeds SET folder_id = NULL WHERE folder_id = ?1", params![id])
        .map_err(|e| format!("移除文件夹关联失败: {}", e))?;
    conn.execute("DELETE FROM folders WHERE id = ?1", params![id])
        .map_err(|e| format!("删除文件夹失败: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn add_feed(
    app: tauri::AppHandle,
    title: String,
    url: String,
    feed_url: String,
    description: String,
    folder_id: Option<String>,
) -> Result<Feed, String> {
    let conn = open_db(&app)?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO feeds (id, title, url, feed_url, description, folder_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)",
        params![id, title, url, feed_url, description, folder_id, now],
    )
    .map_err(|e| format!("添加订阅源失败: {}", e))?;

    Ok(Feed {
        id,
        title,
        url,
        feed_url,
        description,
        favicon: String::new(),
        folder_id,
        last_fetched_at: None,
        refresh_interval: 1800,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn get_feeds(app: tauri::AppHandle) -> Result<Vec<Feed>, String> {
    let conn = open_db(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, title, url, feed_url, description, favicon, folder_id, last_fetched_at, refresh_interval, created_at, updated_at FROM feeds ORDER BY title")
        .map_err(|e| format!("查询订阅源失败: {}", e))?;

    let feeds = stmt
        .query_map([], |row| {
            Ok(Feed {
                id: row.get(0)?,
                title: row.get(1)?,
                url: row.get(2)?,
                feed_url: row.get(3)?,
                description: row.get(4)?,
                favicon: row.get(5)?,
                folder_id: row.get(6)?,
                last_fetched_at: row.get(7)?,
                refresh_interval: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })
        .map_err(|e| format!("读取订阅源失败: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(feeds)
}

#[tauri::command]
pub fn update_feed(
    app: tauri::AppHandle,
    id: String,
    title: Option<String>,
    folder_id: Option<String>,
    last_fetched_at: Option<String>,
) -> Result<(), String> {
    let conn = open_db(&app)?;
    if let Some(t) = title {
        conn.execute("UPDATE feeds SET title = ?1 WHERE id = ?2", params![t, id])
            .map_err(|e| format!("更新订阅源标题失败: {}", e))?;
    }
    if let Some(fid) = &folder_id {
        let fid_val: Option<&str> = if fid.is_empty() { None } else { Some(fid) };
        conn.execute("UPDATE feeds SET folder_id = ?1 WHERE id = ?2", params![fid_val, id])
            .map_err(|e| format!("更新订阅源文件夹失败: {}", e))?;
    }
    if let Some(lf) = last_fetched_at {
        conn.execute(
            "UPDATE feeds SET last_fetched_at = ?1, updated_at = ?1 WHERE id = ?2",
            params![lf, id],
        )
        .map_err(|e| format!("更新订阅源抓取时间失败: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_feed(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let conn = open_db(&app)?;
    conn.execute("DELETE FROM articles WHERE feed_id = ?1", params![id])
        .map_err(|e| format!("删除文章失败: {}", e))?;
    conn.execute("DELETE FROM feeds WHERE id = ?1", params![id])
        .map_err(|e| format!("删除订阅源失败: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn add_articles(app: tauri::AppHandle, articles: Vec<ArticleInput>) -> Result<i32, String> {
    let conn = open_db(&app)?;
    let mut count = 0;

    for article in &articles {
        let result = conn.execute(
            "INSERT OR IGNORE INTO articles (id, feed_id, title, url, content, summary, author, published_at, guid) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                article.id,
                article.feed_id,
                article.title,
                article.url,
                article.content,
                article.summary,
                article.author,
                article.published_at,
                article.guid,
            ],
        );
        if let Ok(rows) = result {
            count += rows as i32;
        }
    }

    Ok(count)
}

fn map_article_row(row: &rusqlite::Row) -> rusqlite::Result<Article> {
    Ok(Article {
        id: row.get(0)?,
        feed_id: row.get(1)?,
        title: row.get(2)?,
        url: row.get(3)?,
        content: row.get(4)?,
        summary: row.get(5)?,
        author: row.get(6)?,
        published_at: row.get(7)?,
        is_read: row.get::<_, i32>(8)? != 0,
        is_starred: row.get::<_, i32>(9)? != 0,
        ai_summary: row.get(10)?,
        ai_summary_model: row.get(11)?,
        ai_translation: row.get(12)?,
        ai_labels: row.get(13)?,
        created_at: row.get(14)?,
        guid: row.get(15)?,
        feed_title: row.get(16)?,
        feed_favicon: row.get(17)?,
    })
}

const ARTICLE_SELECT: &str = "SELECT a.id, a.feed_id, a.title, a.url, a.content, a.summary, a.author, a.published_at, a.is_read, a.is_starred, a.ai_summary, a.ai_summary_model, a.ai_translation, a.ai_labels, a.created_at, a.guid, f.title as feed_title, f.favicon as feed_favicon FROM articles a LEFT JOIN feeds f ON a.feed_id = f.id";

#[tauri::command]
pub fn get_articles(
    app: tauri::AppHandle,
    feed_id: Option<String>,
    folder_id: Option<String>,
    starred_only: bool,
    unread_only: bool,
    limit: i32,
    offset: i32,
) -> Result<Vec<Article>, String> {
    let conn = open_db(&app)?;

    let mut where_clauses = Vec::new();

    if let Some(ref fid) = feed_id {
        where_clauses.push(format!("a.feed_id = '{}'", fid.replace('\'', "''")));
    }
    if let Some(ref flid) = folder_id {
        where_clauses.push(format!(
            "a.feed_id IN (SELECT id FROM feeds WHERE folder_id = '{}')",
            flid.replace('\'', "''")
        ));
    }
    if starred_only {
        where_clauses.push("a.is_starred = 1".to_string());
    }
    if unread_only {
        where_clauses.push("a.is_read = 0".to_string());
    }

    let mut query = ARTICLE_SELECT.to_string();
    if !where_clauses.is_empty() {
        query.push_str(" WHERE ");
        query.push_str(&where_clauses.join(" AND "));
    }
    query.push_str(&format!(
        " ORDER BY a.published_at DESC LIMIT {} OFFSET {}",
        limit, offset
    ));

    let mut stmt = conn.prepare(&query).map_err(|e| format!("查询文章失败: {}", e))?;

    let articles = stmt
        .query_map([], map_article_row)
        .map_err(|e| format!("读取文章失败: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(articles)
}

#[tauri::command]
pub fn get_article(app: tauri::AppHandle, id: String) -> Result<Article, String> {
    let conn = open_db(&app)?;
    let query = format!("{} WHERE a.id = ?1", ARTICLE_SELECT);
    let mut stmt = conn.prepare(&query).map_err(|e| format!("查询文章失败: {}", e))?;

    stmt.query_row(params![id], map_article_row)
        .map_err(|e| format!("文章不存在: {}", e))
}

#[tauri::command]
pub fn mark_article_read(app: tauri::AppHandle, id: String, is_read: bool) -> Result<(), String> {
    let conn = open_db(&app)?;
    conn.execute(
        "UPDATE articles SET is_read = ?1 WHERE id = ?2",
        params![is_read as i32, id],
    )
    .map_err(|e| format!("更新已读状态失败: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn mark_article_starred(
    app: tauri::AppHandle,
    id: String,
    is_starred: bool,
) -> Result<(), String> {
    let conn = open_db(&app)?;
    conn.execute(
        "UPDATE articles SET is_starred = ?1 WHERE id = ?2",
        params![is_starred as i32, id],
    )
    .map_err(|e| format!("更新收藏状态失败: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn mark_all_read(
    app: tauri::AppHandle,
    feed_id: Option<String>,
    folder_id: Option<String>,
) -> Result<(), String> {
    let conn = open_db(&app)?;

    if let Some(fid) = feed_id {
        conn.execute(
            "UPDATE articles SET is_read = 1 WHERE feed_id = ?1 AND is_read = 0",
            params![fid],
        )
        .map_err(|e| format!("标记全部已读失败: {}", e))?;
    } else if let Some(flid) = folder_id {
        conn.execute(
            "UPDATE articles SET is_read = 1 WHERE feed_id IN (SELECT id FROM feeds WHERE folder_id = ?1) AND is_read = 0",
            params![flid],
        )
        .map_err(|e| format!("标记全部已读失败: {}", e))?;
    } else {
        conn.execute("UPDATE articles SET is_read = 1 WHERE is_read = 0", [])
            .map_err(|e| format!("标记全部已读失败: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub fn get_unread_counts(app: tauri::AppHandle) -> Result<Vec<UnreadCount>, String> {
    let conn = open_db(&app)?;
    let mut stmt = conn
        .prepare("SELECT feed_id, COUNT(*) as count FROM articles WHERE is_read = 0 GROUP BY feed_id")
        .map_err(|e| format!("查询未读数失败: {}", e))?;

    let counts = stmt
        .query_map([], |row| {
            Ok(UnreadCount {
                feed_id: row.get(0)?,
                count: row.get(1)?,
            })
        })
        .map_err(|e| format!("读取未读数失败: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(counts)
}

#[tauri::command]
pub fn search_articles(
    app: tauri::AppHandle,
    query: String,
    limit: i32,
) -> Result<Vec<Article>, String> {
    let conn = open_db(&app)?;
    let search_term = format!("%{}%", query);
    let sql = format!(
        "{} WHERE a.title LIKE ?1 OR a.content LIKE ?1 ORDER BY a.published_at DESC LIMIT ?2",
        ARTICLE_SELECT
    );
    let mut stmt = conn.prepare(&sql).map_err(|e| format!("搜索文章失败: {}", e))?;

    let articles = stmt
        .query_map(params![search_term, limit], map_article_row)
        .map_err(|e| format!("读取搜索结果失败: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(articles)
}

#[tauri::command]
pub fn save_ai_config(app: tauri::AppHandle, config: AIConfig) -> Result<(), String> {
    let conn = open_db(&app)?;

    if config.is_default {
        conn.execute("UPDATE ai_configs SET is_default = 0", [])
            .map_err(|e| format!("重置默认配置失败: {}", e))?;
    }

    conn.execute(
        "INSERT OR REPLACE INTO ai_configs (id, provider, api_key, api_endpoint, model, is_default) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            config.id,
            config.provider,
            config.api_key,
            config.api_endpoint,
            config.model,
            config.is_default as i32,
        ],
    )
    .map_err(|e| format!("保存 AI 配置失败: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn delete_ai_config(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let conn = open_db(&app)?;
    conn.execute("DELETE FROM ai_configs WHERE id = ?1", params![id])
        .map_err(|e| format!("删除 AI 配置失败: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn get_ai_config(app: tauri::AppHandle) -> Result<Vec<AIConfig>, String> {
    let conn = open_db(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, provider, api_key, api_endpoint, model, is_default FROM ai_configs ORDER BY is_default DESC")
        .map_err(|e| format!("查询 AI 配置失败: {}", e))?;

    let configs = stmt
        .query_map([], |row| {
            Ok(AIConfig {
                id: row.get(0)?,
                provider: row.get(1)?,
                api_key: row.get(2)?,
                api_endpoint: row.get(3)?,
                model: row.get(4)?,
                is_default: row.get::<_, i32>(5)? != 0,
            })
        })
        .map_err(|e| format!("读取 AI 配置失败: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(configs)
}

#[tauri::command]
pub fn save_ai_summary(
    app: tauri::AppHandle,
    article_id: String,
    summary: String,
    model: String,
) -> Result<(), String> {
    let conn = open_db(&app)?;
    conn.execute(
        "UPDATE articles SET ai_summary = ?1, ai_summary_model = ?2 WHERE id = ?3",
        params![summary, model, article_id],
    )
    .map_err(|e| format!("保存 AI 摘要失败: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn save_ai_translation(
    app: tauri::AppHandle,
    article_id: String,
    translation: String,
) -> Result<(), String> {
    let conn = open_db(&app)?;
    conn.execute(
        "UPDATE articles SET ai_translation = ?1 WHERE id = ?2",
        params![translation, article_id],
    )
    .map_err(|e| format!("保存翻译失败: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn save_ai_labels(
    app: tauri::AppHandle,
    article_id: String,
    labels: String,
) -> Result<(), String> {
    let conn = open_db(&app)?;
    conn.execute(
        "UPDATE articles SET ai_labels = ?1 WHERE id = ?2",
        params![labels, article_id],
    )
    .map_err(|e| format!("保存标签失败: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn save_settings(app: tauri::AppHandle, key: String, value: String) -> Result<(), String> {
    let conn = open_db(&app)?;
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        params![key, value],
    )
    .map_err(|e| format!("保存设置失败: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn get_settings(app: tauri::AppHandle) -> Result<Vec<Settings>, String> {
    let conn = open_db(&app)?;
    let mut stmt = conn
        .prepare("SELECT key, value FROM settings")
        .map_err(|e| format!("查询设置失败: {}", e))?;

    let settings = stmt
        .query_map([], |row| {
            Ok(Settings {
                key: row.get(0)?,
                value: row.get(1)?,
            })
        })
        .map_err(|e| format!("读取设置失败: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(settings)
}
