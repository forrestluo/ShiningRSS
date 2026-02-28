mod rss;
mod db;

use db::Database;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct AppState {
    pub db: Arc<Mutex<Database>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().level(log::LevelFilter::Info).build())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            rss::fetch_feed,
            rss::parse_opml,
            rss::generate_opml,
            db::init_database,
            db::add_folder,
            db::get_folders,
            db::update_folder,
            db::delete_folder,
            db::add_feed,
            db::get_feeds,
            db::update_feed,
            db::delete_feed,
            db::add_articles,
            db::get_articles,
            db::get_article,
            db::mark_article_read,
            db::mark_article_starred,
            db::mark_all_read,
            db::get_unread_counts,
            db::search_articles,
            db::save_ai_config,
            db::delete_ai_config,
            db::get_ai_config,
            db::save_ai_summary,
            db::save_ai_translation,
            db::save_ai_labels,
            db::save_settings,
            db::get_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
