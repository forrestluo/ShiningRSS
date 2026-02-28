# ShiningRSS

## Cursor Cloud specific instructions

- This is a Tauri 2 + React + TypeScript RSS reader application.
- **Install dependencies**: `npm install` at the project root.
- **Run the development server** (frontend only, in browser): `npm run dev` (starts on http://localhost:5173)
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

### Caveats

- The Tauri backend (Rust) handles RSS fetching and SQLite database operations.
- The frontend communicates with the backend via `@tauri-apps/api/core` `invoke()`.
- When running in browser-only mode (`npm run dev`), Tauri commands are not available; the app will show an initialization error.
- AI features use direct HTTP calls from the frontend to LLM provider APIs (OpenAI-compatible).
