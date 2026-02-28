# ShiningRSS

## Cursor Cloud specific instructions

- This is a Tauri 2 + React 19 + TypeScript + Tailwind CSS 4 RSS reader application.
- **Install dependencies**: `npm install` at the project root.
- **Run the development server** (frontend only, in browser with mock data): `npm run dev` (starts on http://localhost:5173)
- **Run the full desktop app**: `npm run tauri dev` (requires Rust toolchain and system deps)
- **Build frontend**: `npm run build`
- **Type check**: `npx tsc -b`
- **Lint**: `npm run lint`
- **Rust check**: `cargo check --manifest-path src-tauri/Cargo.toml`

### System dependencies (Linux)

```bash
sudo apt-get install -y libwebkit2gtk-4.1-dev libssl-dev libappindicator3-dev librsvg2-dev patchelf pkg-config
```

### Rust toolchain

Requires Rust stable >= 1.77. If the default is too old, run:
```bash
rustup default stable
```

### Browser-only testing

When running `npm run dev`, the app runs in browser with mock data (no Tauri backend). This is suitable for testing UI layout, component interactions, and styling. AI features and real RSS fetching require the full Tauri desktop environment.

### Caveats

- The Tauri backend (Rust) handles RSS fetching, feed discovery, and SQLite database operations.
- The frontend communicates with the backend via `@tauri-apps/api/core` `invoke()`.
- When running in browser-only mode, a mock API layer (`src/services/mock-data.ts`) provides sample data.
- AI features use direct HTTP calls from the frontend to LLM provider APIs (OpenAI-compatible).
- PWA manifest is at `public/manifest.json`.
