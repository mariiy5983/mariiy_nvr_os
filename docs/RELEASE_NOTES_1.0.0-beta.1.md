# 1.0.0-beta.1

第一個正式測試版目標：**可開機／可安裝的系統**，不是只有網頁。

## 下載（目前）

| 檔案 | 說明 |
|------|------|
| `mariiy_nvr_os-1.0.0-beta.1-install-kit.zip` | 安裝套件（含介面 + `iso/build.sh` + `install-on-debian.sh`） |
| `mariiy_nvr_os-1.0.0-beta.1-web.zip` | 僅介面預覽 |

**ISO 狀態：** 建置腳本與 GitHub Actions 已就緒。自動建 ISO 目前被 GitHub 帳號 **Billing 鎖定**擋下（Actions 無法開工）。本機 Docker／WSL 也因虛擬化未啟用無法建。

解除後請到 Actions 跑 **Build ISO**，產出：

- `mariiy_nvr_os-1.0.0-beta.1-amd64.iso`
- `…iso.sha256`

## 現在就能裝系統的方式

### 1）虛擬機裝 Debian 12 → 轉成 mariiy_nvr_os

```bash
git clone https://github.com/mariiy5983/mariiy_nvr_os.git
cd mariiy_nvr_os
sudo ./iso/install-on-debian.sh
mariiy-nvr-kiosk
```

### 2）有 Linux／虛擬化時自己建 ISO

```bash
chmod +x iso/build.sh
./iso/build.sh
```

詳見 [docs/INSTALL.md](https://github.com/mariiy5983/mariiy_nvr_os/blob/main/docs/INSTALL.md)。

## 這版範圍

- 可安裝的系統路徑（Debian 轉系統／ISO 腳本）
- NVR 介面 kiosk、設定樹、系統資訊
- `mariiy-install`（ISO 內）寫入硬碟

尚未：真實 ONVIF 解碼、錄影管線、內建 cloudflared。
