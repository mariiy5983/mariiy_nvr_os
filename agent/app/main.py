from __future__ import annotations

import os
import shutil
import subprocess
import time
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from . import go2rtc, onvif_client, system_info
from .config import (
    GO2RTC_URL,
    MAX_CHANNELS,
    RECORD_DIR,
    SNAPSHOT_DIR,
    VERSION,
    ensure_dirs,
    load_channels,
    load_remote,
    save_channels,
    save_remote,
)

app = FastAPI(title="Mariiy NVR Agent", version=VERSION)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class DiscoverBody(BaseModel):
    timeout: float = 3.0


class AddCameraBody(BaseModel):
    xaddr: str
    username: str = "admin"
    password: str = ""
    name: str = ""
    slot: int | None = None


class ChannelPatch(BaseModel):
    name: str | None = None
    preview: bool | None = None
    recording: bool | None = None
    username: str | None = None
    password: str | None = None


class PtzBody(BaseModel):
    action: str


class RemoteBody(BaseModel):
    enabled: bool = True
    host: str = ""
    linked: bool = False
    viewers: int = 2


def _next_slot(channels: list[dict]) -> int:
    used = {int(c.get("id") or c.get("slot") or 0) for c in channels}
    for i in range(1, MAX_CHANNELS + 1):
        if i not in used:
            return i
    raise HTTPException(400, "已達 32 路上限")


def _sync_go2rtc(channels: list[dict]) -> None:
    use_vaapi = system_info.collect().get("vaapi", False)
    go2rtc.write_go2rtc_config(channels, use_vaapi=use_vaapi)
    try:
        import httpx

        httpx.post(f"{GO2RTC_URL}/api/restart", timeout=2.0)
    except Exception:
        pass


@app.on_event("startup")
def _startup() -> None:
    ensure_dirs()
    channels = load_channels()
    if channels:
        _sync_go2rtc(channels)


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {"ok": True, "version": VERSION, "go2rtc": GO2RTC_URL}


@app.get("/api/system")
def system() -> dict[str, Any]:
    return system_info.collect()


@app.post("/api/system/reboot")
def api_reboot() -> dict[str, Any]:
    if os.name != "nt":
        subprocess.Popen(["sh", "-c", "sleep 1 && (reboot || reboot -f)"])
    return {"ok": True}


@app.post("/api/system/poweroff")
def api_poweroff() -> dict[str, Any]:
    if os.name != "nt":
        subprocess.Popen(["sh", "-c", "sleep 1 && (poweroff || poweroff -f)"])
    return {"ok": True}


@app.get("/api/remote")
def api_get_remote() -> dict[str, Any]:
    return {"remote": load_remote()}


@app.post("/api/remote")
def api_set_remote(body: RemoteBody) -> dict[str, Any]:
    saved = save_remote(body.model_dump())
    return {"remote": saved}


@app.post("/api/onvif/discover")
def api_discover(body: DiscoverBody) -> dict[str, Any]:
    devices = onvif_client.discover(timeout=body.timeout)
    return {"devices": devices}


@app.post("/api/onvif/add")
def api_add(body: AddCameraBody) -> dict[str, Any]:
    channels = load_channels()
    try:
        meta = onvif_client.fetch_profiles_and_streams(body.xaddr, body.username, body.password)
    except Exception as err:
        raise HTTPException(400, f"ONVIF 連線失敗：{err}") from err

    profiles = meta["profiles"]
    if not profiles:
        raise HTTPException(400, "攝影機沒有可用的媒體設定檔")

    main = next((p for p in profiles if p.get("kind") == "main"), profiles[0])
    sub = next((p for p in profiles if p.get("kind") == "sub"), profiles[-1 if len(profiles) > 1 else 0])

    slot = body.slot or _next_slot(channels)
    if any(int(c.get("id") or 0) == slot for c in channels):
        raise HTTPException(400, f"通道 {slot} 已被使用")

    name = body.name or meta["device"].get("model") or meta.get("host") or f"CH{slot:02d}"
    channel = {
        "id": slot,
        "name": name,
        "host": meta.get("host"),
        "xaddr": body.xaddr,
        "username": body.username,
        "password": body.password,
        "online": True,
        "preview": True,
        "recording": True,
        "mainUri": main.get("streamUri"),
        "subUri": sub.get("streamUri"),
        "device": meta.get("device") or {},
        "profiles": profiles,
    }
    channels.append(channel)
    channels.sort(key=lambda c: int(c.get("id") or 0))
    save_channels(channels)
    _sync_go2rtc(channels)
    return {"channel": _public(channel)}


