# 路線圖

## 已完成（1.0.0-beta.1）

- 可開機 amd64 ISO（Debian live 改造）
- `mariiy-install` 硬碟安裝
- 開機 kiosk 載入 NVR 介面
- 32 路介面、設定樹、系統資訊、遠端 QR、韌體頁
- GitHub Actions 自動建 ISO

## 之後

| 版本 | 目標 |
|------|------|
| beta.2 | ONVIF 發現／登入、子碼流預覽 |
| beta.3 | VAAPI 硬體解碼、錄影碟排除系統碟 |
| 1.0.0 | cloudflared 守護、韌體 OTA |

ISO 由 `.github/workflows/build-iso.yml` 建置；本機需 Linux／虛擬化。
