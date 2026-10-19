# 安裝說明（1.0.0-beta.2）

## 一個 ISO 完整安裝

1. 下載 `mariiy_nvr_os-1.0.0-beta.2-amd64.iso`
2. Rufus → DD 映像模式 → 寫入 USB
3. USB 開機，等待自動進入 NVR
4. 硬碟安裝：`mariiy-install` → 輸入裝置 → `YES`
5. 拔掉 USB 重開，系統會自動進 NVR

## 本機重建 ISO（不需 Docker）

Windows + MSYS2：

```bash
cd /c/Users/.../mariiy_nvr_os
# 第一次會下載 Alpine 與 APK
./iso/build-appliance.sh
```

產出：`dist/mariiy_nvr_os-<version>-amd64.iso`
