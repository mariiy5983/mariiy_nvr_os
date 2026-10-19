#!/usr/bin/env bash
# Build bootable ISO on Windows/MSYS2 without Docker or WSL.
# Injects Mariiy NVR install files into Alpine Linux live ISO.
set -euo pipefail

VERSION="${VERSION:-1.0.0-beta.1}"
OS_NAME="mariiy_nvr_os"
ARCH="amd64"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${WORK:-${ROOT}/iso-work-alpine}"
OUT_DIR="${OUT_DIR:-${ROOT}/dist}"
ALPINE_VERSION="${ALPINE_VERSION:-3.24.0}"
ALPINE_BASE="${ALPINE_BASE:-https://dl-cdn.alpinelinux.org/alpine/latest-stable/releases/x86_64}"
ALPINE_URL="${ALPINE_URL:-${ALPINE_BASE}/alpine-standard-${ALPINE_VERSION}-x86_64.iso}"

echo "==> ${OS_NAME} ${VERSION} Alpine ISO (Windows/MSYS2 path)"
mkdir -p "${WORK}/overlay/mariiy" "${OUT_DIR}"
cd "${WORK}"

need() { command -v "$1" >/dev/null || { echo "missing: $1"; exit 1; }; }
need curl
need xorriso
need rsync

if [[ ! -f alpine.iso ]]; then
  echo "==> download Alpine ${ALPINE_VERSION}"
  curl -fL --retry 5 -o alpine.iso.part "${ALPINE_URL}"
  mv alpine.iso.part alpine.iso
fi

echo "==> prepare overlay"
rm -rf overlay
mkdir -p overlay/mariiy/web overlay/mariiy/bin
rsync -a "${ROOT}/web/" overlay/mariiy/web/

cat > overlay/mariiy/bin/mariiy-setup <<'EOF'
#!/bin/sh
# First-boot / live setup for mariiy_nvr_os on Alpine live
set -e
VERSION="__VERSION__"
echo "========================================"
echo " Mariiy NVR live setup  ${VERSION}"
echo "========================================"
WEB=/media/mariiy/web
# find overlay path (USB/CD mount varies)
for p in /media/*/mariiy/web /media/cdrom/mariiy/web /mariiy/web; do
  if [ -f "$p/index.html" ]; then WEB="$p"; break; fi
done
if [ ! -f "$WEB/index.html" ]; then
  echo "找不到介面檔，請確認 ISO 含 /mariiy/web"
  exit 1
fi

echo "==> 安裝必要套件（需網路）"
setup-interfaces -a || true
echo "nameserver 8.8.8.8" > /etc/resolv.conf
apk update
apk add --no-cache python3 firefox-esr font-noto-cjk mesa-gl || apk add --no-cache python3 firefox font-noto-cjk

mkdir -p /usr/share/mariiy_nvr_os
rm -rf /usr/share/mariiy_nvr_os/web
cp -a "$WEB" /usr/share/mariiy_nvr_os/web

cat > /usr/sbin/mariiy-nvr-kiosk <<'EOS'
#!/bin/sh
cd /usr/share/mariiy_nvr_os/web
if [ ! -f /tmp/mariiy-http.pid ] || ! kill -0 "$(cat /tmp/mariiy-http.pid)" 2>/dev/null; then
  python3 -m http.server 8765 --bind 127.0.0.1 >/tmp/mariiy-http.log 2>&1 &
  echo $! >/tmp/mariiy-http.pid
  sleep 1
fi
URL=http://127.0.0.1:8765/
export DISPLAY="${DISPLAY:-:0}"
if command -v firefox >/dev/null; then
  exec firefox --kiosk "$URL"
fi
if command -v firefox-esr >/dev/null; then
  exec firefox-esr --kiosk "$URL"
fi
exec python3 -m webbrowser "$URL"
EOS
chmod 755 /usr/sbin/mariiy-nvr-kiosk

cat > /usr/sbin/mariiy-install <<'EOS'
#!/bin/sh
echo "Mariiy NVR 硬碟安裝（Alpine setup-disk）"
echo "建議使用: setup-alpine 完成基本安裝後，再執行 mariiy-setup"
echo "或: setup-disk -m sys /dev/sda"
exec setup-disk "$@"
EOS
chmod 755 /usr/sbin/mariiy-install

echo "${VERSION}" > /etc/mariiy_nvr_os-version
echo
echo "完成。啟動畫面: mariiy-nvr-kiosk"
echo "硬碟安裝可搭配 Alpine 的 setup-alpine / setup-disk"
EOF
sed -i "s/__VERSION__/${VERSION}/g" overlay/mariiy/bin/mariiy-setup
chmod 755 overlay/mariiy/bin/mariiy-setup

cat > overlay/mariiy/README.txt <<EOF
mariiy_nvr_os ${VERSION}
------------------------
1. 用此 ISO 開機進入 Alpine
2. 登入後執行（需網路）:
     /mariiy/bin/mariiy-setup
   或:
     sh /media/*/mariiy/bin/mariiy-setup
3. 然後:
     mariiy-nvr-kiosk
4. 要裝進硬碟請用 Alpine 的 setup-alpine，再重跑 mariiy-setup

GitHub: https://github.com/mariiy5983/mariiy_nvr_os
EOF

# Auto-hint on tty via issue file placed at ISO root (shown on some boots)
cat > overlay/mariiy/BOOT.txt <<EOF
mariiy_nvr_os ${VERSION} — run: sh /mariiy/bin/mariiy-setup
EOF

ISO_OUT="${OUT_DIR}/${OS_NAME}-${VERSION}-${ARCH}.iso"
rm -f "${ISO_OUT}"

echo "==> remaster ISO with xorriso (keep Alpine boot)"
# Map overlay onto ISO root; replay original boot settings.
xorriso -indev alpine.iso -outdev "${ISO_OUT}" \
  -boot_image any replay \
  -map overlay/mariiy /mariiy \
  -chmod 0755 /mariiy/bin/mariiy-setup -- \
  -volid "MARIIY_NVR" \
  -compliance no_emul_toc

(
  cd "${OUT_DIR}"
  sha256sum "$(basename "${ISO_OUT}")" | tee "$(basename "${ISO_OUT}").sha256"
)
ls -lh "${ISO_OUT}"
echo "==> DONE ${ISO_OUT}"