@app.get("/api/channels")
def api_channels() -> dict[str, Any]:
    channels = [_public(c) for c in load_channels()]
    by_id = {int(c["id"]): c for c in channels}
    grid = []
    for i in range(1, MAX_CHANNELS + 1):
        if i in by_id:
            grid.append(by_id[i])
        else:
            grid.append(
                {
                    "id": i,
                    "name": f"CH{i:02d}",
                    "online": False,
                    "preview": False,
                    "recording": False,
                    "empty": True,
                }
            )
    return {"channels": grid, "configured": channels}


@app.patch("/api/channels/{channel_id}")
def api_patch(channel_id: int, body: ChannelPatch) -> dict[str, Any]:
    channels = load_channels()
    target = next((c for c in channels if int(c.get("id") or 0) == channel_id), None)
    if not target:
        raise HTTPException(404, "通道不存在")
    data = body.model_dump(exclude_unset=True)
    target.update(data)
    save_channels(channels)
    _sync_go2rtc(channels)
    return {"channel": _public(target)}


@app.delete("/api/channels/{channel_id}")
def api_delete(channel_id: int) -> dict[str, Any]:
    channels = [c for c in load_channels() if int(c.get("id") or 0) != channel_id]
    save_channels(channels)
    _sync_go2rtc(channels)
    return {"ok": True}


@app.get("/api/channels/{channel_id}/stream")
def api_stream(channel_id: int, main: bool = False) -> dict[str, Any]:
    channels = load_channels()
    target = next((c for c in channels if int(c.get("id") or 0) == channel_id), None)
    if not target:
        raise HTTPException(404, "通道不存在")
    return {
        "id": channel_id,
        "player": go2rtc.stream_page_url(channel_id, main=main),
        "webrtc": go2rtc.mse_url(channel_id, main=main),
        "go2rtc": GO2RTC_URL,
        "src": f"ch{channel_id:02d}{'_main' if main else ''}",
    }


@app.post("/api/channels/{channel_id}/ptz")
def api_ptz(channel_id: int, body: PtzBody) -> dict[str, Any]:
    channels = load_channels()
    target = next((c for c in channels if int(c.get("id") or 0) == channel_id), None)
    if not target:
        raise HTTPException(404, "通道不存在")
    moved = onvif_client.ptz_move(
        target.get("xaddr") or "",
        target.get("username") or "admin",
        target.get("password") or "",
        body.action,
    )
    return {"ok": True, "moved": moved}


@app.post("/api/channels/{channel_id}/snapshot")
def api_snapshot(channel_id: int) -> dict[str, Any]:
    ensure_dirs()
    channels = load_channels()
    target = next((c for c in channels if int(c.get("id") or 0) == channel_id), None)
    if not target:
        raise HTTPException(404, "通道不存在")
    uri = target.get("subUri") or target.get("mainUri")
    if not uri:
        raise HTTPException(400, "沒有串流位址")
    out = SNAPSHOT_DIR / f"ch{channel_id:02d}_{int(time.time())}.jpg"
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise HTTPException(500, "系統未安裝 ffmpeg")
    cmd = [
        ffmpeg,
        "-y",
        "-rtsp_transport",
        "tcp",
        "-i",
        uri,
        "-frames:v",
        "1",
        str(out),
    ]
    if system_info.collect().get("vaapi"):
        cmd = [
            ffmpeg,
            "-y",
            "-hwaccel",
            "vaapi",
            "-hwaccel_device",
            "/dev/dri/renderD128",
            "-rtsp_transport",
            "tcp",
            "-i",
            uri,
            "-frames:v",
            "1",
            str(out),
        ]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
    if proc.returncode != 0 or not out.exists():
        raise HTTPException(500, f"抓圖失敗：{proc.stderr[-400:]}")
    return {"name": out.name, "path": str(out), "url": f"/api/snapshots/{out.name}"}


@app.get("/api/snapshots/{filename}")
def api_get_snapshot(filename: str) -> FileResponse:
    safe_name = os.path.basename(filename)
    target = SNAPSHOT_DIR / safe_name
    if not target.is_file():
        raise HTTPException(404, "圖片不存在")
    return FileResponse(target, media_type="image/jpeg")


@app.get("/api/recordings")
def api_recordings() -> dict[str, Any]:
    ensure_dirs()
    items = []
    for path in sorted(RECORD_DIR.glob("**/*"), reverse=True):
        if path.is_file() and path.suffix.lower() in {".mp4", ".mkv", ".ts"}:
            items.append({"name": path.name, "path": str(path), "size": path.stat().st_size})
    return {"recordings": items[:200]}


def _public(channel: dict) -> dict:
    out = dict(channel)
    if "password" in out:
        out["hasPassword"] = bool(out["password"])
        out["password"] = ""
    out["stream"] = {
        "player": go2rtc.stream_page_url(int(out["id"])),
        "playerMain": go2rtc.stream_page_url(int(out["id"]), main=True),
        "src": f"ch{int(out['id']):02d}",
    }
    return out
