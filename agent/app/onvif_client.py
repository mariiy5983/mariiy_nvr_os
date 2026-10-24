from __future__ import annotations

import socket
import subprocess
import time
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import quote, urlparse, urlunparse
from xml.etree import ElementTree as ET

NS = {
    "s": "http://www.w3.org/2003/05/soap-envelope",
    "d": "http://schemas.xmlsoap.org/ws/2005/04/discovery",
    "a": "http://schemas.xmlsoap.org/ws/2004/08/addressing",
    "dn": "http://www.onvif.org/ver10/network/wsdl",
}


def _local_ipv4s() -> list[str]:
    ips: list[str] = ["0.0.0.0"]
    try:
        out = subprocess.check_output(["ip", "-4", "-o", "addr", "show"], text=True, timeout=2)
        for line in out.splitlines():
            parts = line.split()
            for idx, tok in enumerate(parts):
                if tok == "inet" and idx + 1 < len(parts):
                    ip = parts[idx + 1].split("/")[0]
                    if ip and not ip.startswith("127.") and ip not in ips:
                        ips.append(ip)
    except Exception:
        pass
    return ips


def discover(timeout: float = 3.0) -> list[dict[str, str]]:
    """WS-Discovery Probe for NetworkVideoTransmitter across all active IPv4 interfaces."""
    msgid = f"uuid:{uuid.uuid4()}"
    body = f"""<?xml version="1.0" encoding="UTF-8"?>
<e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope"
 xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing"
 xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery"
 xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
  <e:Header>
    <w:MessageID>{msgid}</w:MessageID>
    <w:To e:mustUnderstand="true">urn:schemas-xmlsoap-org:ws:2005:04/discovery</w:To>
    <w:Action a:mustUnderstand="true">http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action>
  </e:Header>
  <e:Body>
    <d:Probe>
      <d:Types>dn:NetworkVideoTransmitter</d:Types>
    </d:Probe>
  </e:Body>
</e:Envelope>""".encode("utf-8")

    found: dict[str, dict[str, str]] = {}
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
    try:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 2)
        sock.settimeout(max(0.5, min(timeout, 10.0)))
        sent = False
        for ip in _local_ipv4s():
            try:
                if ip != "0.0.0.0":
                    sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_IF, socket.inet_aton(ip))
                sock.sendto(body, ("239.255.255.250", 3702))
                sent = True
            except OSError:
                continue
        if not sent:
            return []

        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            rem = max(0.1, deadline - time.monotonic())
            sock.settimeout(rem)
            try:
                data, _addr = sock.recvfrom(65535)
            except (socket.timeout, OSError):
                break
            try:
                root = ET.fromstring(data)
            except ET.ParseError:
                continue
            xaddrs = root.find(".//{http://schemas.xmlsoap.org/ws/2005/04/discovery}XAddrs")
            scopes = root.find(".//{http://schemas.xmlsoap.org/ws/2005/04/discovery}Scopes")
            if xaddrs is None or not xaddrs.text:
                continue
            urls = xaddrs.text.split()
            http = next((u for u in urls if u.startswith("http")), urls[0])
            host = urlparse(http).hostname or ""
            name = ""
            if scopes is not None and scopes.text:
                for part in scopes.text.split():
                    if "name/" in part:
                        name = part.rsplit("/", 1)[-1]
            found[http] = {"xaddr": http, "host": host, "name": name or host}
    finally:
        sock.close()
    return list(found.values())


def _inject_rtsp_auth(uri: str, username: str, password: str) -> str:
    if not uri or not uri.startswith("rtsp://") or not username:
        return uri
    parsed = urlparse(uri)
    if "@" in (parsed.netloc or ""):
        return uri
    user_enc = quote(username, safe="")
    pass_enc = quote(password or "", safe="")
    auth = f"{user_enc}:{pass_enc}@" if password else f"{user_enc}@"
    netloc = f"{auth}{parsed.netloc}"
    return urlunparse((parsed.scheme, netloc, parsed.path, parsed.params, parsed.query, parsed.fragment))


