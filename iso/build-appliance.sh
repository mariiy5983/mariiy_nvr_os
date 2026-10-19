#!/usr/bin/env bash
# Build a complete offline-capable Mariiy NVR appliance ISO (MSYS2/Windows OK).
# One ISO: boot -> auto NVR UI; includes disk installer.
set -euo pipefail

VERSION="${VERSION:-1.0.0-beta.2}"
OS_NAME="mariiy_nvr_os"
ARCH="amd64"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${WORK:-${ROOT}/iso-work-full}"
OUT_DIR="${OUT_DIR:-${ROOT}/dist}"
ALPINE_VERSION="${ALPINE_VERSION:-3.24.0}"
ALPINE_URL="${ALPINE_URL:-https://dl-cdn.alpinelinux.org/alpine/latest-stable/releases/x86_64/alpine-standard-${ALPINE_VERSION}-x86_64.iso}"

echo "==> ${OS_NAME} ${VERSION} complete appliance ISO"
mkdir -p "${WORK}" "${OUT_DIR}"
cd "${WORK}"

need() { command -v "$1" >/dev/null || { echo "missing: $1"; exit 1; }; }
need curl
need xorriso
need rsync
need tar
if command -v python3 >/dev/null; then PY=python3
elif command -v py >/dev/null; then PY="py -3"
else echo "missing python3"; exit 1; fi

if [[ ! -f alpine.iso ]]; then
  if [[ -f "${ROOT}/iso-work-alpine/alpine.iso" ]]; then
    echo "==> reuse existing alpine.iso"
    cp -f "${ROOT}/iso-work-alpine/alpine.iso" alpine.iso
  else
    echo "==> download Alpine ${ALPINE_VERSION}"
    curl -fL --retry 5 -o alpine.iso.part "${ALPINE_URL}"
    mv alpine.iso.part alpine.iso
  fi
fi

echo "==> fetch offline APKs"
if [[ ! -d "${WORK}/offline-apks" ]] || [[ "$(find "${WORK}/offline-apks" -name '*.apk' | wc -l | tr -d ' ')" -lt 50 ]]; then
  $PY "${ROOT}/iso/fetch-apks.py" "${WORK}/offline-apks"
else
  echo "    reuse offline-apks"
fi

echo "==> stage overlay"
rm -rf overlay
mkdir -p overlay/mariiy/{web,apks,bin} overlay/apkovl

rsync -a "${ROOT}/web/" overlay/mariiy/web/
# copy apks (skip index caches)
find "${WORK}/offline-apks" -maxdepth 1 -name '*.apk' -exec cp -f {} overlay/mariiy/apks/ \;
APK_COUNT="$(find overlay/mariiy/apks -name '*.apk' | wc -l | tr -d ' ')"
echo "    offline apks: ${APK_COUNT}"
[[ "${APK_COUNT}" -gt 20 ]] || { echo "too few apks"; exit 1; }

# --- live/runtime scripts ---
cat > overlay/mariiy/bin/mariiy-nvr-kiosk <<'EOF'
#!/bin/sh
set -e
WEB=/usr/share/mariiy_nvr_os/web
[ -f "$WEB/index.html" ] || WEB=/mariiy/web
cd "$WEB"
if [ ! -f /tmp/mariiy-http.pid ] || ! kill -0 "$(cat /tmp/mariiy-http.pid)" 2>/dev/null; then
  python3 -m http.server 8765 --bind 127.0.0.1 >/tmp/mariiy-http.log 2>&1 &
  echo $! >/tmp/mariiy-http.pid
  sleep 1
fi
URL=http://127.0.0.1:8765/
export DISPLAY="${DISPLAY:-:0}"
export MOZ_USE_XINPUT2=1
if command -v firefox >/dev/null 2>&1; then
  exec firefox --kiosk --width=1920 --height=1080 "$URL"
fi
exec python3 -m webbrowser "$URL"
EOF
chmod 755 overlay/mariiy/bin/mariiy-nvr-kiosk

cat > overlay/mariiy/bin/mariiy-firstboot <<'EOF'
#!/bin/sh
# Offline package install + graphical NVR autostart
set -e
VERSION="__VERSION__"
FLAG=/var/lib/mariiy_nvr_os/ready
mkdir -p /var/lib/mariiy_nvr_os /usr/share/mariiy_nvr_os

