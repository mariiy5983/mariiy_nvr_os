#!/usr/bin/env bash
# Build INSTALLER-ONLY ISO (no live NVR). Boot -> install to disk -> reboot into Mariiy NVR.
set -euo pipefail

VERSION="${VERSION:-1.0.0}"
OS_NAME="mariiy_nvr_os"
ARCH="amd64"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${WORK:-${ROOT}/iso-work-installer}"
OUT_DIR="${OUT_DIR:-${ROOT}/dist}"
ALPINE_VERSION="${ALPINE_VERSION:-3.24.0}"
ALPINE_URL="${ALPINE_URL:-https://dl-cdn.alpinelinux.org/alpine/latest-stable/releases/x86_64/alpine-standard-${ALPINE_VERSION}-x86_64.iso}"
GO2RTC_VER="${GO2RTC_VER:-1.9.9}"
GO2RTC_URL="${GO2RTC_URL:-https://github.com/AlexxIT/go2rtc/releases/download/v${GO2RTC_VER}/go2rtc_linux_amd64}"

# Load mptspi/vmw_pvscsi BEFORE ahci so VMware SCSI disk0 is /dev/sda (matching BIOS hd0)
BOOT_MODULES="loop,squashfs,sd-mod,usb-storage,sr-mod,mptspi,vmw_pvscsi,megaraid_sas,ahci,ata_piix,nvme,virtio_pci,virtio_blk,virtio_scsi,xhci-hcd,ehci-hcd,uhci-hcd,usbhid,hid,hid-generic,crc32c,jbd2,mbcache,ext4,nls_cp437,nls_iso8859-1,fat,vfat"

echo "==> ${OS_NAME} ${VERSION} INSTALLER ISO"
mkdir -p "${WORK}" "${OUT_DIR}"
cd "${WORK}"

need() { command -v "$1" >/dev/null || { echo "missing: $1"; exit 1; }; }
need curl; need xorriso; need rsync; need tar
if command -v python3 >/dev/null; then PY=python3; elif command -v py >/dev/null; then PY="py -3"; else echo "need python"; exit 1; fi

if [[ ! -f alpine.iso ]]; then
  if [[ -f "${ROOT}/iso-work-full/alpine.iso" ]]; then cp -f "${ROOT}/iso-work-full/alpine.iso" alpine.iso
  elif [[ -f "${ROOT}/iso-work-alpine/alpine.iso" ]]; then cp -f "${ROOT}/iso-work-alpine/alpine.iso" alpine.iso
  else curl -fL --retry 5 -o alpine.iso.part "${ALPINE_URL}"; mv alpine.iso.part alpine.iso; fi
fi

APK_SRC="${WORK}/offline-apks"
echo "==> syncing offline APKs (and pruning stale duplicate versions)"
$PY "${ROOT}/iso/fetch-apks.py" "${APK_SRC}"

rm -rf overlay boot-patch
mkdir -p overlay/mariiy/{web,agent,bin,apks,packaging,installer} boot-patch/boot/syslinux boot-patch/boot/grub

