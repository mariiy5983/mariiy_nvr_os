/* Mariiy NVR front-end API bridge (agent + go2rtc). */
(function (global) {
  const host = (global.location && global.location.hostname) ? global.location.hostname : "127.0.0.1";
  const AGENT = (global.MARIIY_AGENT_URL || ("http://" + host + ":8080")).replace(/\/$/, "");
  const GO2RTC = (global.MARIIY_GO2RTC_URL || ("http://" + host + ":1984")).replace(/\/$/, "");

  async function req(path, options) {
    const res = await fetch(AGENT + path, Object.assign({ headers: { "Content-Type": "application/json" } }, options || {}));
    if (!res.ok) {
      let detail = res.statusText;
      try {
        const body = await res.json();
        detail = body.detail || JSON.stringify(body);
      } catch (_) {}
      throw new Error(detail);
    }
    return res.json();
  }

  const api = {
    agent: AGENT,
    go2rtc: GO2RTC,
    async health() {
      try {
        return await req("/api/health");
      } catch (_) {
        return null;
      }
    },
    system() {
      return req("/api/system");
    },
    logs() {
      return req("/api/logs");
    },
    setResolution(resolution) {
      return req("/api/system/resolution", { method: "POST", body: JSON.stringify({ resolution: resolution }) });
    },
    reboot() {
      return req("/api/system/reboot", { method: "POST", body: "{}" });
    },
    poweroff() {
      return req("/api/system/poweroff", { method: "POST", body: "{}" });
    },
    factoryReset() {
      return req("/api/system/factory-reset", { method: "POST", body: "{}" });
    },
    getRemote() {
      return req("/api/remote");
    },
    setRemote(payload) {
      return req("/api/remote", { method: "POST", body: JSON.stringify(payload) });
    },
    channels() {
      return req("/api/channels");
    },
    discover(timeout) {
      return req("/api/onvif/discover", { method: "POST", body: JSON.stringify({ timeout: timeout || 3 }) });
    },
    addCamera(payload) {
      return req("/api/onvif/add", { method: "POST", body: JSON.stringify(payload) });
    },
    patchChannel(id, payload) {
      return req("/api/channels/" + id, { method: "PATCH", body: JSON.stringify(payload) });
    },
    removeChannel(id) {
      return req("/api/channels/" + id, { method: "DELETE" });
    },
    stream(id, main) {
      return req("/api/channels/" + id + "/stream?main=" + (main ? "true" : "false"));
    },
    ptz(id, action) {
      return req("/api/channels/" + id + "/ptz", { method: "POST", body: JSON.stringify({ action: action }) });
    },
    snapshots() {
      return req("/api/snapshots");
    },
    snapshot(id) {
      return req("/api/channels/" + id + "/snapshot", { method: "POST", body: "{}" });
    },
    deleteSnapshot(filename) {
      return req("/api/snapshots/" + encodeURIComponent(filename), { method: "DELETE" });
    },
    recordings() {
      return req("/api/recordings");
    },
    playerUrl(id, main) {
      const src = "ch" + String(id).padStart(2, "0") + (main ? "_main" : "");
      return GO2RTC + "/stream.html?src=" + encodeURIComponent(src);
    },
  };

  global.MariiyAPI = api;
})(window);
