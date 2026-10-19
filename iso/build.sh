#!/usr/bin/env bash
# Build bootable amd64 test ISO for mariiy_nvr_os (Debian live remaster).
set -euo pipefail

VERSION="${VERSION:-1.0.0-beta.1}"
OS_NAME="mariiy_nvr_os"
ARCH="amd64"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${WORK:-${ROOT}/iso-work}"
OUT_DIR="${OUT_DIR:-${ROOT}/dist}"
CD_BASE="${CD_BASE:-https://cdimage.debian.org/debian-cd/current-live/amd64/iso-hybrid/}"

echo "==> ${OS_NAME} ${VERSION} (${ARCH})"
mkdir -p "${WORK}" "${OUT_DIR}"
cd "${WORK}"

need() { command -v "$1" >/dev/null || { echo "missing tool: $1" >&2; exit 1; }; }
for t in curl xorriso unsquashfs mksquashfs rsync sha256sum; do need "$t"; done

if [[ ! -f debian-live.iso ]]; then
  echo "==> resolve Debian live ISO from ${CD_BASE}"
  ISO_NAME="$(curl -fsSL "${CD_BASE}" | grep -oE 'debian-live-[0-9.]+-amd64-standard\.iso' | head -n1 || true)"
  [[ -n "${ISO_NAME}" ]] || { echo "cannot find debian-live standard iso listing"; exit 1; }
  echo "==> download ${ISO_NAME}"
  curl -fL --retry 5 --retry-delay 5 -o debian-live.iso.part "${CD_BASE}${ISO_NAME}"
  mv debian-live.iso.part debian-live.iso
fi

echo "==> extract"
sudo rm -rf extract squash
mkdir -p extract mnt
sudo mount -o loop,ro debian-live.iso mnt
sudo rsync -a mnt/ extract/
sudo umount mnt
rmdir mnt

SFS="$(find extract -type f -name filesystem.squashfs | head -n1)"
[[ -n "${SFS}" ]] || { echo "filesystem.squashfs missing"; exit 1; }
REL_SFS="${SFS#extract/}"
echo "==> unsquash ${REL_SFS}"
sudo unsquashfs -d squash "${SFS}"

echo "==> inject web UI + tools"
sudo mkdir -p squash/usr/share/mariiy_nvr_os/web
sudo rsync -a "${ROOT}/web/" squash/usr/share/mariiy_nvr_os/web/

sudo tee squash/usr/sbin/mariiy-nvr-kiosk >/dev/null <<'EOF'
#!/bin/bash
set -e
WEB=/usr/share/mariiy_nvr_os/web
cd "$WEB"
if [[ ! -f /tmp/mariiy-http.pid ]] || ! kill -0 "$(cat /tmp/mariiy-http.pid)" 2>/dev/null; then
  python3 -m http.server 8765 --bind 127.0.0.1 >/tmp/mariiy-http.log 2>&1 &
  echo $! >/tmp/mariiy-http.pid
  sleep 1
fi
URL=http://127.0.0.1:8765/
export DISPLAY="${DISPLAY:-:0}"
if command -v chromium >/dev/null; then
  exec chromium --kiosk --noerrdialogs --disable-infobars --check-for-update-interval=31536000 \
    --password-store=basic "$URL"
fi
if command -v firefox-esr >/dev/null; then
  exec firefox-esr -kiosk "$URL"
fi
exec python3 -m webbrowser "$URL"
EOF
sudo chmod 755 squash/usr/sbin/mariiy-nvr-kiosk

sudo tee squash/usr/sbin/mariiy-install >/dev/null <<EOF
#!/bin/bash
set -euo pipefail
VERSION="${VERSION}"
echo "========================================"
echo " Mariiy NVR installer  ${VERSION}"
echo " 系統名稱: mariiy_nvr_os"
echo "========================================"
echo "警告：會重建目標碟分割表，資料會消失。"
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT,MODEL
echo
read -r -p "目標裝置（例 /dev/sda 或 /dev/nvme0n1）: " DISK
[[ -b "\${DISK}" ]] || { echo "不是區塊裝置"; exit 1; }
read -r -p "確定寫入 \${DISK}？請輸入 YES: " OK
[[ "\${OK}" == "YES" ]] || { echo "已取消"; exit 1; }

sgdisk --zap-all "\${DISK}"
sgdisk -n 1:0:+512M -t 1:ef00 -c 1:EFI "\${DISK}"
sgdisk -n 2:0:0 -t 2:8300 -c 2:ROOT "\${DISK}"
partprobe "\${DISK}" || true
sleep 2
if [[ -b "\${DISK}p1" ]]; then P1="\${DISK}p1"; P2="\${DISK}p2"; else P1="\${DISK}1"; P2="\${DISK}2"; fi

mkfs.vfat -F32 -n EFI "\${P1}"
mkfs.ext4 -F -L MARIIY_ROOT "\${P2}"
mkdir -p /mnt/target /mnt/efi
mount "\${P2}" /mnt/target
mount "\${P1}" /mnt/efi
rsync -aHAX --info=progress2 \
  --exclude=/proc --exclude=/sys --exclude=/dev --exclude=/run --exclude=/mnt --exclude=/tmp \
  / /mnt/target/