# locate media
MEDIA=""
for p in /mariiy /media/*/mariiy /media/cdrom/mariiy; do
  if [ -f "$p/web/index.html" ]; then MEDIA="$p"; break; fi
done
[ -n "$MEDIA" ] || MEDIA=/mariiy

cp -a "$MEDIA/web" /usr/share/mariiy_nvr_os/
cp -f "$MEDIA/bin/mariiy-nvr-kiosk" /usr/sbin/mariiy-nvr-kiosk
cp -f "$MEDIA/bin/mariiy-install" /usr/sbin/mariiy-install
chmod 755 /usr/sbin/mariiy-nvr-kiosk /usr/sbin/mariiy-install
echo "$VERSION" >/etc/mariiy_nvr_os-version
echo "mariiy-nvr" >/etc/hostname
hostname mariiy-nvr 2>/dev/null || true

if [ ! -f "$FLAG" ]; then
  echo "[mariiy] installing offline packages..."
  # shellcheck disable=SC2046
  apk add --allow-untrusted --force-non-repository $(ls "$MEDIA"/apks/*.apk)
  touch "$FLAG"
fi

# X11 + openbox session
mkdir -p /root
cat >/root/.xinitrc <<'XEOF'
#!/bin/sh
xset -dpms 2>/dev/null || true
xset s off 2>/dev/null || true
openbox &
sleep 1
exec /usr/sbin/mariiy-nvr-kiosk
XEOF
chmod 755 /root/.xinitrc

mkdir -p /etc/conf.d
cat >/etc/conf.d/agetty.tty1 <<'AEOF'
agetty_options="--autologin root --noclear"
AEOF
rc-update add agetty.tty1 default 2>/dev/null || true

grep -q mariiy-nvr-startx /root/.profile 2>/dev/null || cat >>/root/.profile <<'PEOF'

# mariiy-nvr-startx
if [ -z "$DISPLAY" ] && [ -z "$SSH_CONNECTION" ]; then
  case "$(tty 2>/dev/null)" in
    /dev/tty1|/dev/console) exec startx ;;
  esac
fi
PEOF

echo "[mariiy] ${VERSION} ready — starting UI"
export HOME=/root
cd /root
if ! pidof Xorg >/dev/null 2>&1 && ! pidof X >/dev/null 2>&1; then
  setsid startx >>/var/log/mariiy-x.log 2>&1 &
fi
EOF
sed -i "s/__VERSION__/${VERSION}/g" overlay/mariiy/bin/mariiy-firstboot
chmod 755 overlay/mariiy/bin/mariiy-firstboot

cat > overlay/mariiy/bin/mariiy-install <<'EOF'
#!/bin/sh
# Install live Mariiy NVR system onto a disk (UEFI).
set -e
VERSION="$(cat /etc/mariiy_nvr_os-version 2>/dev/null || echo unknown)"
echo "============================================"
echo " Mariiy NVR 硬碟安裝  ${VERSION}"
echo "============================================"
echo "警告：目標碟分割表會被重建，資料會消失。"
echo
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT,MODEL
echo
printf "目標裝置（例 /dev/sda 或 /dev/nvme0n1）: "
read -r DISK
[ -b "$DISK" ] || { echo "不是區塊裝置"; exit 1; }
printf "確定寫入 %s？請輸入 YES: " "$DISK"
read -r OK
[ "$OK" = "YES" ] || { echo "已取消"; exit 1; }

apk add --allow-untrusted --force-non-repository /mariiy/apks/sgdisk*.apk /mariiy/apks/e2fsprogs*.apk /mariiy/apks/dosfstools*.apk 2>/dev/null || true

sgdisk --zap-all "$DISK"
sgdisk -n 1:0:+512M -t 1:ef00 -c 1:EFI "$DISK"
sgdisk -n 2:0:0 -t 2:8300 -c 2:ROOT "$DISK"
partprobe "$DISK" 2>/dev/null || true
sleep 2
if [ -b "${DISK}p1" ]; then P1="${DISK}p1"; P2="${DISK}p2"; else P1="${DISK}1"; P2="${DISK}2"; fi

mkfs.vfat -F32 -n EFI "$P1"
mkfs.ext4 -F -L MARIIY_ROOT "$P2"
mkdir -p /mnt/target /mnt/efi
mount "$P2" /mnt/target
mount "$P1" /mnt/efi

# copy running system
rsync -aHAX --info=progress2 \
  --exclude=/proc --exclude=/sys --exclude=/dev --exclude=/run \
  --exclude=/mnt --exclude=/tmp --exclude=/media \
  / /mnt/target/

mkdir -p /mnt/target/{proc,sys,dev,run,tmp,boot/efi,var/lib/mariiy_nvr_os}
# ensure UI + tools present
mkdir -p /mnt/target/usr/share/mariiy_nvr_os
cp -a /usr/share/mariiy_nvr_os/web /mnt/target/usr/share/mariiy_nvr_os/ 2>/dev/null || cp -a /mariiy/web /mnt/target/usr/share/mariiy_nvr_os/
cp -f /usr/sbin/mariiy-nvr-kiosk /mnt/target/usr/sbin/
cp -f /usr/sbin/mariiy-install /mnt/target/usr/sbin/
cp -f /mariiy/bin/mariiy-firstboot /mnt/target/usr/sbin/mariiy-firstboot
chmod 755 /mnt/target/usr/sbin/mariiy-nvr-kiosk /mnt/target/usr/sbin/mariiy-install /mnt/target/usr/sbin/mariiy-firstboot
touch /mnt/target/var/lib/mariiy_nvr_os/ready
echo "$VERSION" >/mnt/target/etc/mariiy_nvr_os-version

UUID_ROOT="$(blkid -s UUID -o value "$P2")"
UUID_EFI="$(blkid -s UUID -o value "$P1")"
cat >/mnt/target/etc/fstab <<FEOF
UUID=${UUID_ROOT} / ext4 defaults,noatime 0 1
UUID=${UUID_EFI} /boot/efi vfat umask=0077 0 1
FEOF

mount --bind /dev /mnt/target/dev
mount --bind /proc /mnt/target/proc
mount --bind /sys /mnt/target/sys
mount --bind /mnt/efi /mnt/target/boot/efi
chroot /mnt/target /bin/sh -c '
  apk add grub grub-efi efibootmgr 2>/dev/null || true
  grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=mariiy_nvr_os --recheck
  grub-mkconfig -o /boot/grub/grub.cfg 2>/dev/null || true
'
# fallback EFI stub if grub-mkconfig missing
mkdir -p /mnt/efi/EFI/BOOT
if [ -f /mnt/target/boot/grub/x86_64-efi/core.efi ]; then
  cp -f /mnt/target/usr/lib/grub/x86_64-efi/core.efi /mnt/efi/EFI/BOOT/BOOTX64.EFI 2>/dev/null || true
fi

umount /mnt/target/boot/efi 2>/dev/null || true
umount /mnt/target/sys /mnt/target/proc /mnt/target/dev 2>/dev/null || true
umount /mnt/efi /mnt/target 2>/dev/null || true
echo
echo "安裝完成。請拔除 USB 後重新開機，系統會自動進入 Mariiy NVR。"
EOF
chmod 755 overlay/mariiy/bin/mariiy-install

# --- apkovl: runs on Alpine live boot ---
OVL="${WORK}/apkovl-root"
rm -rf "$OVL"
mkdir -p "$OVL/etc/local.d" "$OVL/etc/runlevels/default" "$OVL/etc/apk" "$OVL/root"

cat >"$OVL/etc/hostname" <<EOF
mariiy-nvr
EOF

cat >"$OVL/etc/motd" <<EOF

========================================
  mariiy_nvr_os ${VERSION}
  開機後會自動進入 NVR 畫面
  安裝到硬碟:  mariiy-install
========================================

EOF

cat >"$OVL/etc/local.d/mariiy.start" <<'EOF'
#!/bin/sh
for p in /media/*/mariiy/bin/mariiy-firstboot /mariiy/bin/mariiy-firstboot; do
  if [ -x "$p" ]; then
    exec "$p" >>/var/log/mariiy-firstboot.log 2>&1
  fi
