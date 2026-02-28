use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FeedResult {
    pub title: String,
    pub description: String,
    pub link: String,
    pub feed_url: String,
    pub articles: Vec<ArticleResult>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ArticleResult {
    pub title: String,
    pub link: String,
    pub content: String,
    pub summary: String,
    pub author: String,
    pub published_at: String,
    pub guid: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OpmlFeed {
    pub title: String,
    pub xml_url: String,
    pub html_url: String,
    pub folder: String,
}

#[tauri::command]
pub async fn fetch_feed(url: String) -> Result<FeedResult, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .user_agent("ShiningRSS/0.1")
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败: {}", e))?;

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("读取响应失败: {}", e))?;

    let feed = feed_rs::parser::parse(&bytes[..])
        .map_err(|e| format!("解析 Feed 失败: {}", e))?;

    let title = feed
        .title
        .map(|t| t.content)
        .unwrap_or_else(|| "未知订阅源".to_string());

    let description = feed
        .description
        .map(|d| d.content)
        .unwrap_or_default();

    let link = feed
        .links
        .first()
        .map(|l| l.href.clone())
        .unwrap_or_default();

    let articles: Vec<ArticleResult> = feed
        .entries
        .into_iter()
        .map(|entry| {
            let entry_title = entry
                .title
                .map(|t| t.content)
                .unwrap_or_else(|| "无标题".to_string());

            let entry_link = entry
                .links
                .first()
                .map(|l| l.href.clone())
                .unwrap_or_default();

            let summary_text = entry
                .summary
                .as_ref()
                .map(|s| s.content.clone())
                .unwrap_or_default();

            let content = entry
                .content
                .and_then(|c| c.body)
                .unwrap_or_else(|| summary_text.clone());

            let author = entry
                .authors
                .first()
                .map(|a| a.name.clone())
                .unwrap_or_default();

            let published_at = entry
                .published
                .or(entry.updated)
                .map(|d| d.to_rfc3339())
                .unwrap_or_default();

            let guid = entry.id;

            ArticleResult {
                title: entry_title,
                link: entry_link,
                content,
                summary: summary_text,
                author,
                published_at,
                guid,
            }
        })
        .collect();

    Ok(FeedResult {
        title,
        description,
        link,
        feed_url: url,
        articles,
    })
}

#[tauri::command]
pub fn parse_opml(content: String) -> Result<Vec<OpmlFeed>, String> {
    use quick_xml::events::Event;
    use quick_xml::Reader;

    let mut reader = Reader::from_str(&content);
    let mut feeds = Vec::new();
    let mut current_folder = String::new();
    let mut buf = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) | Ok(Event::Empty(ref e)) if e.name().as_ref() == b"outline" => {
                let mut title = String::new();
                let mut xml_url = String::new();
                let mut html_url = String::new();
                let mut is_folder = true;

                for attr in e.attributes().flatten() {
                    let key = String::from_utf8_lossy(attr.key.as_ref()).to_string();
                    let value = String::from_utf8_lossy(&attr.value).to_string();
                    match key.as_str() {
                        "text" | "title" => title = value,
                        "xmlUrl" => {
                            xml_url = value;
                            is_folder = false;
                        }
                        "htmlUrl" => html_url = value,
                        _ => {}
                    }
                }

                if is_folder {
                    if matches!(e, quick_xml::events::BytesStart { .. }) {
                        current_folder = title;
                    }
                } else {
                    feeds.push(OpmlFeed {
                        title,
                        xml_url,
                        html_url,
                        folder: current_folder.clone(),
                    });
                }
            }
            Ok(Event::End(ref e)) if e.name().as_ref() == b"outline" => {
                current_folder = String::new();
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(format!("解析 OPML 失败: {}", e)),
            _ => {}
        }
        buf.clear();
    }

    Ok(feeds)
}

#[tauri::command]
pub fn generate_opml(feeds: Vec<OpmlFeed>) -> Result<String, String> {
    let mut opml = String::from(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>ShiningRSS Subscriptions</title>
  </head>
  <body>
"#,
    );

    let mut folders: std::collections::HashMap<String, Vec<&OpmlFeed>> = std::collections::HashMap::new();
    let mut no_folder: Vec<&OpmlFeed> = Vec::new();

    for feed in &feeds {
        if feed.folder.is_empty() {
            no_folder.push(feed);
        } else {
            folders.entry(feed.folder.clone()).or_default().push(feed);
        }
    }

    for feed in &no_folder {
        opml.push_str(&format!(
            "    <outline text=\"{}\" title=\"{}\" xmlUrl=\"{}\" htmlUrl=\"{}\" type=\"rss\"/>\n",
            xml_escape(&feed.title),
            xml_escape(&feed.title),
            xml_escape(&feed.xml_url),
            xml_escape(&feed.html_url)
        ));
    }

    for (folder_name, folder_feeds) in &folders {
        opml.push_str(&format!(
            "    <outline text=\"{}\" title=\"{}\">\n",
            xml_escape(folder_name),
            xml_escape(folder_name)
        ));
        for feed in folder_feeds {
            opml.push_str(&format!(
                "      <outline text=\"{}\" title=\"{}\" xmlUrl=\"{}\" htmlUrl=\"{}\" type=\"rss\"/>\n",
                xml_escape(&feed.title),
                xml_escape(&feed.title),
                xml_escape(&feed.xml_url),
                xml_escape(&feed.html_url)
            ));
        }
        opml.push_str("    </outline>\n");
    }

    opml.push_str("  </body>\n</opml>");
    Ok(opml)
}

fn xml_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}
