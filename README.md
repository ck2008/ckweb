# CK Web

以 GitHub Pages、Supabase 與本機 Codex CLI 工作器組成的個人 AI 工作平台。

## 啟用步驟

1. 在 Supabase SQL Editor 依序執行 `supabase/migrations/001_ckweb.sql` 與 `supabase/migrations/002_worker_grants.sql`。
2. 在 Authentication 啟用 Email 與 Google，Google 的 redirect URL 加入 `https://ck2008.github.io/ckweb/`。
3. 僅在本機 `local-worker/.env` 設定 Supabase `service_role` key（絕不提交或貼到前端）。
4. 在 `local-worker` 執行 `npm install`，再以 `npm start` 啟動已登入 Codex CLI 的輪詢工作器。

## 工作器開機自動啟動

登入時由 Startup 資料夾的捷徑 `CK Web Codex worker.lnk` 啟動 `local-worker/start-worker.cmd`：

- 透過 `conhost --headless` 執行，不會出現主控台視窗。
- 崩潰後 15 秒自動重啟。
- `worker.lock` 做單一實例保護，重複登入或手動雙擊不會起第二個工作器（本專案設計為一次只跑一個 Codex 任務）。
- 啟動器層級訊息寫在 `worker-launch.log`；Codex 輸出仍在 `worker.log` / `worker-error.log`。

重建捷徑（不需要管理員權限，在 PowerShell 執行）：

```powershell
$dir = 'C:\Users\Administrator\Documents\Codex\2026-09-01\xy\local-worker'
$sh = New-Object -ComObject WScript.Shell
$s = $sh.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Startup')) 'CK Web Codex worker.lnk'))
$s.TargetPath = 'C:\WINDOWS\system32\conhost.exe'
$s.Arguments = '--headless cmd.exe /c "' + (Join-Path $dir 'start-worker.cmd') + '"'
$s.WorkingDirectory = $dir
$s.Save()
```

側邊欄的工作器指示燈由 `workers.last_seen_at` 推算：超過 30 秒沒有心跳就顯示離線與離線時長，不再是固定的綠燈。

首次版本透過工作器主動輪詢任務，不需將本機 port 暴露到網路。Cloudflare Tunnel 可保留給日後受 Cloudflare Access 保護的管理入口。
