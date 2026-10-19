# 安裝說明（1.0.0-beta.1）

正式測試版應使用 **ISO** 寫入 USB 後開機／安裝。若 Releases 尚無 `.iso`，多半是建置環境未就緒，請用下方備援方式。

## 方式 A：ISO（正式目標）

1. 下載 `mariiy_nvr_os-1.0.0-beta.1-amd64.iso`
2. 用 Rufus（DD 模式）或 `dd` 寫入 USB
3. USB 開機 → 進入 NVR 畫面
4. 安裝到硬碟：`sudo mariiy-install`，輸入目標碟後打 `YES`

建置指令（Linux／已啟用虛擬化的環境）：

```bash
git clone https://github.com/mariiy5983/mariiy_nvr_os.git
cd mariiy_nvr_os
chmod +x iso/build.sh
./iso/build.sh
```

或在 GitHub 開啟 Actions → **Build ISO** → Run workflow（帳號 Actions 需可用）。

## 方式 B：在既有 Debian 12 上安裝成系統

適用：虛擬機先裝好 Debian，再變成 `mariiy_nvr_os`。

```bash
sudo apt-get update
sudo apt-get install -y git
git clone https://github.com/mariiy5983/mariiy_nvr_os.git
cd mariiy_nvr_os
sudo chmod +x iso/install-on-debian.sh
sudo ./iso/install-on-debian.sh
mariiy-nvr-kiosk
```

## 本機建 ISO 需要

- Linux，或 Windows + **BIOS 開啟虛擬化** + WSL2／Docker Engine 正常
- 約 20 GB 磁碟空間

目前若出現「account locked due to billing」則 Actions 無法建 ISO，請先到 GitHub Billing 解除鎖定後再跑 workflow。
