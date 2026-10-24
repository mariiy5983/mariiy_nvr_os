# 安裝指南 (1.0.0)

## 1. 下載安裝檔

從 [GitHub Releases](https://github.com/mariiy5983/mariiy_nvr_os/releases/tag/1.0.0) 下載：

- `mariiy_nvr_os-1.0.0-amd64-installer.iso`
- `mariiy_nvr_os-1.0.0-amd64-installer.iso.sha256`

## 2. 安裝步驟

1. **實體機（Intel N100 / N95 等 x86_64 主機）**：使用 Rufus 以 **DD 模式** 寫入隨身碟，從 USB 開機。
2. **VMware Workstation / ESXi**：
   - 新增虛擬硬碟（建議系統碟 16 GB 以上，可額外掛載第二顆硬碟作為錄影碟）。
   - 將 ISO 掛載至 CD/DVD，勾選 **Connect at power on**，並從光碟開機。
3. 進入安裝畫面（確認顯示版本 **1.0.0**）：
   - 預設會自動選取第一顆／最小容量的硬碟作為**系統碟**（保留大容量硬碟作為錄影碟）。
   - 直接按 **Enter** 開始安裝，或輸入磁碟編號（例如 `1`、`2`）指定目標硬碟。
4. 畫面顯示 `[6/6] DONE (1.0.0)` 與 `Install Complete!` 後，按 **Enter** 會自動退出光碟並重新啟動進入 Mariiy NVR。

## 3. 重新建置 ISO（Windows + MSYS2 或 Linux）

```bash
./iso/build-installer.sh
```