def _open_camera(xaddr: str, username: str, password: str) -> tuple[Any, str, int]:
    try:
        from onvif import ONVIFCamera
    except ImportError as err:
        raise RuntimeError("請安裝 onvif-zeep") from err

    parsed = urlparse(xaddr if "://" in xaddr else f"http://{xaddr}")
    host = parsed.hostname or xaddr
    port = parsed.port or 80

    wsdl_candidates = [
        Path(__file__).resolve().parents[1] / "wsdl",
        Path("/usr/share/mariiy_nvr_os/agent/wsdl"),
    ]
    wsdl_dir = next((str(p) for p in wsdl_candidates if p.is_dir()), None)
    kwargs: dict[str, Any] = {"no_cache": True}
    if wsdl_dir:
        kwargs["wsdl_dir"] = wsdl_dir

    last_err: Exception | None = None
    for try_port in dict.fromkeys([port, 80, 8000, 8080, 8899]):
        for adj in (False, True):
            try:
                cam = ONVIFCamera(host, try_port, username, password, adjust_time=adj, **kwargs)
                return cam, host, try_port
            except Exception as err:
                last_err = err
    raise RuntimeError(str(last_err or "無法連線至 ONVIF 裝置"))


def fetch_profiles_and_streams(
    xaddr: str,
    username: str,
    password: str,
) -> dict[str, Any]:
    """Connect to ONVIF camera, fetch profiles and RTSP URIs with credentials."""
    cam, host, _port = _open_camera(xaddr, username, password)
    media = cam.create_media_service()

    profiles = media.GetProfiles()
    result = []
    for idx, profile in enumerate(profiles):
        token = profile.token
        uri = media.GetStreamUri(
            {
                "StreamSetup": {"Stream": "RTP-Unicast", "Transport": {"Protocol": "RTSP"}},
                "ProfileToken": token,
            }
        )
        stream = _inject_rtsp_auth(getattr(uri, "Uri", "") or "", username, password)
        enc = getattr(profile, "VideoEncoderConfiguration", None)
        width = height = fps = None
        if enc is not None:
            res = getattr(enc, "Resolution", None)
            if res is not None:
                width = getattr(res, "Width", None)
                height = getattr(res, "Height", None)
            rate = getattr(enc, "RateControl", None)
            if rate is not None:
                fps = getattr(rate, "FrameRateLimit", None)
        result.append(
            {
                "token": token,
                "name": getattr(profile, "Name", None) or f"profile{idx}",
                "streamUri": stream,
                "width": width,
                "height": height,
                "fps": fps,
                "kind": "main" if idx == 0 else "sub",
            }
        )

    if len(result) >= 2:
        ordered = sorted(
            result,
            key=lambda p: (p.get("width") or 99999) * (p.get("height") or 99999),
        )
        ordered[0]["kind"] = "sub"
        ordered[-1]["kind"] = "main"
        by_token = {p["token"]: p for p in ordered}
        for p in result:
            p["kind"] = by_token[p["token"]]["kind"]

    info = {"manufacturer": "", "model": "", "firmware": ""}
    try:
        dev = cam.create_devicemgmt_service()
        di = dev.GetDeviceInformation()
        info = {
            "manufacturer": getattr(di, "Manufacturer", "") or "",
            "model": getattr(di, "Model", "") or "",
            "firmware": getattr(di, "FirmwareVersion", "") or "",
        }
    except Exception:
        pass

    return {"profiles": result, "device": info, "host": host, "xaddr": xaddr}


def ptz_move(xaddr: str, username: str, password: str, action: str, profile_token: str | None = None) -> bool:
    """Best-effort ONVIF PTZ movement."""
    Vectors = {
        "向上": (0.0, 0.5, 0.0),
        "向下": (0.0, -0.5, 0.0),
        "向左": (-0.5, 0.0, 0.0),
        "向右": (0.5, 0.0, 0.0),
        "變倍放大": (0.0, 0.0, 0.5),
        "變倍縮小": (0.0, 0.0, -0.5),
    }
    try:
        cam, _host, _port = _open_camera(xaddr, username, password)
        media = cam.create_media_service()
        ptz = cam.create_ptz_service()
        if not profile_token:
            profiles = media.GetProfiles()
            if not profiles:
                return False
            profile_token = profiles[0].token
        if action == "復位":
            ptz.GotoHomePosition({"ProfileToken": profile_token})
            return True
        if action in Vectors:
            x, y, z = Vectors[action]
            ptz.ContinuousMove(
                {
                    "ProfileToken": profile_token,
                    "Velocity": {"PanTilt": {"x": x, "y": y}, "Zoom": {"x": z}},
                }
            )
            time.sleep(0.35)
            ptz.Stop({"ProfileToken": profile_token, "PanTilt": True, "Zoom": True})
            return True
    except Exception:
        return False
    return False
