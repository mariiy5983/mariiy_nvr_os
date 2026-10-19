# 1.0.0-beta.1

第一個**正式測試版**：含可開機／可寫入 USB 的安裝系統。

## 下載

| 檔案 | 說明 |
|------|------|
| `mariiy_nvr_os-1.0.0-beta.1-amd64.iso` | 可 USB 開機的測試系統（安裝用） |
| `mariiy_nvr_os-1.0.0-beta.1-amd64.iso.sha256` | 校驗 |
| `mariiy_nvr_os-1.0.0-beta.1-web.zip` | 僅介面預覽（瀏覽器） |

## USB 開機／安裝

1. 用 [Rufus](https://rufus.ie/) 或 `dd` 把 ISO 寫進 USB  
2. 從 USB 開機進入 `mariiy_nvr_os`  
3. 開機後會啟動 Mariiy NVR 畫面  
4. 要裝進硬碟：開終端執行 `sudo mariiy-install`，選目標碟後輸入 `YES`

建議用虛擬機或空硬碟試裝。安裝會重建分割表。

## 這版有

- 可開機 Live 系統（Debian 基底）
- 本機 NVR 介面（kiosk）
- 硬碟安裝程式 `mariiy-install`
- 系統資訊／設定樹／遠端 QR 流程（預覽邏輯）

## 這版還沒有（之後版本）

- 真實 ONVIF／攝影機解碼
- 正式錄影寫入流程
- 主機內建 Cloudflare Tunnel 守護行程

## 已知限制

- beta：介面與安裝路徑優先，影像管線仍在後續版本
- 需要支援 UEFI 的 x86_64 機器（Intel N100 等）
