# mariiy_nvr_os

開源網路錄影主機系統（NVR OS）。介面採傳統硬體 NVR 風格，影像控制面以 ONVIF 為主，串流轉發採用 go2rtc，硬體解碼走 VAAPI。

| 項目 | 內容 |
|------|------|
| 產品名稱 | Mariiy NVR |
| 系統名稱 | `mariiy_nvr_os` |
| 目前版本 | **1.0.0** |
| 授權 | GPLv3 |
| 目標硬體 | Intel N100 / N95（VAAPI）或 x86_64 虛擬機（VMware / KVM） |

## 1.0.0 安裝檔（ISO）

| 檔案 | 用途 |
|------|------|
| `mariiy_nvr_os-1.0.0-amd64-installer.iso` | **完整離線安裝媒體**：開機自動進入安裝程式，安裝完成後自動退片並重開進入 Mariiy NVR |
| `mariiy_nvr_os-1.0.0-amd64-installer.iso.sha256` | SHA-256 校驗值 |

1. 使用 Rufus（DD 模式）寫入 USB，或於 VMware 掛載至 CD/DVD（勾選 Connect at power on）。
2. 從安裝媒體開機，畫面顯示 **Mariiy NVR Installer 1.0.0**。
3. 按 **Enter** 確認安裝（亦可輸入磁碟編號選擇目標系統碟）。
4. 安裝完成後按 **Enter** 自動退片並重開機進入 **Mariiy NVR** 圖形系統。
5. 完成首次開機設定後，至「設定 → 通道」搜尋或新增 ONVIF 攝影機。

詳見 [docs/INSTALL.md](docs/INSTALL.md) 與 [docs/RELEASE_NOTES_1.0.0.md](docs/RELEASE_NOTES_1.0.0.md)。

## 本機開發預覽

```bash
cd web
python -m http.server 8765 --bind 127.0.0.1
```

開啟 <http://127.0.0.1:8765/>（未啟動 Agent 時自動切換為模擬畫面）。

## 倉庫結構

```
mariiy_nvr_os/
├── web/          # NVR 前端介面（32 路分割、回放、抓圖、設定、遠端 QR）
├── agent/        # FastAPI 後端 Agent（ONVIF 探索／認證／串流／PTZ／抓圖／系統狀態）
├── packaging/    # OpenRC / systemd 服務與 Kiosk 啟動腳本
├── iso/          # 完整離線安裝 ISO 建置工具與安裝器
├── docs/         # 安裝說明與發行說明
└── README.md
```

## 授權

GPLv3，見 [LICENSE](LICENSE)。
