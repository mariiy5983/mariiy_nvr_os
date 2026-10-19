# ISO 建置

`build.sh` 在 Linux（建議 GitHub Actions）執行，產出：

- `mariiy_nvr_os-<version>-amd64.iso` — 可 USB 開機的測試系統
- 開機後進入 Mariiy NVR 介面（本機 kiosk）
- 桌面／終端可執行 `mariiy-install` 寫入硬碟

本機 Windows 若未啟用虛擬化，請用 Actions 建置，不要在本機硬建。
