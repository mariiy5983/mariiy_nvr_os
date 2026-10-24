import tarfile
from pathlib import Path

p = Path(__file__).resolve().parents[1] / "iso-work-installer/overlay/mariiy-nvr.apkovl.tar.gz"
t = tarfile.open(p)
d = t.extractfile("usr/sbin/mariiy-installer").read()
print("CR count", d.count(b"\r"))
print("bare clear", any(l.strip() == b"clear" for l in d.splitlines()))
print("ok" if d.count(b"\r") == 0 else "FAIL")
