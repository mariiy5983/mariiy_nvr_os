# 1.0.0-beta.1

第一個公開測試版。

## 下載

- `mariiy_nvr_os-1.0.0-beta.1-web.zip` — 介面預覽（解壓後用本機 HTTP 開啟）

## 這版可以做什麼

- 瀏覽器開主機畫面，走完選單與設定
- 系統資訊顯示 `mariiy_nvr_os`、硬體模擬資訊、GitHub 連結
- 遠端頁用 QR 走手機設定流程（預覽）

## 這版還沒有

- 可寫入 USB 的 ISO
- 真實攝影機畫面
- 真實韌體寫入

## 試用

```bash
python -m http.server 8765 --bind 127.0.0.1
```

開 <http://127.0.0.1:8765/>
