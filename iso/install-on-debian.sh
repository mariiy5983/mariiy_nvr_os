#!/usr/bin/env bash
# Turn a fresh Debian 12 (amd64) into mariiy_nvr_os beta.
# Usage (as root on the target machine):
#   curl -fsSL https://raw.githubusercontent.com/mariiy5983/mariiy_nvr_os/main/iso/install-on-debian.sh | bash
# Or from a cloned repo:
#   sudo ./iso/install-on-debian.sh
set -euo pipefail

VERSION="1.0.0"
OS_NAME="mariiy_nvr_os"
REPO_RAW="https://raw.githubusercontent.com/mariiy5983/mariiy_nvr_os/main"
WEB_ROOT="/usr/share/mariiy_nvr_os/web"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "請用 root 執行（sudo）"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends \
  python3 curl ca-certificates rsync \
  xserver-xorg xinit openbox \
  chromium \
  sudo gdisk dosfstools e2fsprogs grub-efi-amd64 efibootmgr

mkdir -p "${WEB_ROOT}"
if [[ -d "$(dirname "$0")/../web" ]]; then
  rsync -a "$(dirname "$0")/../web/" "${WEB_ROOT}/"
else
  TMP="$(mktemp -d)"
  curl -fsSL -o "${TMP}/web.zip" \
    "https://github.com/mariiy5983/mariiy_nvr_os/releases/download/${VERSION}/mariiy_nvr_os-${VERSION}-web.zip" \
    || curl -fsSL -o "${TMP}/web.zip" \
    "https://github.com/mariiy5983/mariiy_nvr_os/archive/refs/heads/main.zip"
  if command -v unzip >/dev/null; then
    unzip -q "${TMP}/web.zip" -d "${TMP}/out"
  else
    apt-get install -y unzip
    unzip -q "${TMP}/web.zip" -d "${TMP}/out"
  fi
  SRC="$(find "${TMP}/out" -type f -name index.html | head -n1 | xargs dirname)"
  rsync -a "${SRC}/" "${WEB_ROOT}/"
  rm -rf "${TMP}"
fi

install -m 755 /dev/stdin /usr/sbin/mariiy-nvr-kiosk <<'EOF'
#!/bin/bash
set -e
cd /usr/share/mariiy_nvr_os/web
if [[ ! -f /tmp/mariiy-http.pid ]] || ! kill -0 "$(cat /tmp/mariiy-http.pid)" 2>/dev/null; then
  python3 -m http.server 8765 --bind 127.0.0.1 >/tmp/mariiy-http.log 2>&1 &
  echo $! >/tmp/mariiy-http.pid
  sleep 1
fi
URL=http://127.0.0.1:8765/
export DISPLAY="${DISPLAY:-:0}"
if command -v chromium >/dev/null; then
  exec chromium --kiosk --noerrdialogs --disable-infobars --check-for-update-interval=31536000 --password-store=basic "$URL"
fi
exec python3 -m webbrowser "$URL"
EOF

install -m 755 /dev/stdin /usr/sbin/mariiy-install <<EOF
#!/bin/bash
echo "已在本機系統上。若要從 Live USB 裝到另一顆碟，請使用 ISO 內建的 mariiy-install。"
echo "版本: ${VERSION}"
EOF

mkdir -p /etc/skel/.config/autostart /usr/share/applications
cat >/etc/skel/.config/autostart/mariiy-nvr.desktop <<'EOF'
[Desktop Entry]
Type=Application
Name=Mariiy NVR
Exec=/usr/sbin/mariiy-nvr-kiosk
X-GNOME-Autostart-enabled=true
EOF
cp /etc/skel/.config/autostart/mariiy-nvr.desktop /usr/share/applications/mariiy-nvr.desktop
echo "${VERSION}" >/etc/mariiy_nvr_os-version
cat >/etc/motd <<EOF

${OS_NAME} ${VERSION}
開機後執行 NVR: mariiy-nvr-kiosk
或登入圖形後會自動啟動。

EOF

# optional: create nvr user
if ! id nvr >/dev/null 2>&1; then
  useradd -m -s /bin/bash -G sudo,video,audio nvr || true
  echo "nvr:nvr" | chpasswd || true
  mkdir -p /home/nvr/.config/autostart
  cp /etc/skel/.config/autostart/mariiy-nvr.desktop /home/nvr/.config/autostart/
  chown -R nvr:nvr /home/nvr/.config || true
fi

echo "安裝完成：${OS_NAME} ${VERSION}"
echo "執行: mariiy-nvr-kiosk"
