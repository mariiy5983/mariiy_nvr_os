#!/usr/bin/env python3
"""Extract install tools from Alpine APKs into dest/ (Alpine gptfdisk has gdisk, not sgdisk)."""
from __future__ import annotations

import sys
import tarfile
from pathlib import Path

WANT = {
    "usr/bin/gdisk": "gdisk",
    "sbin/mkfs.vfat": "mkfs.vfat",
    "sbin/mkfs.fat": "mkfs.fat",
    "sbin/mkfs.ext4": "mkfs.ext4",
    "sbin/mke2fs": "mke2fs",
    "usr/bin/rsync": "rsync",
}


def main() -> int:
    apk_dir = Path(sys.argv[1])
    dest = Path(sys.argv[2])
    dest.mkdir(parents=True, exist_ok=True)
    found: dict[str, bytes] = {}

    for apk in sorted(apk_dir.glob("*.apk")):
        try:
            with tarfile.open(apk, "r:gz") as tar:
                for m in tar.getmembers():
                    name = m.name.lstrip("./")
                    if name not in WANT or not m.isfile():
                        continue
                    f = tar.extractfile(m)
                    if not f:
                        continue
                    found[WANT[name]] = f.read()
                    print(f"got {WANT[name]} from {apk.name}")
        except Exception as err:
            print(f"skip {apk.name}: {err}", file=sys.stderr)

    for out_name, data in found.items():
        path = dest / out_name
        path.write_bytes(data)
        try:
            path.chmod(0o755)
        except Exception:
            pass
    # Windows may ignore Unix exec bits — build script also chmods + xorriso -chmod

    if "mke2fs" in found and "mkfs.ext4" not in found:
        wrapper = b'#!/bin/sh\nexec "$(dirname "$0")/mke2fs" -t ext4 "$@"\n'
        path = dest / "mkfs.ext4"
        path.write_bytes(wrapper)
        path.chmod(0o755)

    if "mkfs.fat" in found and "mkfs.vfat" not in found:
        wrapper = b'#!/bin/sh\nexec "$(dirname "$0")/mkfs.fat" -F 32 "$@"\n'
        path = dest / "mkfs.vfat"
        path.write_bytes(wrapper)
        path.chmod(0o755)

    need = ["gdisk", "mkfs.vfat", "mkfs.ext4", "rsync"]
    missing = [n for n in need if not (dest / n).exists()]
    if missing:
        print("MISSING:", ", ".join(missing), file=sys.stderr)
        return 1
    print("tools ->", dest)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
