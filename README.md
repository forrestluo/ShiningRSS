# ShiningRSS

现代 AI RSS 阅读器，支持 Windows / macOS / Linux 桌面端 + PWA 移动端。

## 功能特性

### 核心阅读
- **RSS/Atom 订阅管理**：添加、分组、刷新、删除订阅源
- **三栏布局**：侧边栏 → 文章列表 → 阅读面板
- **Feed 自动发现**：输入网站 URL，自动检测可用的 RSS 源
- **OPML 导入/导出**：兼容主流阅读器，支持拖拽上传
- **自动定时刷新**：可配置刷新间隔（15/30/60/120 分钟）
- **文章搜索**：全文搜索，关键词高亮
- **虚拟列表**：大量文章流畅滚动

### AI 智能
- **文章摘要**：自动/手动生成 AI 精炼摘要
- **文章翻译**：一键翻译为中文
- **时间线总结**：对当前所有文章进行综合分析
- **AI 标签**：自动为文章生成分类标签
- **AI 智能排序**：按内容价值排序文章
- **BYOK**：自带 API Key，支持 OpenAI / Anthropic / DeepSeek / 自定义端点
- **用量统计**：追踪每日 AI 调用次数
- **错误重试**：AI 请求失败自动重试

### 界面体验
- **响应式设计**：桌面三栏 / 平板双栏 / 手机单栏
- **明暗主题**：一键切换
- **拖拽排序**：自由排列 Feed 和文件夹
- **键盘快捷键**：J/K 上下切换、S 收藏、Shift+R 刷新
- **PWA 支持**：可安装到手机桌面

## 技术栈

- **前端**：React 19 + TypeScript + Tailwind CSS 4 + Zustand
- **桌面**：Tauri 2（Rust 后端）
- **数据库**：SQLite（本地存储）
- **RSS 解析**：feed-rs（Rust）
- **虚拟列表**：@tanstack/react-virtual
- **拖拽**：@dnd-kit

## 开发

### 环境要求

- Node.js >= 18
- Rust >= 1.77
- 系统依赖（Linux）：`libwebkit2gtk-4.1-dev libssl-dev`

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# 仅前端（浏览器预览，使用 mock 数据）
npm run dev

# 完整桌面应用（需要 Rust 工具链）
npm run tauri dev
```

### 构建

```bash
# 构建前端
npm run build

# 构建桌面安装包
npm run tauri build
```

### CI/CD

推送 `v*` 标签时自动触发 GitHub Actions 构建 Windows / macOS / Linux 安装包。

## 项目结构

```
├── src/                    # React 前端
│   ├── components/         # UI 组件
│   │   ├── sidebar/        # 侧边栏（含拖拽排序）
│   │   ├── article-list/   # 文章列表（虚拟列表）
│   │   ├── reader/         # 阅读面板（AI 摘要/翻译）
│   │   ├── settings/       # 设置面板
│   │   └── common/         # 公共组件（OPML/添加Feed/时间线总结）
│   ├── services/           # API 服务层 + AI 服务
│   ├── stores/             # Zustand 状态管理
│   └── types/              # TypeScript 类型
├── src-tauri/              # Tauri/Rust 后端
│   └── src/
│       ├── lib.rs          # 入口
│       ├── db.rs           # SQLite 数据库
│       └── rss.rs          # RSS 解析 + Feed 发现
├── .github/workflows/      # CI/CD
└── public/                 # 静态资源 + PWA manifest
```

## 许可证

MIT
