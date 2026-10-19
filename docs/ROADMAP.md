# 路線圖

## 已完成（1.0.0-beta.1）

- 32 路預覽排版（1／4／9／16／25／32，固定 16:9）
- 主選單：預覽／回放／圖片／設定／關機
- 設定樹：系統資訊、韌體、日誌、郵件、例外、音訊、遠端 QR 等
- 開機設定精靈、閒置鎖定、Cloudflare Tunnel 遠端流程（預覽）
- 錄影碟與系統碟分離（模擬）

## 進行中

- 建立 GitHub 公開倉庫與 beta 發行
- ISO／韌體建置環境準備

## 之後

| 版本 | 目標 |
|------|------|
| beta.2 | 可開機最小系統，開機進本介面 |
| beta.3 | ONVIF + 硬體解碼即時預覽 |
| 1.0.0 | 錄影、遠端 Tunnel、韌體更新可用 |

## ISO 說明

正式 ISO 需要：

1. 最小 Linux（Debian 或 Buildroot）
2. 無桌面，DRM／KMS + Qt eglfs 或單一 kiosk
3. GStreamer VAAPI（`vah264dec`／`vah265dec`）
4. ONVIF 控制面 + RTSP／RTP TCP interleaved
5. 系統碟與錄影碟分離、cloudflared 由主機管理

本機目前以 Windows 開發預覽；WSL 未就緒時，ISO 會在有 Linux／CI 環境後產出，並放到 Releases。
