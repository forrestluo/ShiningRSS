# ShiningRSS

现代 AI RSS 阅读器，支持 Windows / macOS 桌面端。

## 功能特性

- **RSS/Atom 订阅管理**：添加、分组、刷新、删除订阅源
- **三栏布局**：侧边栏 → 文章列表 → 阅读面板
- **AI 智能**：文章摘要、翻译为中文、时间线总结、自动标签
- **BYOK**：自带 API Key，支持 OpenAI / Anthropic / DeepSeek / 自定义端点
- **OPML 导入导出**：兼容主流阅读器
- **明暗主题**：一键切换
- **键盘快捷键**：J/K 上下切换、S 收藏、Shift+R 刷新

## 技术栈

- **前端**：React 19 + TypeScript + Tailwind CSS 4 + Zustand
- **桌面**：Tauri 2（Rust 后端）
- **数据库**：SQLite（本地存储）
- **RSS 解析**：feed-rs（Rust）

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
# 仅前端（浏览器预览）
npm run dev

# 完整桌面应用
npm run tauri dev
```

### 构建

```bash
# 构建前端
npm run build

# 构建桌面安装包
npm run tauri build
```

## 项目结构

```
├── src/                    # React 前端
│   ├── components/         # UI 组件
│   │   ├── sidebar/        # 侧边栏
│   │   ├── article-list/   # 文章列表
│   │   ├── reader/         # 阅读面板
│   │   ├── settings/       # 设置
│   │   └── common/         # 公共组件
│   ├── services/           # API 服务层
│   ├── stores/             # Zustand 状态管理
│   └── types/              # TypeScript 类型
├── src-tauri/              # Tauri/Rust 后端
│   └── src/
│       ├── lib.rs          # 入口
│       ├── db.rs           # 数据库操作
│       └── rss.rs          # RSS 解析
└── package.json
```

## 许可证

MIT
