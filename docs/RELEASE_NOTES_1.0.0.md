# Mariiy NVR OS 1.0.0

正式版完整離線安裝媒體與系統全面修復。

## 主要修正與更新

1. **安裝媒體與多硬碟啟動修正**
   - 修正 `grub-2.14` 套件 trigger 於離線安裝階段提前呼叫 `update-grub` 導致安裝中斷的問題。
   - 核心模組載入順序優先載入 `mptspi` / `vmw_pvscsi`，使 VMware 主硬碟（`scsi0:0`）與 BIOS 第一開機碟（`/dev/sda`）完全一致。
   - 預設自動挑選系統碟（保留大容量硬碟作為錄影碟），並支援輸入磁碟編號指定目標硬碟，以及 10 秒倒數自動安裝與安裝完成後自動退片重開機。
   - 採用檔案系統 `UUID` 寫入 `/boot/grub/grub.cfg` 與 `/etc/fstab`（搭配 `rootflags=rw`），並自動清理其他硬碟上舊版殘留的 `MARIIY_ROOT` 標籤（轉為 `MARIIY_REC` 錄影碟），徹底解決多硬碟環境誤掛載舊版系統的問題。
   - 同時安裝 BIOS (`i386-pc`) 與 UEFI (`x86_64-efi --removable --no-nvram`) 雙引導，無論主機板為 Legacy BIOS 或 UEFI 皆可直接開機。

2. **圖形介面（Xorg / KMS / 輸入裝置 / Firefox Kiosk）修正**
   - 補齊 `udev-init-scripts-openrc`、`eudev-openrc`、`dbus-openrc`、`acpid-openrc` 等 OpenRC 服務套件，解決開機後 `udevd` 未啟動導致 Xorg 無法偵測鍵盤與滑鼠的問題。
   - 移除不支援 KMS 的舊版 `xf86-video-vmware` 驅動（解決 Segmentation fault 崩潰與黑畫面），統一採用原生 KMS `modesetting` 驅動（同時相容 VMware `vmwgfx` 與 Intel N100/N95 `i915`/`xe` VAAPI）。
   - 預置 Firefox Enterprise Policy (`policies.json`) 與 Kiosk 設定檔，關閉首次啟動歡迎分頁與外部連線檢查，開機直接進入全螢幕 1920×1080 Mariiy NVR 介面。

3. **後端 Agent 與前端介面修正**
   - 修正 ONVIF `GetStreamUri` 未自動帶入攝影機帳號密碼導致 RTSP `401 Unauthorized` 的問題，並加入時間偏移校正 (`adjust_time`) 與多網路介面 WS-Discovery 廣播容錯。
   - 補齊抓圖圖片靜態路由 (`GET /api/snapshots/{filename}`)、PTZ 雲台控制 API (`POST /api/channels/{id}/ptz`)、遠端網域同步 API (`/api/remote`) 與真實主機重啟／關機 API (`/api/system/reboot`、`/api/system/poweroff`)。
   - 自動偵測真實系統碟與錄影碟狀態、網卡 IP/MAC 與硬體資訊，並修正遠端設定 QR Code 於本機 Kiosk 顯示 `127.0.0.1` 的問題（改為自動帶入主機區域網路 IP）。

## 安裝檔案

- **檔案名稱**：`mariiy_nvr_os-1.0.0-amd64-installer.iso`
- **SHA-256**：`f32c528985653f7cc41aa7b0d1eb5df0aa0e98e207f11140dc2ed12c05a5acc5`