rsync -a "${ROOT}/web/" overlay/mariiy/web/
rsync -a --exclude '.venv' --exclude '__pycache__' --exclude 'onvif' --exclude 'wsdl' "${ROOT}/agent/" overlay/mariiy/agent/
rsync -a "${ROOT}/packaging/" overlay/mariiy/packaging/
apk_copied=0
apk_skipped_fw=0
for f in "$APK_SRC"/*.apk; do
  [ -f "$f" ] || continue
  b=$(basename "$f")
  case "$b" in
    linux-firmware-none-*|linux-firmware-i915-*|linux-firmware-xe-*) ;;
    linux-firmware-*) apk_skipped_fw=$((apk_skipped_fw + 1)); continue ;;
    gcc-[0-9]*|musl-dev-*|python3-dev-*|libxml2-dev-*|libxslt-dev-*|zlib-dev-*|xz-dev-*|binutils-*|isl25-*|mpc1-*|mpfr4-*|libgcc-static-*|xf86-video-vmware-*)
      apk_skipped_fw=$((apk_skipped_fw + 1)); continue ;;
  esac
  cp -f "$f" overlay/mariiy/apks/
  apk_copied=$((apk_copied + 1))
done
echo "  apks copied: ${apk_copied} (skipped: ${apk_skipped_fw})"

# Copy scripts and force Unix LF via Python
unix_sh() {
  local src="$1" dest="$2"
  $PY - "$src" "$dest" <<'PY'
import sys
src, dest = sys.argv[1], sys.argv[2]
data = open(src, "rb").read().replace(b"\r\n", b"\n").replace(b"\r", b"\n")
open(dest, "wb").write(data)
PY
  chmod 755 "$dest"
}
unix_sh "${ROOT}/iso/installer/mariiy-installer" overlay/mariiy/bin/mariiy-installer
unix_sh "${ROOT}/iso/installer/mariiy-install-disk" overlay/mariiy/bin/mariiy-install-disk
unix_sh "${ROOT}/packaging/bin/mariiy-agent-start" overlay/mariiy/bin/mariiy-agent-start
unix_sh "${ROOT}/packaging/bin/mariiy-session" overlay/mariiy/bin/mariiy-session
unix_sh "${ROOT}/iso/installer/mariiy-nvr-kiosk" overlay/mariiy/bin/mariiy-nvr-kiosk
for f in overlay/mariiy/packaging/openrc/* overlay/mariiy/packaging/bin/*; do
  [ -f "$f" ] || continue
  unix_sh "$f" "$f.lf"
  mv -f "$f.lf" "$f"
  chmod 755 "$f"
done

if [[ ! -f "${WORK}/go2rtc" ]]; then
  echo "==> download go2rtc ${GO2RTC_VER}"
  curl -fL --retry 5 -o "${WORK}/go2rtc.part" "${GO2RTC_URL}"
  mv "${WORK}/go2rtc.part" "${WORK}/go2rtc"
fi
cp -f "${WORK}/go2rtc" overlay/mariiy/bin/go2rtc

# Pure-Python onvif-zeep (vendored for offline use)
mkdir -p "${WORK}/wheels" overlay/mariiy/wheels
if ! ls "${WORK}/wheels"/onvif* >/dev/null 2>&1; then
  echo "==> download onvif-zeep (offline install)"
  $PY - "${WORK}/wheels" <<'PY'
import json, sys, urllib.request
from pathlib import Path
out = Path(sys.argv[1])
req = urllib.request.Request(
    "https://pypi.org/pypi/onvif-zeep/0.2.12/json",
    headers={"User-Agent": "mariiy-nvr-os-fetch/1.0"},
)
meta = json.loads(urllib.request.urlopen(req, timeout=60).read().decode())
urls = meta["urls"]
pick = next((u for u in urls if u.get("packagetype") == "bdist_wheel"), urls[0])
dest = out / pick["filename"]
print("get", pick["filename"])
data = urllib.request.urlopen(urllib.request.Request(
    pick["url"], headers={"User-Agent": "mariiy-nvr-os-fetch/1.0"}
), timeout=120).read()
dest.write_bytes(data)
print("saved", dest, len(data))
PY
fi
cp -f "${WORK}/wheels"/* overlay/mariiy/wheels/ 2>/dev/null || true
$PY - "${WORK}/wheels" overlay/mariiy/agent <<'PY'
import sys, tarfile
from pathlib import Path
wheel_dir, dest = Path(sys.argv[1]), Path(sys.argv[2])
tgz = next(wheel_dir.glob("onvif*"))
with tarfile.open(tgz, "r:*") as tar:
    for m in tar.getmembers():
        parts = Path(m.name).parts
        if len(parts) < 2:
            continue
        kind = parts[1]
        if kind not in ("onvif", "wsdl"):
            continue
        rel = Path(*parts[1:])
        if m.isdir():
            (dest / rel).mkdir(parents=True, exist_ok=True)
            continue
        src = tar.extractfile(m)
        if src is None:
            continue
        outp = dest / rel
        outp.parent.mkdir(parents=True, exist_ok=True)
        outp.write_bytes(src.read())
print("vendored onvif into", dest)
PY

chmod 755 overlay/mariiy/bin/*

# --- Patch bootloader: visible boot + optional unattended install ---
cat > boot-patch/boot/syslinux/syslinux.cfg <<EOF
SERIAL 0 115200
TIMEOUT 30
PROMPT 1
DEFAULT lts

LABEL lts
MENU LABEL Mariiy NVR ${VERSION} Installer
KERNEL /boot/vmlinuz-lts
INITRD /boot/initramfs-lts
FDTDIR /boot/dtbs-lts
APPEND modules=${BOOT_MODULES} console=tty0 earlyprintk=vga

LABEL autoinstall
MENU LABEL Mariiy NVR ${VERSION} Auto-Install
KERNEL /boot/vmlinuz-lts
INITRD /boot/initramfs-lts
FDTDIR /boot/dtbs-lts
APPEND modules=${BOOT_MODULES} console=tty0 earlyprintk=vga mariiy_autoinstall=1
EOF

cat > boot-patch/boot/grub/grub.cfg <<EOF
set timeout=3
set gfxpayload=text

menuentry "Mariiy NVR ${VERSION} Installer" {
	linux	/boot/vmlinuz-lts modules=${BOOT_MODULES} console=tty0 earlyprintk=vga
	initrd	/boot/initramfs-lts
}

menuentry "Mariiy NVR ${VERSION} Auto-Install" {
	linux	/boot/vmlinuz-lts modules=${BOOT_MODULES} console=tty0 earlyprintk=vga mariiy_autoinstall=1
	initrd	/boot/initramfs-lts
}
EOF

# --- apkovl: must include .default_boot_services or modloop never starts ---
OVL="${WORK}/apkovl-root"
rm -rf "$OVL"
mkdir -p "$OVL/etc/local.d" "$OVL/etc/runlevels/default" "$OVL/etc/conf.d" "$OVL/root" "$OVL/etc/apk" "$OVL/bin"
: >"$OVL/etc/runlevels/default/.keep"
: >"$OVL/etc/.default_boot_services"

cat >"$OVL/etc/hostname" <<EOF
mariiy-install
EOF

cat >"$OVL/etc/motd" <<EOF

========================================
  mariiy_nvr_os ${VERSION} INSTALL MEDIA
  Press Enter to confirm install
========================================

EOF

mkdir -p "$OVL/usr/sbin"
unix_sh "${ROOT}/iso/installer/mariiy-installer" "$OVL/usr/sbin/mariiy-installer"
unix_sh "${ROOT}/iso/installer/mariiy-install-disk" "$OVL/usr/sbin/mariiy-install-disk"

cat >"$OVL/usr/sbin/mariiy-tty1" <<'EOF'
#!/bin/sh
export HOME=/root
export PATH="/usr/sbin:/usr/bin:/sbin:/bin:/media/cdrom/mariiy/bin:/mariiy/bin"

printf '\033c'
echo "========================================"
echo "  Mariiy NVR Install Media"
echo "========================================"
echo "Mounting install media..."

mkdir -p /media/cdrom
i=0
while [ "$i" -lt 20 ]; do
  mount -o ro /dev/sr0 /media/cdrom 2>/dev/null \
    || mount -o ro /dev/cdrom /media/cdrom 2>/dev/null \
    || true
  if [ -d /media/cdrom/mariiy ] || [ -d /mariiy ]; then
    echo "Media OK."
    break
  fi
  i=$((i + 1))
  echo "  waiting for CD/USB (${i}/20)..."
  sleep 2
done

if [ -x /usr/sbin/mariiy-installer ]; then
  /usr/sbin/mariiy-installer
else
  echo "ERROR: /usr/sbin/mariiy-installer missing"
fi

echo
echo "Dropping to shell. Type: mariiy-installer"
exec /bin/sh
EOF
unix_sh "$OVL/usr/sbin/mariiy-tty1" "$OVL/usr/sbin/mariiy-tty1.lf"
mv -f "$OVL/usr/sbin/mariiy-tty1.lf" "$OVL/usr/sbin/mariiy-tty1"

cat >"$OVL/etc/inittab" <<'EOF'
::sysinit:/sbin/openrc sysinit
::sysinit:/sbin/openrc boot
::wait:/sbin/openrc default
tty1::respawn:/usr/sbin/mariiy-tty1
tty2::respawn:/sbin/getty 38400 tty2
tty3::respawn:/sbin/getty 38400 tty3
::ctrlaltdel:/sbin/reboot
::shutdown:/sbin/openrc shutdown
EOF
unix_sh "$OVL/etc/inittab" "$OVL/etc/inittab.lf"
mv -f "$OVL/etc/inittab.lf" "$OVL/etc/inittab"

cat >"$OVL/etc/local.d/mariiy.start" <<'EOF'
#!/bin/sh
mkdir -p /media/cdrom
mount -o ro /dev/sr0 /media/cdrom 2>/dev/null || true
EOF
unix_sh "$OVL/etc/local.d/mariiy.start" "$OVL/etc/local.d/mariiy.start.lf"
mv -f "$OVL/etc/local.d/mariiy.start.lf" "$OVL/etc/local.d/mariiy.start"

$PY - <<PY
import tarfile
from pathlib import Path
ovl = Path(r"${OVL}")
out = Path(r"${WORK}/overlay/mariiy-nvr.apkovl.tar.gz")
out.parent.mkdir(parents=True, exist_ok=True)

def fix_tarinfo(ti: tarfile.TarInfo) -> tarfile.TarInfo:
    ti.uid = 0
    ti.gid = 0
    ti.uname = "root"
    ti.gname = "root"
    if ti.isdir() or ti.name.startswith("usr/sbin/") or ti.name.endswith(".start"):
        ti.mode = 0o755
    else:
        ti.mode = 0o644
    return ti

with tarfile.open(out, "w:gz") as tar:
    for path in sorted(ovl.rglob("*")):
        if path.is_dir():
            continue
        rel = path.relative_to(ovl).as_posix()
        tar.add(path, arcname=rel, filter=fix_tarinfo)
    info = tarfile.TarInfo("etc/runlevels/default/local")
    info.type = tarfile.SYMTYPE
    info.linkname = "/etc/init.d/local"
    info.uid = 0
    info.gid = 0
    info.uname = "root"
    info.gname = "root"
    tar.addfile(info)
print("apkovl", out, "bytes", out.stat().st_size)
PY

cat > overlay/mariiy/README.txt <<EOF
mariiy_nvr_os ${VERSION} 安裝版 ISO
--------------------------------
開機後自動進入安裝畫面，按 Enter 確認安裝。
裝完後按 Enter 自動退片並重開機進入 Mariiy NVR。
EOF

ISO_OUT="${OUT_DIR}/${OS_NAME}-${VERSION}-${ARCH}-installer.iso"
rm -f "${ISO_OUT}"

echo "==> remaster ISO (keep Alpine volid, patch boot, add installer)"
xorriso -indev alpine.iso -outdev "${ISO_OUT}" \
  -boot_image any replay \
  -map boot-patch/boot/syslinux/syslinux.cfg /boot/syslinux/syslinux.cfg \
  -map boot-patch/boot/grub/grub.cfg /boot/grub/grub.cfg \
  -map overlay/mariiy /mariiy \
  -map overlay/mariiy-nvr.apkovl.tar.gz /mariiy-nvr.apkovl.tar.gz \
  -chmod_r 0755 /mariiy/bin -- \
  -chmod_r 0755 /mariiy/packaging/bin -- \
  -chmod_r 0755 /mariiy/packaging/openrc -- \
  -compliance no_emul_toc

(
  cd "${OUT_DIR}"
  sha256sum "$(basename "${ISO_OUT}")" | tee "$(basename "${ISO_OUT}").sha256"
)
ls -lh "${ISO_OUT}"
echo "==> DONE ${ISO_OUT}"
