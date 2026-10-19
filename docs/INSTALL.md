# 安裝說明（1.0.0-beta.1）

## 方式 A：ISO（建議）

1. 下載 `mariiy_nvr_os-1.0.0-beta.1-amd64.iso`
2. 用 Rufus（DD 模式）或 `dd` 寫入 USB
3. USB 開機後執行：

```sh
sh /mariiy/bin/mariiy-setup
mariiy-nvr-kiosk
```

4. 裝進硬碟：Live 內跑 `setup-alpine`，重開後再跑一次 `mariiy-setup`

### 本機重建 ISO（不需 Docker）

Windows 可用 MSYS2：

```bash
# 已裝 MSYS2 與 xorriso
cd /c/Users/.../mariiy_nvr_os
./iso/build-alpine-windows.sh
```

Linux 仍可用 `./iso/build.sh`（Debian remaster）。

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