done
echo "mariiy-firstboot not found" >>/var/log/mariiy-firstboot.log
exit 1
EOF
chmod 755 "$OVL/etc/local.d/mariiy.start"

# enable local service
ln -sf /etc/init.d/local "$OVL/etc/runlevels/default/local" 2>/dev/null || true
# openrc local needs the file present in overlay runlevels - create marker
mkdir -p "$OVL/etc/init.d"
# Alpine loads apkovl then starts; local.d is run by 'local' service which is usually default on live

(
  cd "$OVL"
  tar -czf "${WORK}/overlay/mariiy-nvr.apkovl.tar.gz" .
)

cat > overlay/mariiy/README.txt <<EOF
mariiy_nvr_os ${VERSION} 完整測試版
--------------------------------
開機後約 1–3 分鐘會自動安裝離線套件並進入 NVR。
硬碟安裝（在終端）:  mariiy-install
EOF

ISO_OUT="${OUT_DIR}/${OS_NAME}-${VERSION}-${ARCH}.iso"
rm -f "${ISO_OUT}"

echo "==> build ISO"
xorriso -indev alpine.iso -outdev "${ISO_OUT}" \
  -boot_image any replay \
  -map overlay/mariiy /mariiy \
  -map overlay/mariiy-nvr.apkovl.tar.gz /mariiy-nvr.apkovl.tar.gz \
  -chmod 0755 /mariiy/bin/mariiy-firstboot -- \
  -chmod 0755 /mariiy/bin/mariiy-nvr-kiosk -- \
  -chmod 0755 /mariiy/bin/mariiy-install -- \
  -volid "MARIIY_NVR" \
  -compliance no_emul_toc

(
  cd "${OUT_DIR}"
  sha256sum "$(basename "${ISO_OUT}")" | tee "$(basename "${ISO_OUT}").sha256"
)
ls -lh "${ISO_OUT}"
echo "==> DONE ${ISO_OUT}"
