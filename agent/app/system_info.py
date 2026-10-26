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
_LAST_CPU_STAT: tuple[int, int] | None = None


def _read(path: str | Path) -> str:
    try:
        return Path(path).read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""


def _cpu_percent() -> int:
    global _LAST_CPU_STAT
    stat_text = _read("/proc/stat")
    for line in stat_text.splitlines():
        if line.startswith("cpu "):
            parts = [int(x) for x in line.split()[1:9] if x.isdigit()]
            if len(parts) >= 4:
                idle = parts[3] + (parts[4] if len(parts) > 4 else 0)
                total = sum(parts)
                if _LAST_CPU_STAT is not None:
                    prev_idle, prev_total = _LAST_CPU_STAT
                    d_total = total - prev_total
                    d_idle = idle - prev_idle
                    _LAST_CPU_STAT = (idle, total)
                    if d_total > 0:
                        return max(1, min(100, round((1.0 - d_idle / d_total) * 100)))
                else:
                    _LAST_CPU_STAT = (idle, total)
            break
    return 5


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
                mounted_path = ""
                for mline in _read("/proc/mounts").splitlines():
                    mparts = mline.split()
                    if len(mparts) >= 2 and mparts[0].startswith(f"/dev/{name}"):
                        mounted_path = mparts[1]
                        break
                if not mounted_path and os.name != "nt":
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


def _cidr_to_netmask(prefix: int) -> str:
    mask = (0xFFFFFFFF >> (32 - prefix)) << (32 - prefix)
    return f"{(mask >> 24) & 0xFF}.{(mask >> 16) & 0xFF}.{(mask >> 8) & 0xFF}.{mask & 0xFF}"


def _collect_network() -> dict:
    ip = "127.0.0.1"
    mac = "00:00:00:00:00:00"
    gateway = ""
    mask = "255.255.255.0"
    iface = ""
    dns_list: list[str] = []

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
        out = subprocess.check_output(["ip", "-4", "-o", "addr", "show"], text=True, timeout=2)
        for line in out.splitlines():
            parts = line.split()
            if len(parts) >= 4 and parts[1] != "lo":
                for idx, tok in enumerate(parts):
                    if tok == "inet" and idx + 1 < len(parts):
                        cidr = parts[idx + 1]
                        ip = cidr.split("/")[0]
                        if "/" in cidr:
                            try:
                                mask = _cidr_to_netmask(int(cidr.split("/")[1]))
                            except ValueError:
                                pass
                        break
                if ip != "127.0.0.1":
                    break
    except Exception:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.settimeout(0.5)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
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

    for line in _read("/etc/resolv.conf").splitlines():
        line = line.strip()
        if line.startswith("nameserver"):
            parts = line.split()
            if len(parts) >= 2:
                dns_list.append(parts[1])

    return {
        "ip": ip,
        "mask": mask,
        "gateway": gateway or (ip.rsplit(".", 1)[0] + ".1" if "." in ip and not ip.startswith("127.") else "192.168.1.1"),
        "dns1": dns_list[0] if len(dns_list) > 0 else "8.8.8.8",
        "dns2": dns_list[1] if len(dns_list) > 1 else "1.1.1.1",
        "mac": mac,
        "iface": iface,
    }


def collect() -> dict:
    mem_total = mem_avail = None
    meminfo = _read("/proc/meminfo")
    for line in meminfo.splitlines():
        if line.startswith("MemTotal:"):
            mem_total = int(line.split()[1]) // 1024
        elif line.startswith("MemAvailable:"):
            mem_avail = int(line.split()[1]) // 1024

    cpu_model = platform.processor() or platform.machine()
    cpu_cores = os.cpu_count() or 1
    cpuinfo = _read("/proc/cpuinfo")
    for line in cpuinfo.splitlines():
        if line.startswith("model name"):
            cpu_model = line.split(":", 1)[1].strip()
            break

    board = _read("/sys/class/dmi/id/product_name").strip() or _read("/sys/class/dmi/id/board_name").strip() or platform.machine()
    vendor = _read("/sys/class/dmi/id/sys_vendor").strip()
    if vendor and vendor.lower() not in board.lower():
        board = f"{vendor} {board}".strip()

    serial = (
        _read("/etc/machine-id").strip()[:16].upper()
        or _read("/sys/class/dmi/id/product_uuid").strip()[:16].upper()
        or "MNOS-1000"
    )

    temp_c = None
    if Path("/sys/class/thermal").is_dir():
        for tz in Path("/sys/class/thermal").glob("thermal_zone*/temp"):
            raw = _read(tz).strip()
            if raw.isdigit() and int(raw) > 0:
                temp_c = round(int(raw) / 1000)
                break

    vaapi = Path("/dev/dri/renderD128").exists()
    gpu = "VAAPI 硬體加速 (/dev/dri/renderD128)" if vaapi else "KMS / DRM 顯示"
    if "vmware" in board.lower():
        gpu = "VMware SVGA II (KMS)"

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
        "board": board,
        "cpu": f"{cpu_model} ({cpu_cores} 核心)",
        "cpuPercent": _cpu_percent(),
        "gpu": gpu,
        "serial": serial,
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