mkdir -p /mnt/target/{proc,sys,dev,run,tmp,boot/efi}
mount --bind /dev /mnt/target/dev
mount --bind /proc /mnt/target/proc
mount --bind /sys /mnt/target/sys
mount --bind /mnt/efi /mnt/target/boot/efi
UUID=\$(blkid -s UUID -o value "\${P2}")
echo "UUID=\${UUID} / ext4 defaults 0 1" > /mnt/target/etc/fstab
echo "UUID=\$(blkid -s UUID -o value "\${P1}") /boot/efi vfat umask=0077 0 1" >> /mnt/target/etc/fstab
chroot /mnt/target grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=mariiy_nvr_os --recheck
chroot /mnt/target update-grub
umount /mnt/target/boot/efi || true
umount /mnt/target/sys /mnt/target/proc /mnt/target/dev || true
umount /mnt/efi /mnt/target || true
echo "安裝完成。請移除安裝媒體後重新開機。"
EOF
sudo chmod 755 squash/usr/sbin/mariiy-install

sudo mkdir -p squash/etc/skel/.config/autostart squash/usr/share/applications
sudo tee squash/etc/skel/.config/autostart/mariiy-nvr.desktop >/dev/null <<'EOF'
[Desktop Entry]
Type=Application
Name=Mariiy NVR
Exec=/usr/sbin/mariiy-nvr-kiosk
X-GNOME-Autostart-enabled=true
EOF
sudo tee squash/usr/share/applications/mariiy-nvr.desktop >/dev/null <<'EOF'
[Desktop Entry]
Type=Application
Name=Mariiy NVR
Exec=/usr/sbin/mariiy-nvr-kiosk
Terminal=false
Categories=AudioVideo;
EOF
sudo tee squash/etc/motd >/dev/null <<EOF

mariiy_nvr_os ${VERSION}
--------------------------------
Live 測試系統。開機後執行 NVR 畫面。
安裝到硬碟:  sudo mariiy-install
文件:        https://github.com/mariiy5983/mariiy_nvr_os

EOF
echo "${VERSION}" | sudo tee squash/etc/mariiy_nvr_os-version >/dev/null

echo "==> chroot install packages"
sudo mount --bind /dev squash/dev
sudo mount --bind /proc squash/proc
sudo mount --bind /sys squash/sys
sudo cp /etc/resolv.conf squash/etc/resolv.conf
sudo chroot squash /bin/bash -c '
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends \
  python3 \
  xserver-xorg xinit openbox \
  chromium \
  gdisk dosfstools e2fsprogs rsync \
  grub-efi-amd64 efibootmgr \
  sudo ca-certificates
# live user
if id user >/dev/null 2>&1; then
  mkdir -p /home/user/.config/autostart
  cp /etc/skel/.config/autostart/mariiy-nvr.desktop /home/user/.config/autostart/
  chown -R user:user /home/user/.config || true
fi
apt-get clean
rm -rf /var/lib/apt/lists/*
'
sudo umount squash/sys squash/proc squash/dev

echo "==> rebuild squashfs"
sudo rm -f "${SFS}"
sudo mksquashfs squash "${SFS}" -comp xz -b 1M -e boot

echo "==> make hybrid ISO"
ISO_OUT="${OUT_DIR}/${OS_NAME}-${VERSION}-${ARCH}.iso"
rm -f "${ISO_OUT}"

# Replay boot from original when possible; else rebuild with GRUB eltorito paths.
if xorriso -indev debian-live.iso -report_system_area as_mkisofs >/tmp/as_mkisofs.txt 2>/dev/null; then
  # shellcheck disable=SC2046
  eval xorriso -as mkisofs \
    $(grep -E '^-' /tmp/as_mkisofs.txt | tr '\n' ' ') \
    -V "MARIIY_NVR" \
    -o "${ISO_OUT}" \
    extract/
else
  xorriso -as mkisofs -r -J -joliet-long -V "MARIIY_NVR" \
    -o "${ISO_OUT}" \
    -partition_offset 16 \
    -append_partition 2 0xef extract/boot/grub/efi.img \
    -appended_part_as_gpt \
    -c boot/boot.cat \
    -b boot/grub/i386-pc/eltorito.img \
    -no-emul-boot -boot-load-size 4 -boot-info-table --grub2-boot-info \
    --grub2-mbr extract/boot/grub/i386-pc/boot_hybrid.img \
    -eltorito-alt-boot \
    -e '--interval:appended_partition_2:all::' \
    -no-emul-boot \
    extract/
fi

(
  cd "${OUT_DIR}"
  sha256sum "$(basename "${ISO_OUT}")" | tee "$(basename "${ISO_OUT}").sha256"
)
ls -lh "${ISO_OUT}"
echo "==> DONE ${ISO_OUT}"
