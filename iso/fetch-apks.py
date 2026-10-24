#!/usr/bin/env python3
"""Download Alpine APKs + dependencies for offline Mariiy NVR ISO."""
from __future__ import annotations

import io
import re
import sys
import tarfile
import urllib.request
from pathlib import Path

VERSION = "v3.24"
ARCH = "x86_64"
MIRRORS = [
    f"https://dl-cdn.alpinelinux.org/alpine/{VERSION}/main/{ARCH}",
    f"https://dl-cdn.alpinelinux.org/alpine/{VERSION}/community/{ARCH}",
]

ROOT_PKGS = [
    "alpine-base",
    "alpine-baselayout",
    "alpine-conf",
    "linux-lts",
    "linux-firmware-none",
    "linux-firmware-i915",
    "mkinitfs",
    "openrc",
    "busybox",
    "busybox-openrc",
    "busybox-mdev-openrc",
    "eudev",
    "eudev-openrc",
    "udev-init-scripts",
    "udev-init-scripts-openrc",
    "dbus",
    "dbus-openrc",
    "dbus-x11",
    "acpid",
    "acpid-openrc",
    "chrony",
    "chrony-openrc",
    "python3",
    "py3-pip",
    "py3-virtualenv",
    "py3-lxml",
    "py3-fastapi",
    "uvicorn",
    "py3-httpx",
    "py3-pydantic",
    "py3-starlette",
    "py3-softlayer-zeep",
    "py3-requests",
    "firefox",
    "font-dejavu",
    "font-noto-cjk",
    "mesa-dri-gallium",
    "mesa-egl",
    "mesa-gl",
    "mesa-gbm",
    "mesa-va-gallium",
    "libva",
    "libva-intel-driver",
    "intel-media-driver",
    "ffmpeg",
    "xorg-server",
    "xf86-video-fbdev",
    "xf86-video-vesa",
    "xf86-input-libinput",
    "xf86-input-evdev",
    "openbox",
    "xinit",
    "xauth",
    "xhost",
    "xset",
    "xsetroot",
    "xrandr",
    "xterm",
    "setxkbmap",
    "mcookie",
    "util-linux",
    "blkid",
    "lsblk",
    "findmnt",
    "partx",
    "sfdisk",
    "e2fsprogs",
    "e2fsprogs-extra",
    "dosfstools",
    "gptfdisk",
    "rsync",
    "bash",
    "curl",
    "ca-certificates",
    "iproute2",
    "pciutils",
    "grub",
    "grub-efi",
    "grub-bios",
    "efibootmgr",
]


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "mariiy-nvr-os-fetch/1.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read()


def parse_index(blob: bytes, repo: str) -> dict[str, dict]:
    pkgs: dict[str, dict] = {}
    with tarfile.open(fileobj=io.BytesIO(blob), mode="r:gz") as tar:
        member = next((m for m in tar.getmembers() if m.name.endswith("APKINDEX")), None)
        if not member:
            raise RuntimeError("APKINDEX missing")
        text = tar.extractfile(member).read().decode("utf-8", "replace")
    cur: dict[str, str] = {}
    for line in text.splitlines():
        if not line:
            if "P" in cur and "V" in cur:
                name = cur["P"]
                pkgs[name] = {
                    "name": name,
                    "ver": cur["V"],
                    "deps": [d for d in re.split(r"[\s]+", cur.get("D", "")) if d and not d.startswith("!")],
                    "provides": [d for d in re.split(r"[\s]+", cur.get("p", "")) if d],
                    "file": f"{name}-{cur['V']}.apk",
                    "repo": repo,
                }
            cur = {}
            continue
        if ":" in line:
            k, v = line.split(":", 1)
            cur[k] = v
    return pkgs


def provide_map(pkgs: dict[str, dict]) -> dict[str, str]:
    amap: dict[str, str] = {}
    for name, meta in pkgs.items():
        amap[name] = name
        for p in meta["provides"]:
            key = p.split("=", 1)[0]
            amap.setdefault(key, name)
            amap.setdefault(p, name)
    return amap


def resolve(wanted: list[str], pkgs: dict[str, dict], amap: dict[str, str]) -> list[str]:
    need: set[str] = set()
    stack = list(wanted)
    while stack:
        item = stack.pop()
        name = amap.get(item, item)
        name = name.split("=", 1)[0].split(">", 1)[0].split("<", 1)[0].split("~", 1)[0]
        if name.startswith("!") or name.startswith("/"):
            continue
        # linux-lts pulls the full firmware tree (~1GB). Keep only the dummy
        # provider plus Intel GPU firmware for VAAPI.
        if name == "linux-firmware":
            continue
        if name.startswith("linux-firmware-") and name not in (
            "linux-firmware-none",
            "linux-firmware-i915",
            "linux-firmware-xe",
        ):
            continue
        if name not in pkgs:
            alt = amap.get(item.split("=", 1)[0].split("~", 1)[0])
            if not alt or alt not in pkgs:
                print(f"warn: skip unresolved {item}", file=sys.stderr)
                continue
            name = alt
        if name in need:
            continue
        need.add(name)
        openrc_sub = f"{name}-openrc"
        if openrc_sub in pkgs and openrc_sub not in need:
            stack.append(openrc_sub)
        for dep in pkgs[name]["deps"]:
            dep_name = dep.split("=", 1)[0].split(">", 1)[0].split("<", 1)[0].split("~", 1)[0]
            if dep_name.startswith("!"):
                continue
            stack.append(dep_name)
    return sorted(need)


def main() -> int:
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "apks")
    out.mkdir(parents=True, exist_ok=True)
    all_pkgs: dict[str, dict] = {}
    for repo in MIRRORS:
        print(f"index {repo}")
        blob = fetch(f"{repo}/APKINDEX.tar.gz")
        parsed = parse_index(blob, repo)
        for k, v in parsed.items():
            all_pkgs.setdefault(k, v)

    amap = provide_map(all_pkgs)
    names = resolve(ROOT_PKGS, all_pkgs, amap)
    print(f"packages: {len(names)}")
    expected_files: set[str] = set()
    for name in names:
        meta = all_pkgs[name]
        expected_files.add(meta["file"])
        dest = out / meta["file"]
        if dest.exists() and dest.stat().st_size > 32:
            print(f"have {meta['file']}")
            continue
        url = f"{meta['repo']}/{meta['file']}"
        print(f"get  {meta['file']}")
        data = fetch(url)
        dest.write_bytes(data)

    # Remove stale or duplicate APK versions from previous runs
    for old in list(out.glob("*.apk")):
        if old.name not in expected_files:
            print(f"prune stale {old.name}")
            old.unlink()

    print(f"done -> {out} ({len(expected_files)} apks)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
