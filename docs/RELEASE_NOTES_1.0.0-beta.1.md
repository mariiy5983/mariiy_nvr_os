# 1.0.0-beta.1

第一個正式測試版：**含可開機 ISO**。

## 下載

| 檔案 | 說明 |
|------|------|
| **`mariiy_nvr_os-1.0.0-beta.1-amd64.iso`** | USB 開機測試系統（約 353 MB） |
| `…iso.sha256` | 校驗 |
| `…-install-kit.zip` | 原始碼安裝套件 |
| `…-web.zip` | 僅瀏覽器介面 |

## USB 開機

1. 用 [Rufus](https://rufus.ie/)（建議 DD 映像模式）或 `dd` 寫入 USB  
2. 從 USB 開機（UEFI，x86_64）  
3. 進入 Alpine 後執行：

```sh
sh /mariiy/bin/mariiy-setup
mariiy-nvr-kiosk
```

若 `/mariiy` 不在根目錄，改找光碟掛載點，例如：

```sh
sh /media/*/mariiy/bin/mariiy-setup
```

`mariiy-setup` 需要網路（會裝瀏覽器等套件）。完成後會開 NVR 畫面。

## 裝進硬碟

Live 內使用 Alpine 工具：

```sh
setup-alpine
```

裝完重開後再執行一次 `mariiy-setup`。

## 這版有

- 可開機 amd64 ISO（Alpine 基底 + Mariiy 介面／安裝腳本）
- NVR 介面 kiosk
- 系統資訊、設定樹、遠端 QR 等預覽功能

## 這版還沒有

- 真實 ONVIF／攝影機硬體解碼
- 一鍵圖形安裝精靈（目前用 Alpine `setup-alpine`）
- 內建 cloudflared 守護行程
