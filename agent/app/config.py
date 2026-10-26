from __future__ import annotations

import json
import os
import time
from datetime import datetime
from pathlib import Path

VERSION = "1.0.0"
OS_NAME = "mariiy_nvr_os"

DATA_DIR = Path(os.environ.get("MARIIY_DATA", str(Path.home() / ".mariiy_nvr_os")))
CONFIG_PATH = DATA_DIR / "channels.json"
REMOTE_PATH = DATA_DIR / "remote.json"
LOG_PATH = DATA_DIR / "system.log"
GO2RTC_PATH = Path(os.environ.get("MARIIY_GO2RTC_CONFIG", str(DATA_DIR / "go2rtc.yaml")))
RECORD_DIR = Path(os.environ.get("MARIIY_RECORD_DIR", str(DATA_DIR / "recordings")))
SNAPSHOT_DIR = Path(os.environ.get("MARIIY_SNAPSHOT_DIR", str(DATA_DIR / "snapshots")))
GO2RTC_URL = os.environ.get("MARIIY_GO2RTC_URL", "http://127.0.0.1:1984")
AGENT_HOST = os.environ.get("MARIIY_AGENT_HOST", "0.0.0.0")
AGENT_PORT = int(os.environ.get("MARIIY_AGENT_PORT", "8080"))
MAX_CHANNELS = 32


def ensure_dirs() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    RECORD_DIR.mkdir(parents=True, exist_ok=True)
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)


def append_log(level: str, text: str) -> None:
    ensure_dirs()
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    entry = {"time": stamp, "level": level, "text": text, "ts": int(time.time())}
    try:
        with LOG_PATH.open("a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception:
        pass


def load_logs(limit: int = 200) -> list[dict]:
    ensure_dirs()
    if not LOG_PATH.exists():
        return []
    items: list[dict] = []
    try:
        lines = LOG_PATH.read_text(encoding="utf-8", errors="ignore").splitlines()
        for line in reversed(lines[-limit:]):
            line = line.strip()
            if not line:
                continue
            try:
                items.append(json.loads(line))
            except Exception:
                continue
    except Exception:
        pass
    return items


def load_channels() -> list[dict]:
    ensure_dirs()
    if not CONFIG_PATH.exists():
        return []
    try:
        data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        return list(data.get("channels") or [])
    except Exception:
        return []


def save_channels(channels: list[dict]) -> None:
    ensure_dirs()
    CONFIG_PATH.write_text(
        json.dumps({"channels": channels}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def load_remote() -> dict:
    ensure_dirs()
    if not REMOTE_PATH.exists():
        return {"enabled": True, "host": "", "linked": False, "viewers": 2}
    try:
        data = json.loads(REMOTE_PATH.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            return data
    except Exception:
        pass
    return {"enabled": True, "host": "", "linked": False, "viewers": 2}


def save_remote(remote: dict) -> dict:
    ensure_dirs()
    clean = {
        "enabled": bool(remote.get("enabled", True)),
        "host": str(remote.get("host") or "").strip(),
        "linked": bool(remote.get("linked") and remote.get("host")),
        "viewers": int(remote.get("viewers") or 2),
    }
    REMOTE_PATH.write_text(
        json.dumps(clean, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return clean
