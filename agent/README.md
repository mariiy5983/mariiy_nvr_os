# Mariiy NVR Agent

系統服務：ONVIF 發現／登入、串流（go2rtc）、錄影控制、給前端的 API。

## 本機開發（Windows）

```bash
cd agent
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8080 --reload
```

介面請用 `web/` 的 HTTP 伺服器，並設定代理或同源：`http://127.0.0.1:8080`。

## Linux 安裝後

由 systemd 啟動 `mariiy-agent` 與 `mariiy-go2rtc`。  
硬體解碼：Intel VAAPI（`/dev/dri/renderD128`）。
