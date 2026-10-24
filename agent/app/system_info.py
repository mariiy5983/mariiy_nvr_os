from __future__ import annotations

import os
import platform
import re
import shutil
import socket
import subprocess
import time
from pathlib import Path

from .config import OS_NAME, RECORD_DIR, VERSION

BOOT_AT = time.time()


def _read(path: str | Path) -> str:
    try:
        return Path(path).read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""


def _human_gb(num_bytes: int) -> str:
    gb = num_bytes / (1024**3)
    if gb >= 1000:
        return f"{gb / 1024:.1f} TB"
    if gb >= 10:
        return f"{round(gb)} GB"
    return f"{gb:.1f} GB"


def _root_disk_base() -> str:
    for line in _read("/proc/mounts").splitlines():
        parts = line.split()
        if len(parts) >= 2 and parts[1] == "/":
            dev = parts[0]
            if dev.startswith("/dev/"):
                name = dev.removeprefix("/dev/")
                m = re.match(r"^(nvme\d+n\d+|mmcblk\d+|[a-z]+)", name)
                if m:
                    return m.group(1)
    return ""


def _collect_disks() -> list[dict]:
    root_base = _root_disk_base()
    disks: list[dict] = []
    rec_idx = 1

    sys_block = Path("/sys/block")
    if sys_block.is_dir():
        for entry in sorted(sys_block.iterdir(), key=lambda p: p.name):
            name = entry.name
            if not name.startswith(("sd", "nvme", "vd", "xvd", "hd")):
                continue
            try:
                sectors = int(_read(entry / "size").strip() or "0")
            except ValueError:
                sectors = 0
            total_bytes = sectors * 512
            if total_bytes < 1024 * 1024 * 512:
                continue

            is_system = (name == root_base) or (not root_base and not disks)
            used_bytes = 0
            if is_system:
                try:
                    u = shutil.disk_usage("/")
                    used_bytes = u.total - u.free
                except Exception:
                    used_bytes = 0
            else:
                # Check if any partition of this disk is mounted, or mount MARIIY_REC automatically
                mounted_path = ""
                for mline in _read("/proc/mounts").splitlines():
                    mparts = mline.split()
                    if len(mparts) >= 2 and mparts[0].startswith(f"/dev/{name}"):
                        mounted_path = mparts[1]
                        break
                if not mounted_path and os.name != "nt":
                    # Try mounting largest partition on RECORD_DIR if RECORD_DIR is not a mountpoint
                    part_candidates = sorted(
                        entry.glob(f"{name}*"),
                        key=lambda p: int(_read(p / "size").strip() or "0") if (p / "size").exists() else 0,
                        reverse=True,
                    )
                    if part_candidates:
                        part_dev = f"/dev/{part_candidates[0].name}"
                        try:
                            RECORD_DIR.mkdir(parents=True, exist_ok=True)
                            subprocess.run(
                                ["mount", "-o", "rw,noatime", part_dev, str(RECORD_DIR)],
                                capture_output=True,
                                timeout=3,
                            )
                            mounted_path = str(RECORD_DIR)
                        except Exception:
                            pass
                if mounted_path:
                    try:
                        u = shutil.disk_usage(mounted_path)
                        used_bytes = u.total - u.free
                    except Exception:
                        used_bytes = 0

            disks.append(
                {
                    "slot": "系統" if is_system else str(rec_idx),
                    "dev": name,
                    "role": "system" if is_system else "record",
                    "size": _human_gb(total_bytes),
                    "used": _human_gb(used_bytes),
                    "totalGB": round(total_bytes / (1024**3), 1),
                    "usedGB": round(used_bytes / (1024**3), 1),
                    "status": "正常",
                }
            )
            if not is_system:
                rec_idx += 1

    if not disks:
        try:
            usage = shutil.disk_usage("/")
            disks.append(
                {
                    "slot": "系統",
                    "dev": "sda",
                    "role": "system",
                    "size": _human_gb(usage.total),
                    "used": _human_gb(usage.total - usage.free),
                    "totalGB": round(usage.total / (1024**3), 1),
                    "usedGB": round((usage.total - usage.free) / (1024**3), 1),
                    "status": "正常",
                }
            )
        except Exception:
            pass
    return disks


def _collect_network() -> dict:
    ip = "127.0.0.1"
    mac = "02:4E:56:52:00:01"
    gateway = "192.168.1.1"
    mask = "255.255.255.0"
    iface = ""

    net_dir = Path("/sys/class/net")
    if net_dir.is_dir():
        for entry in sorted(net_dir.iterdir(), key=lambda p: p.name):
            if entry.name == "lo":
                continue
            addr = _read(entry / "address").strip().upper()
            if addr and addr != "00:00:00:00:00:00":
                mac = addr
                iface = entry.name
                break

    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
    except Exception:
        try:
            out = subprocess.check_output(["ip", "-4", "-o", "addr", "show"], text=True, timeout=2)
            for line in out.splitlines():
                parts = line.split()
                if len(parts) >= 4 and parts[1] != "lo":
                    for idx, tok in enumerate(parts):
                        if tok == "inet" and idx + 1 < len(parts):
                            ip = parts[idx + 1].split("/")[0]
                            break
        except Exception:
            pass

    try:
        out = subprocess.check_output(["ip", "route", "show", "default"], text=True, timeout=2)
        for line in out.splitlines():
            parts = line.split()
            if "via" in parts:
                gateway = parts[parts.index("via") + 1]
                break
    except Exception:
        pass

    return {"ip": ip, "mask": mask, "gateway": gateway, "mac": mac, "iface": iface}


def collect() -> dict:
    mem_total = mem_avail = None
    meminfo = _read("/proc/meminfo")
    for line in meminfo.splitlines():
        if line.startswith("MemTotal:"):
            mem_total = int(line.split()[1]) // 1024
        elif line.startswith("MemAvailable:"):
            mem_avail = int(line.split()[1]) // 1024

    cpu_model = platform.processor() or platform.machine()
    cpuinfo = _read("/proc/cpuinfo")
    for line in cpuinfo.splitlines():
        if line.startswith("model name"):
            cpu_model = line.split(":", 1)[1].strip()
            break

    temp_c = 40
    for tz in Path("/sys/class/thermal").glob("thermal_zone*/temp") if Path("/sys/class/thermal").is_dir() else []:
        raw = _read(tz).strip()
        if raw.isdigit() and int(raw) > 0:
            temp_c = round(int(raw) / 1000)
            break

    vaapi = Path("/dev/dri/renderD128").exists()
    uptime = int(time.time() - BOOT_AT)
    up_raw = _read("/proc/uptime").split()
    if up_raw:
        try:
            uptime = int(float(up_raw[0]))
        except ValueError:
            pass

    return {
        "product": "Mariiy NVR",
        "osName": OS_NAME,
        "version": VERSION,
        "platform": platform.platform(),
        "cpu": cpu_model,
        "tempC": temp_c,
        "memoryMB": mem_total,
        "memoryAvailMB": mem_avail,
        "vaapi": vaapi,
        "uptimeSec": uptime,
        "hostname": platform.node(),
        "disks": _collect_disks(),
        "network": _collect_network(),
        "recordPath": os.environ.get("MARIIY_RECORD_DIR", str(RECORD_DIR)),
    }
