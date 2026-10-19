# mariiy_nvr_os

開源網路錄影主機系統。介面走傳統 NVR 風格，遠端經 Cloudflare Tunnel，影像控制面以 ONVIF 為主。

| 項目 | 內容 |
|------|------|
| 產品名稱 | Mariiy NVR |
| 系統名稱 | `mariiy_nvr_os` |
| 目前版本 | **1.0.0-beta.1** |
| 授權 | GPLv3 |
| 目標硬體 | Intel N100 / N95（VAAPI） |

## 1.0.0-beta.1 測試版內容

本版先公開 **主機介面預覽**（瀏覽器可開），用來確認排版、選單、設定樹、遠端與系統資訊。

**尚未包含：**

- 可開機 ISO / 寫入 USB 的正式韌體
- Qt eglfs 本機畫面
- GStreamer VAAPI 解碼
- 真實 ONVIF / RTSP 連線
- 主機內建 cloudflared

下一階段才會做 Debian／Buildroot 安裝 ISO。

## 立刻試預覽

```bash
cd web
python -m http.server 8765 --bind 127.0.0.1
```

瀏覽器開啟 <http://127.0.0.1:8765/>

第一次會進入開機設定。設定 → 系統資訊 可見 CPU／記憶體等；韌體頁連到本倉庫 Releases。

## 倉庫結構

```
mariiy_nvr_os/
├── web/                 # 介面預覽（本 beta）
├── docs/                # 設計與路線圖
├── scripts/             # 之後的 ISO／打包腳本
├── LICENSE
└── README.md
```

## 路線圖

1. **beta.1** — 介面預覽（目前）
2. **beta.2** — 最小 Debian 開機映像 + kiosk 載入本介面
3. **beta.3** — ONVIF 發現／登入、子碼流預覽、硬體解碼
4. **1.0.0** — 錄影碟排除系統碟、Cloudflare Tunnel、韌體更新流程

詳見 [docs/ROADMAP.md](docs/ROADMAP.md)。

## 授權

GPLv3，見 [LICENSE](LICENSE)。
