# mariiy_nvr_os

開源網路錄影主機系統。介面走傳統 NVR 風格，遠端經 Cloudflare Tunnel，影像控制面以 ONVIF 為主。

| 項目 | 內容 |
|------|------|
| 產品名稱 | Mariiy NVR |
| 系統名稱 | `mariiy_nvr_os` |
| 目前版本 | **1.0.0-beta.1** |
| 授權 | GPLv3 |
| 目標硬體 | Intel N100 / N95（VAAPI） |

## 1.0.0-beta.1 正式測試版

| 檔案 | 用途 |
|------|------|
| `mariiy_nvr_os-1.0.0-beta.1-amd64.iso` | USB 開機／安裝 |
| `…iso.sha256` | 校驗 |
| `…-web.zip` | 僅瀏覽器預覽介面 |

寫入 USB 後開機會進 NVR 畫面；硬碟安裝執行 `sudo mariiy-install`。

影像管線（ONVIF／VAAPI 解碼）與內建 Tunnel 守護行程在後續版本。

## 本機只看介面

```bash
cd web
python -m http.server 8765 --bind 127.0.0.1
```

開 <http://127.0.0.1:8765/>

## 倉庫結構

```
mariiy_nvr_os/
├── web/          # NVR 介面
├── iso/          # ISO 建置腳本（GitHub Actions）
├── docs/
├── LICENSE
└── README.md
```

## 路線圖

1. **beta.1** — 可開機 ISO + 安裝程式 + 介面（目前）
2. **beta.2** — ONVIF 發現／登入、子碼流預覽
3. **beta.3** — VAAPI 硬體解碼、錄影碟
4. **1.0.0** — Cloudflare Tunnel 守護、韌體更新流程

詳見 [docs/ROADMAP.md](docs/ROADMAP.md)。

## 授權

GPLv3，見 [LICENSE](LICENSE)。
