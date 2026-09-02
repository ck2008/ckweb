# CK Web

以 GitHub Pages、Supabase 與本機 Codex CLI 工作器組成的個人 AI 工作平台。

## 啟用步驟

1. 在 Supabase SQL Editor 依序執行 `supabase/migrations/001_ckweb.sql` 與 `supabase/migrations/002_worker_grants.sql`。
2. 在 Authentication 啟用 Email 與 Google，Google 的 redirect URL 加入 `https://ck2008.github.io/ckweb/`。
3. 僅在本機 `local-worker/.env` 設定 Supabase `service_role` key（絕不提交或貼到前端）。
4. 在 `local-worker` 執行 `npm install`，再以 `npm start` 啟動已登入 Codex CLI 的輪詢工作器。

首次版本透過工作器主動輪詢任務，不需將本機 port 暴露到網路。Cloudflare Tunnel 可保留給日後受 Cloudflare Access 保護的管理入口。
