const NAMES = [
  "大門", "大廳", "櫃台", "走廊 A", "走廊 B", "電梯 1", "電梯 2", "樓梯間",
  "停車場入口", "停車場出口", "停車場 B1", "停車場 B2", "後門", "卸貨區", "倉庫", "機房",
  "辦公室 1", "辦公室 2", "會議室", "茶水間", "屋頂", "圍牆東", "圍牆西", "周界 1",
  "周界 2", "店面", "收銀台", "車道", "安全梯", "地下室", "通道", "側門",
];

const OFFLINE = new Set([7, 15, 24, 32]);
const ALARM = new Set([9, 22]);
const IR = new Set([1, 9, 10, 13, 21, 22, 23, 24, 25, 32]);
const LAYOUT_NAME = {
  1: "單畫面",
  4: "四畫面",
  9: "九畫面",
  16: "十六畫面",
  25: "二十五畫面",
  32: "三十二畫面",
};
const SCREEN_NAME = {
  live: "預覽",
  playback: "回放",
  pictures: "圖片",
  settings: "設定",
};
const SETTINGS_GROUPS = [
  ["系統", [
    ["basic", "基本設定"],
    ["info", "系統資訊"],
    ["time", "時間設定"],
    ["user", "使用者"],
    ["log", "日誌"],
    ["maintain", "維護"],
    ["firmware", "韌體"],
  ]],
  ["網路", [
    ["lan", "區域網路"],
    ["remote", "遠端"],
    ["mail", "郵件"],
  ]],
  ["影像", [
    ["channel", "通道"],
    ["encode", "編碼"],
    ["audio", "音訊"],
  ]],
  ["錄影", [
    ["record", "錄影計畫"],
    ["disk", "硬碟"],
  ]],
  ["事件", [
    ["alarm", "警報"],
    ["exception", "例外"],
  ]],
  ["預覽", [
    ["display", "顯示"],
  ]],
];
const ZONES = [
  ["Asia/Taipei", "台北 (UTC+8)"],
  ["Asia/Hong_Kong", "香港 (UTC+8)"],
  ["Asia/Shanghai", "上海 (UTC+8)"],
  ["Asia/Tokyo", "東京 (UTC+9)"],
  ["UTC", "UTC"],
];
const STORE_KEY = "nvr-setup";
const GOOGLE_NTP = "time.google.com";
const VERSION = "1.0.0-beta.1";
const OS_NAME = "mariiy_nvr_os";
const GITHUB = "https://github.com/mariiy5983/mariiy_nvr_os";
const LICENSE = "GPLv3";
const BOOT_AT = Date.now();
const HARDWARE = {
  model: "Mariiy NVR",
  board: "Intel N100",
  cpu: "Intel N100 · 4 核心 4 執行緒",
  gpu: "Intel UHD · VAAPI",
  memory: "8 GB",
  serial: "MNOS-N100-0001",
};
const IDLE_KEY = "nvr-activity";
const LOCK_KEY = "nvr-locked";
const FAIL_KEY = "nvr-lock-fails";
const FAIL_UNTIL_KEY = "nvr-lock-until";
const DISKS = [
  { slot: "系統", dev: "nvme0n1", role: "system", size: "128 GB", used: "18 GB", status: "正常" },
  { slot: "1", dev: "sda", role: "record", size: "4 TB", used: "1.2 TB", status: "正常" },
  { slot: "2", dev: "sdb", role: "record", size: "4 TB", used: "860 GB", status: "正常" },
];
const PAGE_HINT = {
  playback: "點通道開始回放，時間軸可拖動",
  pictures: "在預覽按抓圖，圖片會留在這裡",
  settings: "這些設定會保留，直到恢復原廠設定",
};
const SPLITS = [
  [1, 1, 1],
  [2, 2, 4],
  [3, 3, 9],
  [4, 4, 16],
  [5, 5, 25],
  [8, 4, 32],
];

const channels = NAMES.map((name, index) => {
  const id = index + 1;
  const online = !OFFLINE.has(id);
  return {
    id,
    index,
    name,
    online,
    preview: true,
    recording: online && id !== 18 && id !== 28,
    alarm: ALARM.has(id),
    ir: IR.has(id),
    shift: (index * 17) % 58,
  };
});

function defaultRemote() {
  return {
    enabled: true,
    host: "",
    linked: false,
    viewers: 2,
  };
}

function defaultTime() {
  return {
    zone: "Asia/Taipei",
    ntp: true,
    server: GOOGLE_NTP,
    interval: 60,
    dst: false,
    syncedAt: "",
  };
}

function defaultNetwork() {
  return {
    dhcp: true,
    ip: "192.168.1.88",
    mask: "255.255.255.0",
    gateway: "192.168.1.1",
    dns1: "8.8.8.8",
    dns2: "1.1.1.1",
    mac: "02:4E:56:52:00:01",
  };
}

function defaultSystem() {
  return {
    deviceNo: "1",
    resolution: "1920×1080",
    autoReboot: false,
    rebootHour: 3,
    checkUpdate: true,
    standby: 10,
  };
}

function defaultUser() {
  return { name: "admin", password: "", idleMinutes: 10 };
}

function defaultMail() {
  return {
    enabled: false,
    server: "",
    port: "587",
    ssl: true,
    account: "",
    from: "",
    to: "",
  };
}

function defaultException() {
  return {
    diskFull: true,
    diskError: true,
    netDown: true,
    ipConflict: true,
    channelOff: true,
    beep: true,
    mail: false,
  };
}

function defaultSound() {
  return { output: true, volume: 70, codec: "G.711u" };
}

function defaultRecordPlan() {
  return { mode: "always", pre: 5, post: 10, overwrite: true };
}

function defaultEncode() {
  return { codec: "H.265", mainRes: "1920×1080", mainFps: 15, subRes: "640×360", subFps: 15 };
}

function defaultAlarmLink() {
  return { record: true, shot: true, beep: true, mail: false };
}

function defaultOsd() {
  return { name: true, time: true, mouseHide: 10 };
}

const state = {
  layout: 16,
  page: 0,
  selected: 0,
  zoomed: false,
  forceMain: false,
  tour: false,
  audio: false,
  ptzOpen: false,
  menuOpen: false,
  confirm: null,
  context: null,
  screen: "live",
  settingsTab: "basic",
  play: { index: 0, minute: 12 * 60, playing: false },
  shots: [],
  shotView: null,
  deviceName: "Mariiy NVR",
  tourSeconds: 8,
  bootLayout: 16,
  setup: false,
  remote: defaultRemote(),
  time: defaultTime(),
  network: defaultNetwork(),
  system: defaultSystem(),
  user: defaultUser(),
  recordPlan: defaultRecordPlan(),
  encode: defaultEncode(),
  alarmLink: defaultAlarmLink(),
  osd: defaultOsd(),
  mail: defaultMail(),
  exception: defaultException(),
  sound: defaultSound(),
  firmwareName: "",
  firmwareStatus: `目前 ${VERSION}`,
  logFilter: "all",
  locked: false,
  wizard: { step: 0, password: "", confirm: "", error: "" },
};

let tourTimer = 0;
let toastTimer = 0;
let alarmCursor = 0;

function chLabel(ch) {
  return `CH${String(ch.id).padStart(2, "0")} ${ch.name}`;
}

function nowText() {
  const text = new Date().toLocaleString("sv-SE", {
    timeZone: state.time.zone || "Asia/Taipei",
    hour12: false,
  });
  return text.replace("T", " ").replace(",", "").slice(0, 19);
}

function settingsLabel(id) {
  for (const [, items] of SETTINGS_GROUPS) {
    const found = items.find((item) => item[0] === id);
    if (found) return found[1];
  }
  return "基本設定";
}

function timeStatus() {
  if (!state.time.ntp) return "手動校時";
  return `已與 ${state.time.server || GOOGLE_NTP} 同步成功`;
}

function idleMs() {
  return (Number(state.user.idleMinutes) || 10) * 60 * 1000;
}

function hardwareStats() {
  const elapsed = Math.max(1, Date.now() - BOOT_AT);
  const wave = (Math.sin(Date.now() / 5000) + 1) / 2;
  const cpu = 8 + Math.round(wave * 14);
  const memUsed = 2.04 + wave * 0.38;
  const temp = 39 + Math.round(wave * 7);
  const sec = Math.floor(elapsed / 1000);
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const uptime = days ? `${days} 天 ${hours} 小時 ${mins} 分` : `${hours} 小時 ${mins} 分`;
  return {
    cpu: `${cpu} %`,
    mem: `${memUsed.toFixed(2)} GB / ${HARDWARE.memory}`,
    temp: `${temp} °C`,
    uptime,
  };
}

function encodeRate(res) {
  const table = {
    "2560×1440": 4096,
    "1920×1080": 2048,
    "1280×720": 1024,
    "704×576": 512,
    "640×360": 384,
  };
  return `${table[res] || 1024} Kbps`;
}

function paneTitle(text) {
  const el = document.createElement("div");
  el.className = "pane-title";
  el.textContent = text;
  return el;
}

function linkValue(href, label) {
  const a = document.createElement("a");
  a.className = "ext";
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener";
  a.textContent = label || href.replace(/^https:\/\//, "");
  return a;
}

function confirmInfo() {
  if (state.confirm === "factory") {
    return ["恢復原廠設定", "會清除通道、網路、帳號和時間設定，並重新進行開機設定。時間會回到 time.google.com。"];
  }
  if (state.confirm === "firmware") {
    return ["更新韌體", `會把 ${state.firmwareName || "韌體檔"} 寫入系統碟。錄影碟不會動。`];
  }
  return ["關閉主機", `確定要關閉${state.deviceName}？`];
}

function passwordError(first, second) {
  if (first.length < 8) return "密碼至少 8 個字元";
  if (first !== second) return "兩次密碼不一致";
  return "";
}

function validIPv4(value) {
  return /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(value);
}

function channelAddress(ch) {
  return `192.168.1.${20 + ch.index}:80`;
}

function saveStore() {
  if (!state.setup) return;
  const data = {
    setup: true,
    deviceName: state.deviceName,
    tourSeconds: state.tourSeconds,
    layout: state.layout,
    bootLayout: state.bootLayout,
    zoomed: state.zoomed,
    settingsTab: state.settingsTab,
    remote: state.remote,
    time: state.time,
    network: state.network,
    system: state.system,
    user: state.user,
    recordPlan: state.recordPlan,
    encode: state.encode,
    alarmLink: state.alarmLink,
    osd: state.osd,
    mail: state.mail,
    exception: state.exception,
    sound: state.sound,
    channels: channels.map((ch) => ({
      name: ch.name,
      preview: ch.preview,
      recording: ch.recording,
      alarm: ch.alarm,
    })),
  };
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

function loadStore() {
  try {
    const data = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (!data || !data.setup) return;
    state.setup = true;
    if (data.deviceName) state.deviceName = data.deviceName;
    if (state.deviceName === "監控主機") state.deviceName = "Mariiy NVR";
    if (data.tourSeconds) state.tourSeconds = data.tourSeconds;
    if (data.layout) state.layout = data.layout;
    if (data.bootLayout) state.bootLayout = data.bootLayout;
    state.zoomed = Boolean(data.zoomed);
    if (data.settingsTab) state.settingsTab = data.settingsTab;
    Object.assign(state.remote, data.remote || {});
    Object.assign(state.time, data.time || {});
    Object.assign(state.network, data.network || {});
    Object.assign(state.system, data.system || {});
    Object.assign(state.user, data.user || {});
    Object.assign(state.recordPlan, data.recordPlan || {});
    Object.assign(state.encode, data.encode || {});
    Object.assign(state.alarmLink, data.alarmLink || {});
    Object.assign(state.osd, data.osd || {});
    Object.assign(state.mail, data.mail || {});
    Object.assign(state.exception, data.exception || {});
    Object.assign(state.sound, data.sound || {});
    if (!state.user.idleMinutes) state.user.idleMinutes = 10;
    if (!state.encode.codec) state.encode.codec = "H.265";
    if (!state.time.server) state.time.server = GOOGLE_NTP;
    if (state.remote.host === "nvr.example.com") state.remote.host = "";
    delete state.remote.token;
    state.remote.linked = Boolean(state.remote.linked && state.remote.host);
    if (Array.isArray(data.channels)) {
      data.channels.forEach((item, index) => {
        const ch = channels[index];
        if (!ch || !item) return;
        if (item.name) ch.name = item.name;
        if (typeof item.preview === "boolean") ch.preview = item.preview;
        if (typeof item.recording === "boolean") ch.recording = item.recording;
        if (typeof item.alarm === "boolean") ch.alarm = item.alarm;
      });
    }
  } catch (err) {
    state.setup = false;
  }
}

function streamName() {
  return state.zoomed && state.forceMain ? "主碼流" : "子碼流";
}

function rateOf(ch) {
  if (!ch.online || !ch.preview) return "";
  const main = state.zoomed && state.forceMain;
  return encodeRate(main ? state.encode.mainRes : state.encode.subRes);
}

function pageCount() {
  if (state.zoomed) return channels.length;
  return Math.ceil(channels.length / state.layout);
}

function toast(text) {
  const node = document.getElementById("toast");
  node.textContent = text;
  node.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("show"), 1700);
}

function splitIcon(cols, rows) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const size = 3;
  const gap = 1;
  const w = cols * size + (cols - 1) * gap;
  const h = rows * size + (rows - 1) * gap;
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("class", cols > rows ? "split-icon wide" : "split-icon");
  svg.setAttribute("aria-hidden", "true");
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const rect = document.createElementNS(svg.namespaceURI, "rect");
      rect.setAttribute("x", String(x * (size + gap)));
      rect.setAttribute("y", String(y * (size + gap)));
      rect.setAttribute("width", String(size));
      rect.setAttribute("height", String(size));
      svg.appendChild(rect);
    }
  }
  return svg;
}

function iconOffline() {
  return `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="14" width="24" height="18" rx="2"/><path d="M30 22l12-7v18l-12-7z"/><path d="M8 40 L42 10"/></svg>`;
}

function iconClosed() {
  return `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="14" width="32" height="20" rx="2"/><path d="M20 20v8l8-4z"/></svg>`;
}

function renderWall() {
  const wall = document.getElementById("wall");
  const layout = state.zoomed ? 1 : state.layout;
  wall.dataset.layout = String(layout);
  wall.replaceChildren();

  const slots = [];
  if (state.zoomed) {
    slots.push(channels[state.selected]);
  } else {
    const start = state.page * state.layout;
    for (let i = 0; i < state.layout; i += 1) slots.push(channels[start + i] || null);
  }

  const time = nowText().slice(11);
  for (const ch of slots) {
    const tile = document.createElement("div");
    tile.className = "tile";
    if (!ch) {
      tile.classList.add("empty");
      wall.appendChild(tile);
      continue;
    }

    tile.dataset.index = String(ch.index);
    tile.setAttribute("role", "button");
    tile.setAttribute("aria-label", chLabel(ch));
    if (ch.index === state.selected) tile.classList.add("selected");
    if (ch.alarm) tile.classList.add("alarm");
    if (ch.ir) tile.classList.add("ir");

    const live = ch.online && ch.preview;
    if (live) {
      tile.appendChild(buildScene(ch));
      const rate = document.createElement("div");
      rate.className = "osd-rate";
      rate.textContent = state.zoomed ? `${streamName()}  ${rateOf(ch)}` : rateOf(ch);
      tile.appendChild(rate);
      if (state.osd.time) {
        const clock = document.createElement("div");
        clock.className = "osd-time";
        clock.textContent = time;
        tile.appendChild(clock);
      }
      if (ch.recording) {
        const rec = document.createElement("i");
        rec.className = "osd-rec";
        tile.appendChild(rec);
      }
      if (state.audio && ch.index === state.selected) {
        const speaker = document.createElement("div");
        speaker.className = "speaker";
        speaker.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h3l4-3v10l-4-3H4z"/><path d="M16 9a4 4 0 0 1 0 6"/></svg>`;
        tile.appendChild(speaker);
      }
    } else {
      const hold = document.createElement("div");
      hold.className = "placeholder";
      hold.innerHTML = ch.online ? iconClosed() : iconOffline();
      const label = document.createElement("span");
      label.textContent = ch.online ? "預覽已關閉" : "無訊號";
      hold.appendChild(label);
      tile.appendChild(hold);
    }

    if (state.osd.name) {
      const name = document.createElement("div");
      name.className = "osd-name";
      name.textContent = chLabel(ch);
      name.title = chLabel(ch);
      tile.appendChild(name);
    }
    if (ch.alarm) {
      const alarm = document.createElement("div");
      alarm.className = "osd-alarm";
      alarm.textContent = "!";
      if (!(live && ch.recording)) alarm.style.right = "6px";
      tile.appendChild(alarm);
    }
    wall.appendChild(tile);
  }
  fitWall();
}

const GRID = {
  1: [1, 1],
  4: [2, 2],
  9: [3, 3],
  16: [4, 4],
  25: [5, 5],
  32: [8, 4],
};

function fitWall() {
  const wall = document.getElementById("wall");
  const spec = GRID[Number(wall.dataset.layout)] || GRID[16];
  const [cols, rows] = spec;
  const gap = 2;
  const pad = 2;
  const availW = wall.clientWidth - pad * 2 - gap * (cols - 1);
  const availH = wall.clientHeight - pad * 2 - gap * (rows - 1);
  if (availW < cols || availH < rows) return;
  let cellW = availW / cols;
  let cellH = cellW * 9 / 16;
  if (cellH * rows > availH) {
    cellH = availH / rows;
    cellW = cellH * 16 / 9;
  }
  wall.style.gridTemplateColumns = `repeat(${cols}, ${cellW}px)`;
  wall.style.gridTemplateRows = `repeat(${rows}, ${cellH}px)`;
}

function buildScene(ch) {
  const scene = document.createElement("div");
  scene.className = "scene";
  const hue = ch.ir ? 95 : 205 + (ch.id * 11) % 40;
  scene.style.setProperty("--sky", `hsl(${hue} 22% ${ch.ir ? 14 : 18}%)`);
  scene.style.setProperty("--ground", `hsl(${hue} 14% 8%)`);
  scene.style.setProperty("--px", `${28 + (ch.shift % 40)}%`);
  scene.style.setProperty("--py", `${30 + (ch.id % 5) * 8}%`);
  scene.style.animationDuration = `${14 + (ch.id % 7)}s`;
  scene.style.animationDelay = `${-ch.id * 0.65}s`;
  if (state.zoomed) {
    const tag = document.createElement("div");
    tag.className = "sim-tag";
    tag.textContent = "模擬畫面";
    scene.appendChild(tag);
  }
  return scene;
}

function statusText() {
  const ch = channels[state.selected];
  const name = chLabel(ch);
  if (!ch.online) return `${name} · 離線`;
  if (!ch.preview) return `${name} · 預覽已關閉`;
  return `${name} · ${streamName()} · ${rateOf(ch)}`;
}

function renderChrome() {
  const live = state.screen === "live";
  document.getElementById("wall").classList.toggle("hidden", !live);
  document.getElementById("page").classList.toggle("hidden", live);
  document.getElementById("liveTools").classList.toggle("hidden", !live);
  document.getElementById("pageTools").classList.toggle("hidden", live);
  document.getElementById("screenName").textContent = SCREEN_NAME[state.screen];
  document.getElementById("pageHint").textContent = PAGE_HINT[state.screen] || "";
  document.getElementById("deviceName").textContent = state.deviceName;
  document.getElementById("versionLabel").textContent = VERSION;

  if (state.screen === "playback") {
    const ch = channels[state.play.index];
    document.getElementById("current").textContent = `${chLabel(ch)} · 回放 · ${formatMinute(state.play.minute)}`;
  } else if (state.screen === "pictures") {
    document.getElementById("current").textContent = `圖片 · ${state.shots.length} 張`;
  } else if (state.screen === "settings") {
    document.getElementById("current").textContent = `設定 · ${settingsLabel(state.settingsTab)}`;
  } else {
    document.getElementById("current").textContent = statusText();
  }

  document.getElementById("pageLabel").textContent = state.zoomed
    ? `${state.selected + 1} / ${channels.length}`
    : `${state.page + 1} / ${pageCount()}`;

  const paging = pageCount() > 1;
  document.getElementById("prevBtn").disabled = !paging;
  document.getElementById("nextBtn").disabled = !paging;

  document.querySelectorAll("[data-layout]").forEach((btn) => {
    const n = Number(btn.dataset.layout);
    const active = state.zoomed ? n === 1 : n === state.layout;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
  });

  const tourBtn = document.getElementById("tourBtn");
  const tourDisabled = !state.zoomed && pageCount() < 2;
  tourBtn.disabled = tourDisabled;
  tourBtn.classList.toggle("active", state.tour && !tourDisabled);
  const audioBtn = document.getElementById("audioBtn");
  audioBtn.classList.toggle("active", state.audio);
  audioBtn.disabled = !state.sound.output;
  document.getElementById("ptzBtn").classList.toggle("active", state.ptzOpen);

  const alarms = channels.filter((ch) => ch.alarm).length;
  const badge = document.getElementById("alarmCount");
  badge.textContent = String(alarms);
  badge.classList.toggle("empty", alarms === 0);
  document.getElementById("alarmBtn").classList.toggle("live", alarms > 0);
  document.getElementById("remoteDot").classList.remove("ok");
  document.getElementById("remotePill").title = remoteStatus();
  const recordDisks = DISKS.filter((disk) => disk.role === "record" && disk.status === "正常");
  document.getElementById("diskDot").classList.toggle("ok", recordDisks.length > 0);
  document.getElementById("diskPill").title = recordDisks.length
    ? `錄影碟 ${recordDisks.length} 顆正常，系統碟不錄影`
    : "沒有可用的錄影碟";

  const ptz = document.getElementById("ptz");
  ptz.classList.toggle("hidden", !live || !state.ptzOpen);
  document.getElementById("ptzTitle").textContent = chLabel(channels[state.selected]);
  document.getElementById("menu").classList.toggle("hidden", !state.menuOpen);
  const confirm = document.getElementById("confirm");
  confirm.classList.toggle("hidden", !state.confirm);
  const [confirmTitle, confirmText] = confirmInfo();
  document.getElementById("confirmTitle").textContent = confirmTitle;
  document.getElementById("confirmText").textContent = confirmText;
  renderWizard();
  renderLock();
  document.querySelectorAll(".menu-item").forEach((btn) => {
    const current = (btn.id === "goLive" && state.screen === "live")
      || (btn.id === "goPlayback" && state.screen === "playback")
      || (btn.id === "goPictures" && state.screen === "pictures")
      || (btn.id === "goSettings" && state.screen === "settings");
    btn.classList.toggle("on", current);
  });
  renderContext();
  renderViewer();
}

function menuItems() {
  const ch = channels[state.selected];
  const live = ch.online && ch.preview;
  return [
    { id: "zoom", label: state.zoomed ? "返回分割" : "單畫面" },
    { id: "preview", label: ch.preview ? "關閉預覽" : "開啟預覽", disabled: !ch.online },
    { id: "main", label: "主碼流", disabled: !live },
    { id: "sub", label: "子碼流", disabled: !live || !state.zoomed },
    { id: "replay", label: "即時回放" },
    { id: "shot", label: "抓圖", disabled: !live },
  ];
}

function renderContext() {
  let menu = document.getElementById("context");
  if (!state.context) {
    menu?.remove();
    return;
  }
  if (!menu) {
    menu = document.createElement("div");
    menu.id = "context";
    menu.className = "context";
    document.body.appendChild(menu);
  }
  menu.replaceChildren();
  for (const item of menuItems()) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = item.label;
    btn.disabled = Boolean(item.disabled);
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      runMenu(item.id);
    });
    menu.appendChild(btn);
  }
  const width = menu.offsetWidth || 148;
  const height = menu.offsetHeight || 210;
  const x = Math.max(4, Math.min(state.context.x, window.innerWidth - width - 4));
  const y = Math.max(4, Math.min(state.context.y, window.innerHeight - height - 4));
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
}

function renderAll() {
  renderChrome();
  if (state.screen === "live") renderWall();
}

function setLayout(n) {
  const same = n === 1 ? state.zoomed : !state.zoomed && state.layout === n;
  if (same) return;
  if (n === 1) {
    state.zoomed = true;
    state.forceMain = true;
  } else {
    state.zoomed = false;
    state.forceMain = false;
    state.layout = n;
    state.page = Math.floor(state.selected / n);
  }
  if (!state.zoomed && pageCount() < 2) setTour(false);
  state.context = null;
  toast(`已切換${LAYOUT_NAME[n]}`);
  renderAll();
}

function step(dir, fromUser) {
  if (state.screen !== "live") return;
  if (state.menuOpen || state.confirm) return;
  if (pageCount() < 2) return;
  state.context = null;
  if (state.zoomed) {
    const total = channels.length;
    state.selected = (state.selected + dir + total) % total;
  } else {
    const total = pageCount();
    state.page = (state.page + dir + total) % total;
    state.selected = state.page * state.layout;
  }
  if (fromUser && state.tour) setTour(true);
  renderAll();
}

function toggleZoom() {
  state.zoomed = !state.zoomed;
  state.forceMain = state.zoomed;
  if (!state.zoomed) state.page = Math.floor(state.selected / state.layout);
  if (!state.zoomed && pageCount() < 2) setTour(false);
  state.context = null;
  renderAll();
}

function setTour(on) {
  state.tour = on;
  clearInterval(tourTimer);
  tourTimer = 0;
  if (!on) return;
  if (!state.zoomed && pageCount() < 2) {
    state.tour = false;
    return;
  }
  tourTimer = setInterval(() => step(1, false), state.tourSeconds * 1000);
}

function paintSelection() {
  const ch = channels[state.selected];
  document.querySelectorAll(".tile[data-index]").forEach((tile) => {
    tile.classList.toggle("selected", Number(tile.dataset.index) === state.selected);
  });
  document.querySelectorAll(".speaker").forEach((node) => node.remove());
  if (!state.audio || !ch.online || !ch.preview) return;
  const tile = document.querySelector(`.tile[data-index="${state.selected}"]`);
  if (!tile) return;
  const speaker = document.createElement("div");
  speaker.className = "speaker";
  speaker.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h3l4-3v10l-4-3H4z"/><path d="M16 9a4 4 0 0 1 0 6"/></svg>`;
  tile.appendChild(speaker);
}

function selectIndex(index) {
  state.selected = index;
  state.context = null;
  paintSelection();
  renderChrome();
}

function focusChannel(index) {
  state.selected = index;
  if (!state.zoomed) state.page = Math.floor(index / state.layout);
  state.context = null;
  renderAll();
}

function runMenu(id) {
  const ch = channels[state.selected];
  state.context = null;
  if (id === "zoom") {
    toggleZoom();
    return;
  }
  if (id === "preview") ch.preview = !ch.preview;
  if (id === "main") {
    state.zoomed = true;
    state.forceMain = true;
  }
  if (id === "sub") state.forceMain = false;
  if (id === "replay") {
    openPlayback(state.selected);
    return;
  }
  if (id === "shot") {
    if (ch.online && ch.preview) addShot(ch);
    renderChrome();
    return;
  }
  renderAll();
}

function togglePtz(force) {
  const next = typeof force === "boolean" ? force : !state.ptzOpen;
  if (next && !channels[state.selected].online) {
    toast("通道離線，無法操作雲台");
    return;
  }
  state.ptzOpen = next;
  state.context = null;
  renderChrome();
}

function ptzAction(action) {
  const ch = channels[state.selected];
  if (!ch.online || !ch.preview) {
    toast("此通道目前沒有畫面");
    return;
  }
  toast(`${chLabel(ch)} 雲台：${action}`);
}

function jumpAlarm() {
  const list = channels.filter((ch) => ch.alarm);
  if (!list.length) {
    toast("目前沒有警報");
    return;
  }
  const ch = list[alarmCursor % list.length];
  alarmCursor += 1;
  state.screen = "live";
  focusChannel(ch.index);
  toast(`警報 ${chLabel(ch)}`);
}

function tick() {
  const full = nowText();
  document.getElementById("clock").textContent = full;
  document.querySelectorAll("[data-clock]").forEach((node) => {
    node.value = full;
  });
  const hm = full.slice(11);
  document.querySelectorAll(".osd-time").forEach((node) => {
    node.textContent = hm;
  });
  paintHardware();
}

function paintHardware() {
  const stats = hardwareStats();
  const cpu = document.getElementById("hwCpu");
  if (!cpu) return;
  cpu.value = stats.cpu;
  const mem = document.getElementById("hwMem");
  if (mem) mem.value = stats.mem;
  const temp = document.getElementById("hwTemp");
  if (temp) temp.value = stats.temp;
  const up = document.getElementById("hwUp");
  if (up) up.value = stats.uptime;
}

function buildSplits() {
  const host = document.getElementById("splits");
  for (const [cols, rows, layout] of SPLITS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tool icon-only";
    btn.dataset.layout = String(layout);
    btn.title = LAYOUT_NAME[layout];
    btn.setAttribute("aria-label", LAYOUT_NAME[layout]);
    btn.appendChild(splitIcon(cols, rows));
    btn.addEventListener("click", () => setLayout(layout));
    host.appendChild(btn);
  }
}

function buildPresets() {
  const host = document.getElementById("presets");
  for (let i = 1; i <= 8; i += 1) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pad";
    btn.dataset.ptz = `預置點 ${i}`;
    btn.textContent = String(i);
    host.appendChild(btn);
  }
}

function formatMinute(min) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

function hasRecord(ch) {
  return Boolean(ch && ch.online && ch.recording);
}

function recordSegments(ch) {
  if (!hasRecord(ch)) return [];
  const blocks = ch.id % 2 === 0
    ? [{ start: 0, end: 1440, kind: "normal" }]
    : [
      { start: 0, end: 8 * 60, kind: "normal" },
      { start: 18 * 60, end: 1440, kind: "normal" },
    ];
  if (ch.alarm) blocks.push({ start: 9 * 60 + 20, end: 10 * 60 + 40, kind: "alarm" });
  return blocks;
}

function paintScene(el, source) {
  const id = source.channelId || source.id;
  const hue = source.ir ? 95 : 205 + (id * 11) % 40;
  el.style.setProperty("--sky", `hsl(${hue} 22% ${source.ir ? 14 : 18}%)`);
  el.style.setProperty("--ground", `hsl(${hue} 14% 8%)`);
  el.classList.toggle("ir", Boolean(source.ir));
}

function paintPlayhead() {
  const head = document.getElementById("playHead");
  const clock = document.getElementById("playClock");
  const bar = document.getElementById("playClockBar");
  const toggle = document.getElementById("playToggle");
  const text = formatMinute(state.play.minute);
  if (head) head.style.left = `${(state.play.minute / 1440) * 100}%`;
  if (clock) clock.textContent = text;
  if (bar) bar.textContent = text;
  if (toggle) toggle.textContent = state.play.playing ? "暫停" : "播放";
}

function seekMinute(delta) {
  state.play.minute = Math.min(1439, Math.max(0, state.play.minute + delta));
  paintPlayhead();
}

function seekFromEvent(event) {
  const track = document.getElementById("playTrack");
  if (!track) return;
  const rect = track.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  state.play.minute = Math.round(ratio * 1439);
  paintPlayhead();
}

function addShot(ch) {
  state.shots.unshift({
    id: `${Date.now()}-${ch.id}`,
    index: ch.index,
    channelId: ch.id,
    name: chLabel(ch),
    time: nowText(),
    ir: ch.ir,
  });
  if (state.shots.length > 36) state.shots.length = 36;
  toast(`${chLabel(ch)} 已存入圖片`);
  if (state.screen === "pictures") renderPage();
}

function removeShot(id) {
  state.shots = state.shots.filter((shot) => shot.id !== id);
  if (state.shotView === id) state.shotView = null;
  renderViewer();
  if (state.screen === "pictures") renderPage();
}

function renderViewer() {
  const view = document.getElementById("viewer");
  const shot = state.shots.find((item) => item.id === state.shotView);
  view.classList.toggle("hidden", !shot);
  if (!shot) return;
  const frame = document.getElementById("viewerFrame");
  paintScene(frame, shot);
  document.getElementById("viewerMeta").textContent = `${shot.name}    ${shot.time}`;
}

function openScreen(screen) {
  state.screen = screen;
  state.menuOpen = false;
  state.context = null;
  state.shotView = null;
  if (screen !== "playback") state.play.playing = false;
  if (screen !== "live" && state.tour) setTour(false);
  renderChrome();
  if (screen === "live") renderWall();
  else renderPage();
}

function openPlayback(index) {
  state.play.index = index;
  const parts = nowText().slice(11, 16).split(":");
  state.play.minute = Number(parts[0]) * 60 + Number(parts[1]);
  state.play.playing = false;
  openScreen("playback");
}

function renderPage() {
  const page = document.getElementById("page");
  page.replaceChildren();
  if (state.screen === "playback") page.appendChild(renderPlayback());
  else if (state.screen === "pictures") page.appendChild(renderPictures());
  else if (state.screen === "settings") page.appendChild(renderSettings());
}

function renderPlayback() {
  const ch = channels[state.play.index];
  const root = document.createElement("div");
  root.className = "play";

  const list = document.createElement("div");
  list.className = "ch-list";
  const heading = document.createElement("div");
  heading.className = "pane-title";
  heading.textContent = "通道";
  list.appendChild(heading);
  channels.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ch-item";
    if (item.index === state.play.index) btn.classList.add("active");
    if (!item.online) btn.classList.add("off");
    btn.dataset.playCh = String(item.index);
    const dot = document.createElement("i");
    dot.className = hasRecord(item) ? "rec-dot" : "rec-dot idle";
    const label = document.createElement("span");
    label.textContent = chLabel(item);
    btn.append(dot, label);
    list.appendChild(btn);
  });

  const main = document.createElement("div");
  main.className = "play-main";
  const wrap = document.createElement("div");
  wrap.className = "player-wrap";
  const player = document.createElement("div");
  player.className = "player";
  if (!hasRecord(ch)) {
    const empty = document.createElement("div");
    empty.className = "player-empty";
    empty.textContent = ch.online ? "此通道沒有錄影" : "通道離線";
    player.appendChild(empty);
  } else {
    paintScene(player, ch);
    const name = document.createElement("div");
    name.className = "osd-name";
    name.textContent = chLabel(ch);
    const clock = document.createElement("div");
    clock.className = "osd-time";
    clock.id = "playClock";
    clock.textContent = formatMinute(state.play.minute);
    player.append(name, clock);
  }
  wrap.appendChild(player);

  const timeline = document.createElement("div");
  timeline.className = "timeline";
  const tools = document.createElement("div");
  tools.className = "time-tools";
  const date = document.createElement("span");
  date.textContent = nowText().slice(0, 10);
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "tool";
  toggle.id = "playToggle";
  toggle.textContent = state.play.playing ? "暫停" : "播放";
  toggle.disabled = !hasRecord(ch);
  const barClock = document.createElement("span");
  barClock.id = "playClockBar";
  barClock.textContent = formatMinute(state.play.minute);
  tools.append(date, toggle, barClock);

  const track = document.createElement("div");
  track.className = "track";
  track.id = "playTrack";
  recordSegments(ch).forEach((seg) => {
    const node = document.createElement("i");
    node.className = seg.kind === "alarm" ? "seg alarm" : "seg";
    node.style.left = `${(seg.start / 1440) * 100}%`;
    node.style.width = `${((seg.end - seg.start) / 1440) * 100}%`;
    track.appendChild(node);
  });
  const head = document.createElement("i");
  head.className = "head";
  head.id = "playHead";
  head.style.left = `${(state.play.minute / 1440) * 100}%`;
  track.appendChild(head);

  const scale = document.createElement("div");
  scale.className = "scale";
  ["00", "06", "12", "18", "24"].forEach((text) => {
    const mark = document.createElement("span");
    mark.textContent = text;
    scale.appendChild(mark);
  });
  timeline.append(tools, track, scale);
  main.append(wrap, timeline);
  root.append(list, main);
  return root;
}

function renderPictures() {
  const root = document.createElement("div");
  root.className = "pics";
  if (!state.shots.length) {
    const empty = document.createElement("div");
    empty.className = "empty-page";
    empty.textContent = "尚無圖片。回到預覽，選取通道後按抓圖。";
    root.appendChild(empty);
    return root;
  }
  state.shots.forEach((shot) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "pic";
    card.dataset.shot = shot.id;
    const thumb = document.createElement("div");
    thumb.className = "thumb";
    paintScene(thumb, shot);
    const meta = document.createElement("div");
    meta.className = "pic-meta";
    const text = document.createElement("div");
    const name = document.createElement("b");
    name.textContent = shot.name;
    const time = document.createElement("span");
    time.textContent = shot.time;
    text.append(name, time);
    const del = document.createElement("span");
    del.className = "pic-del";
    del.dataset.shotDel = shot.id;
    del.textContent = "刪除";
    meta.append(text, del);
    card.append(thumb, meta);
    root.appendChild(card);
  });
  return root;
}

function renderSettings() {
  const root = document.createElement("div");
  root.className = "settings";
  const nav = document.createElement("div");
  nav.className = "side-nav";
  SETTINGS_GROUPS.forEach(([group, items]) => {
    const label = document.createElement("div");
    label.className = "nav-label";
    label.textContent = group;
    nav.appendChild(label);
    items.forEach(([id, name]) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.tab = id;
      btn.textContent = name;
      if (id === state.settingsTab) btn.classList.add("active");
      nav.appendChild(btn);
    });
  });
  const body = document.createElement("div");
  body.className = "settings-body";
  body.appendChild(renderSettingsBody());
  root.append(nav, body);
  return root;
}

function renderSettingsBody() {
  if (state.settingsTab === "info") return renderInfoSettings();
  if (state.settingsTab === "time") return renderTimeSettings();
  if (state.settingsTab === "user") return renderUserSettings();
  if (state.settingsTab === "log") return renderLogSettings();
  if (state.settingsTab === "maintain") return renderMaintainSettings();
  if (state.settingsTab === "firmware") return renderFirmwareSettings();
  if (state.settingsTab === "lan") return renderLanSettings();
  if (state.settingsTab === "remote") return renderRemoteSettings();
  if (state.settingsTab === "mail") return renderMailSettings();
  if (state.settingsTab === "channel") return renderChannelSettings();
  if (state.settingsTab === "encode") return renderEncodeSettings();
  if (state.settingsTab === "audio") return renderAudioSettings();
  if (state.settingsTab === "record") return renderRecordSettings();
  if (state.settingsTab === "disk") return renderDiskSettings();
  if (state.settingsTab === "alarm") return renderAlarmSettings();
  if (state.settingsTab === "exception") return renderExceptionSettings();
  if (state.settingsTab === "display") return renderDisplaySettings();
  return renderBasicSettings();
}

function paneNote(text) {
  const note = document.createElement("p");
  note.className = "note";
  note.textContent = text;
  return note;
}

function selectField(field, pairs, current, wide) {
  const select = document.createElement("select");
  select.dataset.field = field;
  if (wide) select.className = "wide";
  pairs.forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = label;
    if (String(value) === String(current)) option.selected = true;
    select.appendChild(option);
  });
  return select;
}

function checkField(field, checked) {
  const input = document.createElement("input");
  input.type = "checkbox";
  input.dataset.field = field;
  input.checked = checked;
  return input;
}

function actionButton(label, action, kind) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = kind || "primary";
  btn.dataset.action = action;
  btn.textContent = label;
  return btn;
}

function filePick(field, accept, label) {
  const wrap = document.createElement("div");
  wrap.className = "file-pick";
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.dataset.field = field;
  input.hidden = true;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "ghost";
  btn.textContent = label;
  btn.addEventListener("click", () => input.click());
  wrap.append(input, btn);
  return wrap;
}

function renderBasicSettings() {
  const wrap = document.createElement("div");
  wrap.append(
    paneNote("裝置名稱會顯示在左上角。介面使用繁體中文。"),
    settingRow("裝置名稱", textInput("device", state.deviceName, true)),
    settingRow("裝置編號", textInput("deviceNo", state.system.deviceNo, true)),
    settingRow("語言", readOnlyInput("繁體中文")),
    settingRow("輸出解析度", selectField("resolution", [
      ["1920×1080", "1920×1080"],
      ["1280×720", "1280×720"],
      ["3840×2160", "3840×2160"],
    ], state.system.resolution, true)),
    settingRow("螢幕待機", selectField("standby", [
      [0, "關閉"],
      [5, "5 分鐘"],
      [10, "10 分鐘"],
      [30, "30 分鐘"],
    ], state.system.standby, true)),
  );
  return wrap;
}

function renderInfoSettings() {
  const wrap = document.createElement("div");
  const stats = hardwareStats();
  const mem = readOnlyInput(stats.mem);
  mem.id = "hwMem";
  const cpu = readOnlyInput(stats.cpu);
  cpu.id = "hwCpu";
  const temp = readOnlyInput(stats.temp);
  temp.id = "hwTemp";
  const up = readOnlyInput(stats.uptime);
  up.id = "hwUp";
  const record = DISKS.filter((disk) => disk.role === "record");
  wrap.append(
    paneNote("這是這台主機目前的系統與硬體狀態。開源專案名稱是 mariiy_nvr_os。"),
    paneTitle("軟體"),
    settingRow("產品名稱", readOnlyInput(HARDWARE.model)),
    settingRow("系統名稱", readOnlyInput(OS_NAME)),
    settingRow("版本", readOnlyInput(VERSION)),
    settingRow("授權", readOnlyInput(LICENSE)),
    settingRow("GitHub", linkValue(GITHUB, "github.com/mariiy5983/mariiy_nvr_os")),
    settingRow("韌體來源", linkValue(`${GITHUB}/releases`, "GitHub Releases")),
    paneTitle("硬體"),
    settingRow("平台", readOnlyInput(HARDWARE.board)),
    settingRow("處理器", readOnlyInput(HARDWARE.cpu)),
    settingRow("處理器使用率", cpu),
    settingRow("已安裝記憶體", readOnlyInput(HARDWARE.memory)),
    settingRow("記憶體使用", mem),
    settingRow("顯示晶片", readOnlyInput(HARDWARE.gpu)),
    settingRow("主機溫度", temp),
    settingRow("序號", readOnlyInput(HARDWARE.serial)),
    settingRow("通道數", readOnlyInput("32")),
    settingRow("系統碟", readOnlyInput(DISKS[0].size)),
    settingRow("錄影碟", readOnlyInput(`${record.length} 顆 · ${record.map((d) => d.size).join(" + ")}`)),
    paneTitle("運行"),
    settingRow("已運行", up),
    settingRow("MAC", readOnlyInput(state.network.mac)),
    settingRow("內網位址", readOnlyInput(state.network.ip)),
    settingRow("遠端網域", readOnlyInput(state.remote.linked && state.remote.host ? state.remote.host : "尚未設定")),
  );
  return wrap;
}

function renderTimeSettings() {
  const wrap = document.createElement("div");
  const clock = readOnlyInput(nowText());
  clock.dataset.clock = "1";
  const server = textInput("ntpServer", state.time.server, true);
  server.disabled = !state.time.ntp;
  wrap.append(
    paneNote("預設伺服器是 time.google.com。狀態會顯示目前這組伺服器是否同步成功。"),
    settingRow("時區", selectField("zone", ZONES, state.time.zone, true)),
    settingRow("自動對時", checkField("ntp", state.time.ntp)),
    settingRow("伺服器", server),
    settingRow("對時間隔", selectField("ntpInterval", [
      [10, "10 分鐘"],
      [60, "60 分鐘"],
      [720, "12 小時"],
      [1440, "24 小時"],
    ], state.time.interval, true)),
    settingRow("日光節約", checkField("dst", state.time.dst)),
    settingRow("狀態", readOnlyInput(timeStatus())),
    settingRow("上次對時", readOnlyInput(state.time.syncedAt || "—")),
    settingRow("目前時間", clock),
  );
  const actions = document.createElement("div");
  actions.className = "form-actions";
  actions.appendChild(actionButton("改回 time.google.com", "google-time"));
  wrap.appendChild(actions);
  return wrap;
}

function renderUserSettings() {
  const wrap = document.createElement("div");
  const current = textInput("userOld", "", true);
  current.type = "password";
  const next = textInput("userNew", "", true);
  next.type = "password";
  const again = textInput("userNew2", "", true);
  again.type = "password";
  const actions = document.createElement("div");
  actions.className = "form-actions";
  actions.appendChild(actionButton("儲存密碼", "password"));
  wrap.append(
    paneNote("閒置超過設定時間後要重新輸入帳號和密碼。遠端也使用這個帳號。恢復原廠設定後要重新設定密碼。"),
    settingRow("帳號", readOnlyInput(state.user.name)),
    settingRow("權限", readOnlyInput("管理員")),
    settingRow("閒置鎖定", selectField("idleMinutes", [
      [5, "5 分鐘"],
      [10, "10 分鐘"],
      [30, "30 分鐘"],
    ], state.user.idleMinutes, true)),
    settingRow("目前密碼", current),
    settingRow("新密碼", next),
    settingRow("確認密碼", again),
    actions,
  );
  return wrap;
}

function renderLogSettings() {
  const wrap = document.createElement("div");
  const choice = document.createElement("div");
  choice.className = "choice";
  [["all", "全部"], ["資訊", "資訊"], ["警告", "警告"], ["錯誤", "錯誤"]].forEach(([id, label]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.logFilter = id;
    btn.textContent = label;
    if (state.logFilter === id) btn.classList.add("active");
    choice.appendChild(btn);
  });
  const table = document.createElement("table");
  table.className = "grid-table";
  const head = document.createElement("tr");
  ["時間", "等級", "內容"].forEach((label) => {
    const th = document.createElement("th");
    th.textContent = label;
    head.appendChild(th);
  });
  const thead = document.createElement("thead");
  thead.appendChild(head);
  const tbody = document.createElement("tbody");
  systemLogs().filter((item) => state.logFilter === "all" || item.level === state.logFilter).forEach((item) => {
    const row = document.createElement("tr");
    [item.time, item.level, item.text].forEach((text, index) => {
      const td = document.createElement("td");
      td.textContent = text;
      if (index === 2) td.className = "wrap";
      if (index === 1 && item.level === "警告") td.className = "warn";
      if (index === 1 && item.level === "錯誤") td.className = "err";
      row.appendChild(td);
    });
    tbody.appendChild(row);
  });
  table.append(thead, tbody);
  wrap.append(
    paneNote("日誌留在本機。恢復原廠設定後會清空。"),
    choice,
    table,
  );
  return wrap;
}

function systemLogs() {
  const now = Date.now();
  const stamp = (mins) => {
    const date = new Date(now - mins * 60 * 1000);
    return date.toLocaleString("sv-SE", {
      timeZone: state.time.zone || "Asia/Taipei",
      hour12: false,
    }).replace("T", " ").slice(0, 19);
  };
  const list = [
    { time: stamp(18), level: "資訊", text: `${OS_NAME} ${VERSION} 啟動` },
    { time: stamp(17), level: "資訊", text: `${HARDWARE.cpu} · 記憶體 ${HARDWARE.memory}` },
    { time: stamp(16), level: "資訊", text: `時間已與 ${state.time.server || GOOGLE_NTP} 同步成功` },
    { time: stamp(12), level: "資訊", text: "管理員登入本機" },
  ];
  channels.filter((ch) => !ch.online).forEach((ch, index) => {
    list.push({ time: stamp(9 - index), level: "警告", text: `${chLabel(ch)} 無訊號` });
  });
  channels.filter((ch) => ch.alarm).forEach((ch, index) => {
    list.push({ time: stamp(4 - index), level: "警告", text: `${chLabel(ch)} 警報` });
  });
  if (state.remote.linked && state.remote.host) {
    list.push({ time: stamp(2), level: "資訊", text: `遠端已由手機設定 ${state.remote.host}` });
  } else {
    list.push({ time: stamp(2), level: "資訊", text: "遠端尚未用手機設定" });
  }
  list.sort((a, b) => (a.time < b.time ? 1 : -1));
  return list;
}

function renderMaintainSettings() {
  const wrap = document.createElement("div");
  const importInput = filePick("importFile", ".json,application/json", "選擇設定檔");
  const actions = document.createElement("div");
  actions.className = "form-actions";
  actions.append(
    actionButton("匯出設定", "export-config", "ghost"),
    actionButton("重新啟動", "reboot", "ghost"),
    actionButton("恢復原廠設定", "factory", "ghost danger"),
  );
  wrap.append(
    paneNote("恢復原廠會清掉目前設定，並再次進入開機設定。時間回到 time.google.com。設定檔不含密碼。"),
    settingRow("系統", readOnlyInput(OS_NAME)),
    settingRow("版本", readOnlyInput(VERSION)),
    settingRow("開機設定", readOnlyInput(state.setup ? "已完成" : "未完成")),
    settingRow("自動重啟", checkField("autoReboot", state.system.autoReboot)),
    settingRow("重啟時刻", selectField("rebootHour", [
      [2, "02:00"],
      [3, "03:00"],
      [4, "04:00"],
    ], state.system.rebootHour, true)),
    settingRow("匯入設定", importInput),
    actions,
  );
  return wrap;
}

function renderFirmwareSettings() {
  const wrap = document.createElement("div");
  const file = filePick("firmwareFile", ".img,.bin,.fw", "選擇韌體檔");
  const actions = document.createElement("div");
  actions.className = "form-actions";
  actions.append(
    actionButton("檢查 GitHub", "fw-check", "ghost"),
    actionButton("開始更新", "fw-start"),
  );
  wrap.append(
    paneNote("韌體從 GitHub 的 mariiy_nvr_os 發行檔更新。寫入系統碟，錄影碟不會動。也可選本機檔。"),
    settingRow("系統名稱", readOnlyInput(OS_NAME)),
    settingRow("目前版本", readOnlyInput(VERSION)),
    settingRow("發行頁", linkValue(`${GITHUB}/releases`, "github.com/mariiy5983/mariiy_nvr_os/releases")),
    settingRow("自動檢查", checkField("checkUpdate", state.system.checkUpdate)),
    settingRow("檢查結果", readOnlyInput(state.firmwareStatus)),
    settingRow("本機檔案", file),
    settingRow("已選檔案", readOnlyInput(state.firmwareName || "尚未選擇")),
    actions,
  );
  return wrap;
}

function renderLanSettings() {
  const net = state.network;
  const wrap = document.createElement("div");
  const ip = textInput("ip", net.ip, true);
  const mask = textInput("mask", net.mask, true);
  const gateway = textInput("gateway", net.gateway, true);
  const dns1 = textInput("dns1", net.dns1, true);
  const dns2 = textInput("dns2", net.dns2, true);
  [ip, mask, gateway, dns1, dns2].forEach((input) => {
    input.disabled = net.dhcp;
  });
  wrap.append(
    paneNote("這是主機在內網的位址。對外觀看請到遠端頁，用手機掃描 QR 完成 Cloudflare 設定。"),
    settingRow("自動取得", checkField("dhcp", net.dhcp)),
    settingRow("IP", ip),
    settingRow("子網路遮罩", mask),
    settingRow("閘道", gateway),
    settingRow("DNS", dns1),
    settingRow("DNS 2", dns2),
    settingRow("MAC", readOnlyInput(net.mac)),
    settingRow("網頁埠", readOnlyInput("80")),
    settingRow("ONVIF", readOnlyInput("80")),
    settingRow("RTSP", readOnlyInput("554")),
  );
  return wrap;
}

function renderChannelSettings() {
  const wrap = document.createElement("div");
  wrap.append(
    paneNote("通道以 ONVIF 管理。名稱和預覽開關會立刻反映在預覽畫面。"),
    channelTable([
      ["名稱", "name"],
      ["協定", "proto"],
      ["位址", "address"],
      ["狀態", "status"],
      ["預覽", "preview"],
    ]),
  );
  return wrap;
}

function renderEncodeSettings() {
  const enc = state.encode;
  const wrap = document.createElement("div");
  wrap.append(
    paneNote("分割畫面使用子碼流，單畫面使用主碼流。以下套用到全部線上通道。硬體解碼使用 VAAPI。"),
    settingRow("編碼", selectField("codec", [
      ["H.265", "H.265"],
      ["H.264", "H.264"],
    ], enc.codec, true)),
    settingRow("主碼流", selectField("mainRes", [
      ["2560×1440", "2560×1440"],
      ["1920×1080", "1920×1080"],
      ["1280×720", "1280×720"],
    ], enc.mainRes, true)),
    settingRow("主碼流幀率", selectField("mainFps", [
      [25, "25 fps"],
      [20, "20 fps"],
      [15, "15 fps"],
    ], enc.mainFps, true)),
    settingRow("主碼流碼率", readOnlyInput(encodeRate(enc.mainRes))),
    settingRow("子碼流", selectField("subRes", [
      ["704×576", "704×576"],
      ["640×360", "640×360"],
    ], enc.subRes, true)),
    settingRow("子碼流幀率", selectField("subFps", [
      [15, "15 fps"],
      [10, "10 fps"],
    ], enc.subFps, true)),
    settingRow("子碼流碼率", readOnlyInput(encodeRate(enc.subRes))),
  );
  return wrap;
}

function renderAudioSettings() {
  const sound = state.sound;
  const wrap = document.createElement("div");
  wrap.append(
    paneNote("預覽的聲音按鈕會跟著這裡。關閉輸出後，預覽無法開啟聲音。"),
    settingRow("音訊輸出", checkField("soundOut", sound.output)),
    settingRow("預設音量", selectField("soundVol", [
      [40, "40 %"],
      [70, "70 %"],
      [100, "100 %"],
    ], sound.volume, true)),
    settingRow("音訊編碼", selectField("soundCodec", [
      ["G.711u", "G.711u"],
      ["AAC", "AAC"],
    ], sound.codec, true)),
  );
  return wrap;
}

function renderRecordSettings() {
  const plan = state.recordPlan;
  const wrap = document.createElement("div");
  const choice = document.createElement("div");
  choice.className = "choice";
  [
    ["always", "全天"],
    ["schedule", "定時 08:00–18:00"],
    ["alarm", "警報"],
  ].forEach(([id, label]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.recordMode = id;
    btn.textContent = label;
    if (plan.mode === id) btn.classList.add("active");
    choice.appendChild(btn);
  });
  const modeNote = plan.mode === "schedule"
    ? "定時錄影為每天 08:00–18:00。各通道仍要打開錄影。"
    : plan.mode === "alarm"
      ? "只在警報發生時錄影。各通道仍要打開錄影。"
      : "全天連續錄影。有打開錄影的通道會顯示常亮紅點。";
  wrap.append(
    paneNote(modeNote),
    choice,
    settingRow("預錄", selectField("preRecord", [[0, "0 秒"], [5, "5 秒"], [10, "10 秒"]], plan.pre, true)),
    settingRow("延錄", selectField("postRecord", [[5, "5 秒"], [10, "10 秒"], [30, "30 秒"]], plan.post, true)),
    settingRow("磁碟滿覆寫", checkField("overwrite", plan.overwrite)),
    channelTable([
      ["狀態", "status"],
      ["錄影", "record"],
    ]),
  );
  return wrap;
}

function renderDiskSettings() {
  const wrap = document.createElement("div");
  const record = DISKS.filter((disk) => disk.role === "record");
  const table = document.createElement("table");
  table.className = "grid-table";
  const head = document.createElement("tr");
  ["槽位", "裝置", "用途", "容量", "已用", "狀態", "錄影"].forEach((label) => {
    const th = document.createElement("th");
    th.textContent = label;
    head.appendChild(th);
  });
  const thead = document.createElement("thead");
  thead.appendChild(head);
  const tbody = document.createElement("tbody");
  DISKS.forEach((disk) => {
    const system = disk.role === "system";
    const row = document.createElement("tr");
    if (system) row.className = "excluded";
    [disk.slot, disk.dev, system ? "系統碟" : "錄影碟", disk.size, disk.used, disk.status, system ? "排除" : "使用中"]
      .forEach((text) => {
        const td = document.createElement("td");
        td.textContent = text;
        row.appendChild(td);
      });
    tbody.appendChild(row);
  });
  table.append(thead, tbody);
  wrap.append(
    paneNote(`錄影寫入 ${record.length} 顆錄影碟。系統碟只放系統，不格式化、不覆寫，也不計入錄影容量。`),
    table,
    settingRow("錄影碟滿覆寫", checkField("overwrite", state.recordPlan.overwrite)),
  );
  return wrap;
}

function renderAlarmSettings() {
  const link = state.alarmLink;
  const wrap = document.createElement("div");
  wrap.append(
    paneNote("打開警報的通道會在預覽顯示驚嘆號。連動郵件要先在郵件頁填好伺服器。"),
    settingRow("連動錄影", checkField("alarmRecord", link.record)),
    settingRow("連動抓圖", checkField("alarmShot", link.shot)),
    settingRow("蜂鳴", checkField("alarmBeep", link.beep)),
    settingRow("連動郵件", checkField("alarmMail", link.mail)),
    channelTable([
      ["狀態", "status"],
      ["警報", "alarm"],
    ]),
  );
  return wrap;
}

function renderDisplaySettings() {
  const wrap = document.createElement("div");
  const layoutLabel = document.createElement("div");
  layoutLabel.className = "pane-title";
  layoutLabel.textContent = "開機分割";
  const choice = document.createElement("div");
  choice.className = "choice";
  [1, 4, 9, 16, 25, 32].forEach((n) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.layoutPick = String(n);
    btn.textContent = LAYOUT_NAME[n];
    const active = state.bootLayout === n;
    if (active) btn.classList.add("active");
    choice.appendChild(btn);
  });
  wrap.append(
    paneNote("開機分割只在下次啟動時使用。在這裡調整不會切換現在的預覽畫面。"),
    layoutLabel,
    choice,
    settingRow("輪巡間隔", selectField("tour", [[5, "5 秒"], [8, "8 秒"], [10, "10 秒"], [15, "15 秒"], [30, "30 秒"]], state.tourSeconds, true)),
    settingRow("通道名稱", checkField("osdName", state.osd.name)),
    settingRow("時間", checkField("osdTime", state.osd.time)),
    settingRow("隱藏游標", selectField("mouseHide", [
      [0, "關閉"],
      [10, "10 秒"],
      [30, "30 秒"],
    ], state.osd.mouseHide, true)),
  );
  return wrap;
}

function renderMailSettings() {
  const mail = state.mail;
  const wrap = document.createElement("div");
  const server = textInput("mailServer", mail.server, true);
  server.placeholder = "smtp.你的網域";
  server.disabled = !mail.enabled;
  const port = textInput("mailPort", mail.port, true);
  port.disabled = !mail.enabled;
  const account = textInput("mailAccount", mail.account, true);
  account.disabled = !mail.enabled;
  const from = textInput("mailFrom", mail.from, true);
  from.disabled = !mail.enabled;
  const to = textInput("mailTo", mail.to, true);
  to.disabled = !mail.enabled;
  const actions = document.createElement("div");
  actions.className = "form-actions";
  actions.appendChild(actionButton("測試郵件", "mail-test", "ghost"));
  wrap.append(
    paneNote("警報和例外可以把通知寄出去。預覽模式不會真的寄信。"),
    settingRow("啟用郵件", checkField("mailEnabled", mail.enabled)),
    settingRow("SMTP", server),
    settingRow("連接埠", port),
    settingRow("SSL", checkField("mailSsl", mail.ssl)),
    settingRow("帳號", account),
    settingRow("寄件者", from),
    settingRow("收件者", to),
    actions,
  );
  return wrap;
}

function renderExceptionSettings() {
  const ex = state.exception;
  const wrap = document.createElement("div");
  wrap.append(
    paneNote("主機自己的異常。警報通道請到警報頁。"),
    settingRow("磁碟將滿", checkField("exDiskFull", ex.diskFull)),
    settingRow("磁碟異常", checkField("exDiskError", ex.diskError)),
    settingRow("網路中斷", checkField("exNetDown", ex.netDown)),
    settingRow("IP 衝突", checkField("exIpConflict", ex.ipConflict)),
    settingRow("通道離線", checkField("exChannelOff", ex.channelOff)),
    settingRow("蜂鳴", checkField("exBeep", ex.beep)),
    settingRow("寄送郵件", checkField("exMail", ex.mail)),
  );
  return wrap;
}

function channelTable(columns) {
  const table = document.createElement("table");
  table.className = "grid-table";
  const head = document.createElement("tr");
  const first = document.createElement("th");
  first.textContent = "通道";
  head.appendChild(first);
  columns.forEach(([label]) => {
    const th = document.createElement("th");
    th.textContent = label;
    head.appendChild(th);
  });
  const thead = document.createElement("thead");
  thead.appendChild(head);
  const tbody = document.createElement("tbody");
  channels.forEach((ch) => {
    const row = document.createElement("tr");
    const nameCell = document.createElement("td");
    nameCell.textContent = chLabel(ch);
    row.appendChild(nameCell);
    columns.forEach(([, key]) => row.appendChild(channelCell(ch, key)));
    tbody.appendChild(row);
  });
  table.append(thead, tbody);
  return table;
}

function channelCell(ch, key) {
  const td = document.createElement("td");
  if (key === "status") {
    td.textContent = ch.online ? "線上" : "離線";
    return td;
  }
  if (key === "proto") {
    td.textContent = "ONVIF";
    return td;
  }
  if (key === "address") {
    td.textContent = channelAddress(ch);
    return td;
  }
  if (key === "name") {
    const input = document.createElement("input");
    input.type = "text";
    input.value = ch.name;
    input.maxLength = 16;
    input.dataset.field = "name";
    input.dataset.index = String(ch.index);
    td.appendChild(input);
    return td;
  }
  const input = document.createElement("input");
  input.type = "checkbox";
  input.dataset.field = key;
  input.dataset.index = String(ch.index);
  input.checked = key === "record" ? ch.recording : key === "alarm" ? ch.alarm : ch.preview;
  input.disabled = key === "record" && !ch.online;
  td.appendChild(input);
  return td;
}

function settingRow(label, control) {
  const row = document.createElement("label");
  row.className = "field";
  const span = document.createElement("span");
  span.textContent = label;
  row.append(span, control);
  return row;
}

function textInput(field, value, wide) {
  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  input.dataset.field = field;
  if (wide) input.className = "wide";
  return input;
}

function readOnlyInput(value) {
  const input = textInput("", value, true);
  input.readOnly = true;
  delete input.dataset.field;
  return input;
}

function remoteStatus() {
  if (!state.remote.enabled) return "未啟用";
  if (!state.remote.linked || !state.remote.host) return "請用手機掃描";
  return "已由手機設定，主機連出後即可開啟";
}

function remoteSetupUrl() {
  return new URL("remote.html", location.href).href;
}

function pullRemote() {
  try {
    const data = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (!data || !data.remote) return;
    const host = cleanHost(data.remote.host || "");
    const linked = Boolean(data.remote.linked && host);
    if (host === state.remote.host && linked === Boolean(state.remote.linked)) return;
    state.remote.host = host;
    state.remote.linked = linked;
    delete state.remote.token;
    renderChrome();
    if (state.screen === "settings" && state.settingsTab === "remote") renderPage();
  } catch (err) {
    /* 手機頁還沒寫入時維持現況 */
  }
}

function cleanHost(value) {
  return value.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "").slice(0, 64);
}

function renderRemoteSettings() {
  const remote = state.remote;
  const wrap = document.createElement("div");
  const note = document.createElement("p");
  note.className = "note";
  note.textContent = "從外面看這台主機，只走 Cloudflare Tunnel。用手機掃描 QR，在開啟的網頁登入 Cloudflare 並填網域。不用複製連線碼，路由器也不用開連接埠。";
  const detail = document.createElement("p");
  detail.className = "note";
  const enabled = document.createElement("input");
  enabled.type = "checkbox";
  enabled.dataset.field = "remoteEnabled";
  enabled.checked = remote.enabled;
  const viewers = document.createElement("select");
  viewers.dataset.field = "remoteViewers";
  [1, 2, 4].forEach((count) => {
    const option = document.createElement("option");
    option.value = String(count);
    option.textContent = `${count} 人`;
    if (count === remote.viewers) option.selected = true;
    viewers.appendChild(option);
  });
  viewers.disabled = !remote.enabled;
  const ready = remote.enabled && remote.linked && remote.host;
  if (!remote.enabled) detail.textContent = "遠端已關閉。本機預覽不受影響。";
  else if (ready) {
    detail.textContent = `外面開啟 https://${remote.host} ，用管理員帳號登入。同時最多 ${remote.viewers} 人，只看子碼流。`;
  } else detail.textContent = "手機掃 QR 後，在網頁完成 Cloudflare 設定，結果會回到這台主機。";
  wrap.append(
    note,
    detail,
    settingRow("允許遠端", enabled),
    settingRow("狀態", readOnlyInput(remoteStatus())),
    settingRow("網域名稱", readOnlyInput(ready ? remote.host : "尚未設定")),
    settingRow("同時觀看", viewers),
    settingRow("遠端畫面", readOnlyInput("子碼流")),
  );
  if (remote.enabled && !ready) wrap.append(remoteQrBlock());
  if (ready) {
    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "ghost";
    reset.dataset.action = "remote-reset";
    reset.textContent = "重新用手機設定";
    const actions = document.createElement("div");
    actions.className = "form-actions";
    actions.append(reset);
    wrap.append(actions);
  }
  return wrap;
}

function remoteQrBlock() {
  const block = document.createElement("div");
  block.className = "qr-block";
  const frame = document.createElement("div");
  frame.className = "qr-frame";
  const url = remoteSetupUrl();
  if (typeof qrcode === "function") {
    const qr = qrcode(0, "M");
    qr.addData(url);
    qr.make();
    const xml = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true, alt: "遠端設定 QR" });
    const svg = new DOMParser().parseFromString(xml, "image/svg+xml").documentElement;
    frame.appendChild(document.importNode(svg, true));
  }
  const copy = document.createElement("div");
  const title = document.createElement("p");
  title.textContent = "用手機掃描，開啟設定網頁。";
  const steps = document.createElement("ol");
  steps.className = "steps";
  ["在網頁按前往 Cloudflare 授權。", "填你已經放在 Cloudflare 的網域。", "送回主機後即可關閉手機頁面。"].forEach((text) => {
    const item = document.createElement("li");
    item.textContent = text;
    steps.appendChild(item);
  });
  const link = document.createElement("a");
  link.className = "qr-link";
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = url;
  copy.append(title, steps, link);
  block.append(frame, copy);
  return block;
}

function exportConfig() {
  const data = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  if (data.user) data.user = Object.assign({}, data.user, { password: "" });
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${OS_NAME}-config.json`;
  link.click();
  URL.revokeObjectURL(url);
  toast("已匯出設定");
}

function importConfig(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || typeof data !== "object") throw new Error("bad");
      data.setup = true;
      if (data.user) data.user.password = state.user.password;
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
      loadStore();
      toast("已匯入設定");
      renderAll();
    } catch (err) {
      toast("檔案不是有效的設定");
    }
  };
  reader.readAsText(file);
}

let firmwareTimer = 0;

function startFirmware() {
  state.confirm = null;
  renderChrome();
  const overlay = document.getElementById("firmware");
  const bar = document.getElementById("firmwareBar");
  const text = document.getElementById("firmwareText");
  overlay.classList.remove("hidden");
  bar.style.width = "0%";
  text.textContent = `正在寫入 ${OS_NAME}`;
  let pct = 0;
  window.clearTimeout(firmwareTimer);
  const step = () => {
    pct += 8;
    if (pct >= 100) {
      bar.style.width = "100%";
      text.textContent = "預覽模式不會寫入系統碟";
      firmwareTimer = window.setTimeout(() => {
        overlay.classList.add("hidden");
        bar.style.width = "0%";
        state.firmwareName = "";
        state.firmwareStatus = `目前 ${VERSION}`;
        toast(`韌體維持 ${VERSION}`);
        if (state.screen === "settings" && state.settingsTab === "firmware") renderPage();
      }, 900);
      return;
    }
    bar.style.width = `${pct}%`;
    text.textContent = `正在寫入 ${OS_NAME}  ${pct}%`;
    firmwareTimer = window.setTimeout(step, 120);
  };
  step();
}

function factoryReset() {
  channels.forEach((ch, index) => {
    ch.name = NAMES[index];
    ch.preview = true;
    ch.recording = ch.online && ch.id !== 18 && ch.id !== 28;
    ch.alarm = ALARM.has(ch.id);
  });
  state.deviceName = "Mariiy NVR";
  state.layout = 16;
  state.bootLayout = 16;
  state.page = 0;
  state.selected = 0;
  state.zoomed = false;
  state.forceMain = false;
  state.tour = false;
  state.tourSeconds = 8;
  state.audio = false;
  state.ptzOpen = false;
  state.menuOpen = false;
  state.confirm = null;
  state.context = null;
  state.screen = "live";
  state.settingsTab = "basic";
  state.shots = [];
  state.shotView = null;
  state.remote = defaultRemote();
  state.time = defaultTime();
  state.network = defaultNetwork();
  state.system = defaultSystem();
  state.user = defaultUser();
  state.recordPlan = defaultRecordPlan();
  state.encode = defaultEncode();
  state.alarmLink = defaultAlarmLink();
  state.osd = defaultOsd();
  state.mail = defaultMail();
  state.exception = defaultException();
  state.sound = defaultSound();
  state.firmwareName = "";
  state.firmwareStatus = `目前 ${VERSION}`;
  state.logFilter = "all";
  state.setup = false;
  state.locked = false;
  sessionStorage.removeItem(LOCK_KEY);
  sessionStorage.removeItem(IDLE_KEY);
  sessionStorage.removeItem(FAIL_KEY);
  sessionStorage.removeItem(FAIL_UNTIL_KEY);
  state.wizard = { step: 0, password: "", confirm: "", error: "" };
  localStorage.removeItem(STORE_KEY);
  setTour(false);
  toast("已恢復原廠設定，請重新完成開機設定");
  renderAll();
}

let lockBuilt = false;

function sameText(left, right) {
  const a = String(left);
  const b = String(right);
  let diff = a.length ^ b.length;
  const count = Math.max(a.length, b.length);
  for (let i = 0; i < count; i += 1) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function noteActivity() {
  if (!state.setup || state.locked) return;
  const now = Date.now();
  sessionStorage.setItem(IDLE_KEY, String(now));
}

function lockSession() {
  if (!state.setup || state.locked) return;
  state.locked = true;
  state.menuOpen = false;
  state.confirm = null;
  state.context = null;
  state.shotView = null;
  sessionStorage.setItem(LOCK_KEY, "1");
  if (state.tour) setTour(false);
  renderChrome();
}

function resumeSession() {
  if (!state.setup) return;
  if (sessionStorage.getItem(LOCK_KEY) === "1") {
    state.locked = true;
    return;
  }
  const last = Number(sessionStorage.getItem(IDLE_KEY) || 0);
  if (last && Date.now() - last >= idleMs()) {
    state.locked = true;
    sessionStorage.setItem(LOCK_KEY, "1");
    return;
  }
  noteActivity();
}

function checkIdle() {
  if (!state.setup || state.locked) return;
  const last = Number(sessionStorage.getItem(IDLE_KEY) || 0);
  if (last && Date.now() - last >= idleMs()) lockSession();
}

function renderLock() {
  const root = document.getElementById("lock");
  const show = state.setup && state.locked;
  root.classList.toggle("hidden", !show);
  if (!show) {
    root.replaceChildren();
    lockBuilt = false;
    return;
  }
  if (lockBuilt) return;
  lockBuilt = true;
  const card = document.createElement("form");
  card.className = "wizard-card";
  card.autocomplete = "off";
  const title = document.createElement("h2");
  title.textContent = "重新登入";
  const account = textInput("", "", true);
  account.name = "account";
  account.autocomplete = "username";
  account.required = true;
  const password = textInput("", "", true);
  password.type = "password";
  password.name = "password";
  password.autocomplete = "current-password";
  password.required = true;
  const error = document.createElement("p");
  error.className = "form-error";
  const actions = document.createElement("div");
  actions.className = "wizard-actions";
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "primary";
  submit.textContent = "登入";
  actions.appendChild(submit);
  card.append(
    title,
    paneNote("閒置超過 10 分鐘。請重新輸入帳號和密碼。"),
    settingRow("帳號", account),
    settingRow("密碼", password),
    error,
    actions,
  );
  card.addEventListener("submit", (event) => {
    event.preventDefault();
    submitLock(account.value.trim(), password.value, error, password);
  });
  root.replaceChildren(card);
  account.focus();
}

function submitLock(account, password, error, passwordInput) {
  const until = Number(sessionStorage.getItem(FAIL_UNTIL_KEY) || 0);
  if (Date.now() < until) {
    const sec = Math.ceil((until - Date.now()) / 1000);
    error.textContent = `登入失敗次數過多，請 ${sec} 秒後再試`;
    return;
  }
  const matched = sameText(account, state.user.name) && sameText(password, state.user.password);
  if (!matched) {
    passwordInput.value = "";
    const fails = Number(sessionStorage.getItem(FAIL_KEY) || 0) + 1;
    if (fails >= 5) {
      sessionStorage.setItem(FAIL_KEY, "0");
      sessionStorage.setItem(FAIL_UNTIL_KEY, String(Date.now() + 30000));
      error.textContent = "登入失敗次數過多，請 30 秒後再試";
      return;
    }
    sessionStorage.setItem(FAIL_KEY, String(fails));
    error.textContent = "帳號或密碼不正確";
    return;
  }
  sessionStorage.removeItem(FAIL_KEY);
  sessionStorage.removeItem(FAIL_UNTIL_KEY);
  state.locked = false;
  lockBuilt = false;
  sessionStorage.removeItem(LOCK_KEY);
  noteActivity();
  renderChrome();
}

function renderWizard() {
  const root = document.getElementById("wizard");
  root.classList.toggle("hidden", state.setup);
  if (state.setup) {
    root.replaceChildren();
    return;
  }
  const card = document.createElement("div");
  card.className = "wizard-card";
  const title = document.createElement("h2");
  title.textContent = "開機設定";
  const intro = paneNote("第一次啟動要先完成設定。恢復原廠設定後也要再做一次。");
  const steps = document.createElement("div");
  steps.className = "wizard-steps";
  ["管理員", "時間", "網路"].forEach((label, index) => {
    const item = document.createElement("span");
    item.textContent = label;
    if (index === state.wizard.step) item.className = "on";
    steps.appendChild(item);
  });
  card.append(title, intro, steps, wizardStepBody());
  const error = document.createElement("p");
  error.className = "form-error";
  error.textContent = state.wizard.error;
  const actions = document.createElement("div");
  actions.className = "wizard-actions";
  if (state.wizard.step > 0) actions.appendChild(actionButton("上一步", "wizard-back", "ghost"));
  actions.appendChild(actionButton(state.wizard.step === 2 ? "完成" : "下一步", "wizard-next"));
  card.append(error, actions);
  root.replaceChildren(card);
}

function wizardStepBody() {
  const wrap = document.createElement("div");
  if (state.wizard.step === 0) {
    const password = textInput("", state.wizard.password, true);
    password.type = "password";
    password.dataset.wizard = "password";
    password.autocomplete = "new-password";
    const again = textInput("", state.wizard.confirm, true);
    again.type = "password";
    again.dataset.wizard = "confirm";
    again.autocomplete = "new-password";
    wrap.append(
      paneNote("請設定管理員密碼。本機預覽完成後不用再登入，遠端連線會用這個密碼。"),
      settingRow("帳號", readOnlyInput("admin")),
      settingRow("密碼", password),
      settingRow("確認密碼", again),
    );
    return wrap;
  }
  if (state.wizard.step === 1) {
    const clock = readOnlyInput(nowText());
    clock.dataset.clock = "1";
    const server = textInput("ntpServer", state.time.server, true);
    server.disabled = !state.time.ntp;
    wrap.append(
      paneNote("預設伺服器是 time.google.com。"),
      settingRow("時區", selectField("zone", ZONES, state.time.zone, true)),
      settingRow("自動對時", checkField("ntp", state.time.ntp)),
      settingRow("伺服器", server),
      settingRow("目前時間", clock),
    );
    return wrap;
  }
  const net = state.network;
  const ip = textInput("ip", net.ip, true);
  const mask = textInput("mask", net.mask, true);
  const gateway = textInput("gateway", net.gateway, true);
  [ip, mask, gateway].forEach((input) => {
    input.disabled = net.dhcp;
  });
  wrap.append(
    paneNote("內網位址。對外觀看請到設定的遠端頁，用手機掃描 QR 完成 Cloudflare 設定。"),
    settingRow("自動取得", checkField("dhcp", net.dhcp)),
    settingRow("IP", ip),
    settingRow("子網路遮罩", mask),
    settingRow("閘道", gateway),
  );
  return wrap;
}

function wizardNext() {
  const wizard = state.wizard;
  if (wizard.step === 0) {
    const message = passwordError(wizard.password, wizard.confirm);
    wizard.error = message;
    if (message) {
      renderWizard();
      return;
    }
    wizard.step = 1;
    renderWizard();
    return;
  }
  if (wizard.step === 1) {
    if (state.time.ntp && !state.time.server) state.time.server = GOOGLE_NTP;
    wizard.error = "";
    wizard.step = 2;
    renderWizard();
    return;
  }
  if (!state.network.dhcp) {
    const bad = ["ip", "mask", "gateway"].find((key) => !validIPv4(state.network[key]));
    if (bad) {
      wizard.error = "請填寫正確的 IP、遮罩和閘道";
      renderWizard();
      return;
    }
  }
  state.user.password = wizard.password;
  state.user.name = "admin";
  state.time.ntp = state.time.ntp;
  if (!state.time.server) state.time.server = GOOGLE_NTP;
  state.time.syncedAt = nowText();
  state.setup = true;
  wizard.error = "";
  saveStore();
  noteActivity();
  renderAll();
  toast("開機設定已完成");
}

function wizardBack() {
  state.wizard.error = "";
  state.wizard.step = Math.max(0, state.wizard.step - 1);
  renderWizard();
}

function setBootLayout(n) {
  state.bootLayout = n;
  saveStore();
  toast(`開機分割改為${LAYOUT_NAME[n]}，目前預覽保持不變`);
}

function onPageClick(event) {
  const del = event.target.closest("[data-shot-del]");
  if (del) {
    event.preventDefault();
    event.stopPropagation();
    removeShot(del.dataset.shotDel);
    return;
  }
  const shot = event.target.closest("[data-shot]");
  if (shot) {
    state.shotView = shot.dataset.shot;
    renderViewer();
    return;
  }
  const playCh = event.target.closest("[data-play-ch]");
  if (playCh) {
    state.play.index = Number(playCh.dataset.playCh);
    state.play.playing = false;
    renderPage();
    renderChrome();
    return;
  }
  if (event.target.closest("#playToggle")) {
    if (!hasRecord(channels[state.play.index])) return;
    state.play.playing = !state.play.playing;
    paintPlayhead();
    return;
  }
  const action = event.target.closest("[data-action]");
  if (action) {
    runSettingsAction(action.dataset.action);
    return;
  }
  const mode = event.target.closest("[data-record-mode]");
  if (mode) {
    state.recordPlan.mode = mode.dataset.recordMode;
    saveStore();
    renderPage();
    return;
  }
  const tab = event.target.closest("[data-tab]");
  if (tab) {
    state.settingsTab = tab.dataset.tab;
    renderPage();
    renderChrome();
    return;
  }
  const layout = event.target.closest("[data-layout-pick]");
  if (layout) {
    setBootLayout(Number(layout.dataset.layoutPick));
    renderPage();
    return;
  }
  const logFilter = event.target.closest("[data-log-filter]");
  if (logFilter) {
    state.logFilter = logFilter.dataset.logFilter;
    renderPage();
  }
}

function refreshSettings() {
  saveStore();
  if (state.screen === "settings") renderPage();
  renderChrome();
}

function runSettingsAction(action) {
  if (action === "wizard-next") {
    wizardNext();
    return;
  }
  if (action === "wizard-back") {
    wizardBack();
    return;
  }
  if (action === "reboot") {
    toast("預覽模式不會重新啟動這台電腦");
    return;
  }
  if (action === "factory") {
    state.confirm = "factory";
    renderChrome();
    return;
  }
  if (action === "export-config") {
    exportConfig();
    return;
  }
  if (action === "fw-check") {
    state.firmwareStatus = "正在檢查 GitHub…";
    refreshSettings();
    setTimeout(() => {
      state.firmwareStatus = `已是最新 ${VERSION}`;
      toast(`GitHub 目前為 ${VERSION}`);
      if (state.screen === "settings" && state.settingsTab === "firmware") renderPage();
    }, 600);
    return;
  }
  if (action === "fw-start") {
    if (!state.firmwareName) {
      toast("請先選擇韌體檔");
      return;
    }
    state.confirm = "firmware";
    renderChrome();
    return;
  }
  if (action === "mail-test") {
    if (!state.mail.enabled || !state.mail.server || !state.mail.to) {
      toast("請先填郵件伺服器和收件者");
      return;
    }
    toast("預覽模式不會寄出信件");
    return;
  }
  if (action === "remote-reset") {
    state.remote.host = "";
    state.remote.linked = false;
    delete state.remote.token;
    saveStore();
    toast("請用手機重新掃描");
    refreshSettings();
    return;
  }
  if (action === "google-time") {
    state.time.ntp = true;
    state.time.server = GOOGLE_NTP;
    state.time.syncedAt = nowText();
    toast(`已與 ${GOOGLE_NTP} 同步成功`);
    refreshSettings();
    return;
  }
  if (action === "password") {
    const oldValue = document.querySelector("[data-field='userOld']")?.value || "";
    const nextValue = document.querySelector("[data-field='userNew']")?.value || "";
    const again = document.querySelector("[data-field='userNew2']")?.value || "";
    if (oldValue !== state.user.password) {
      toast("目前密碼不正確");
      return;
    }
    const message = passwordError(nextValue, again);
    if (message) {
      toast(message);
      return;
    }
    state.user.password = nextValue;
    saveStore();
    toast("密碼已更新");
    renderPage();
  }
}

function onPageChange(event) {
  const target = event.target;
  const field = target.dataset.field;
  if (!field) return;
  if (field === "name" || field === "preview" || field === "record" || field === "alarm") {
    const ch = channels[Number(target.dataset.index)];
    if (field === "name") {
      ch.name = target.value.trim().slice(0, 16) || ch.name;
      target.value = ch.name;
    } else if (field === "preview") ch.preview = target.checked;
    else if (field === "record") ch.recording = target.checked;
    else ch.alarm = target.checked;
    saveStore();
    if (field === "alarm") renderChrome();
    return;
  }
  if (field === "tour") {
    state.tourSeconds = Number(target.value);
    if (state.tour) setTour(true);
    saveStore();
    return;
  }
  if (field === "device") {
    state.deviceName = target.value.trim().slice(0, 16) || "Mariiy NVR";
    target.value = state.deviceName;
    document.getElementById("deviceName").textContent = state.deviceName;
    saveStore();
    return;
  }
  if (field === "deviceNo") {
    state.system.deviceNo = target.value.trim().slice(0, 8) || "1";
    target.value = state.system.deviceNo;
    saveStore();
    return;
  }
  if (field === "resolution") state.system.resolution = target.value;
  else if (field === "standby") state.system.standby = Number(target.value);
  else if (field === "autoReboot") state.system.autoReboot = target.checked;
  else if (field === "rebootHour") state.system.rebootHour = Number(target.value);
  else if (field === "checkUpdate") state.system.checkUpdate = target.checked;
  else if (field === "idleMinutes") state.user.idleMinutes = Number(target.value) || 10;
  else if (field === "zone") state.time.zone = target.value;
  else if (field === "ntp") state.time.ntp = target.checked;
  else if (field === "dst") state.time.dst = target.checked;
  else if (field === "ntpServer") {
    state.time.server = target.value.trim() || GOOGLE_NTP;
    if (state.time.ntp) state.time.syncedAt = nowText();
  } else if (field === "ntpInterval") state.time.interval = Number(target.value);
  else if (field === "dhcp") state.network.dhcp = target.checked;
  else if (field === "firmwareFile") {
    const file = target.files && target.files[0];
    state.firmwareName = file ? file.name : "";
    renderPage();
    return;
  } else if (field === "importFile") {
    const file = target.files && target.files[0];
    if (file) importConfig(file);
    target.value = "";
    return;
  } else if (field === "codec") state.encode.codec = target.value;
  else if (field === "soundOut") {
    state.sound.output = target.checked;
    if (!state.sound.output) state.audio = false;
  } else if (field === "soundVol") state.sound.volume = Number(target.value);
  else if (field === "soundCodec") state.sound.codec = target.value;
  else if (field === "mailEnabled") state.mail.enabled = target.checked;
  else if (field === "mailServer") state.mail.server = target.value.trim().slice(0, 64);
  else if (field === "mailPort") state.mail.port = target.value.trim().slice(0, 5) || "587";
  else if (field === "mailSsl") state.mail.ssl = target.checked;
  else if (field === "mailAccount") state.mail.account = target.value.trim().slice(0, 64);
  else if (field === "mailFrom") state.mail.from = target.value.trim().slice(0, 64);
  else if (field === "mailTo") state.mail.to = target.value.trim().slice(0, 64);
  else if (field === "exDiskFull") state.exception.diskFull = target.checked;
  else if (field === "exDiskError") state.exception.diskError = target.checked;
  else if (field === "exNetDown") state.exception.netDown = target.checked;
  else if (field === "exIpConflict") state.exception.ipConflict = target.checked;
  else if (field === "exChannelOff") state.exception.channelOff = target.checked;
  else if (field === "exBeep") state.exception.beep = target.checked;
  else if (field === "exMail") state.exception.mail = target.checked;
  else if (field === "alarmMail") state.alarmLink.mail = target.checked;
  else if (field === "mouseHide") state.osd.mouseHide = Number(target.value);
  else if (field === "ip" || field === "mask" || field === "gateway" || field === "dns1" || field === "dns2") {
    const value = target.value.trim();
    if (!validIPv4(value)) {
      toast("IP 格式不正確");
      target.value = state.network[field];
      return;
    }
    state.network[field] = value;
    saveStore();
    return;
  } else if (field === "preRecord") state.recordPlan.pre = Number(target.value);
  else if (field === "postRecord") state.recordPlan.post = Number(target.value);
  else if (field === "overwrite") state.recordPlan.overwrite = target.checked;
  else if (field === "mainRes") state.encode.mainRes = target.value;
  else if (field === "mainFps") state.encode.mainFps = Number(target.value);
  else if (field === "subRes") state.encode.subRes = target.value;
  else if (field === "subFps") state.encode.subFps = Number(target.value);
  else if (field === "alarmRecord") state.alarmLink.record = target.checked;
  else if (field === "alarmShot") state.alarmLink.shot = target.checked;
  else if (field === "alarmBeep") state.alarmLink.beep = target.checked;
  else if (field === "osdName") state.osd.name = target.checked;
  else if (field === "osdTime") state.osd.time = target.checked;
  else if (field === "remoteEnabled") state.remote.enabled = target.checked;
  else if (field === "remoteViewers") state.remote.viewers = Number(target.value);
  else return;
  refreshSettings();
}

function bind() {
  document.getElementById("prevBtn").addEventListener("click", () => step(-1, true));
  document.getElementById("nextBtn").addEventListener("click", () => step(1, true));
  document.getElementById("tourBtn").addEventListener("click", () => {
    setTour(!state.tour);
    toast(state.tour ? "輪巡已開始" : "輪巡已停止");
    renderChrome();
  });
  document.getElementById("audioBtn").addEventListener("click", () => {
    if (!state.sound.output) return;
    const ch = channels[state.selected];
    if (!state.audio && (!ch.online || !ch.preview)) {
      toast("此通道目前沒有聲音");
      return;
    }
    state.audio = !state.audio;
    toast(state.audio ? `聲音已開啟：${chLabel(ch)}` : "聲音已關閉");
    renderAll();
  });
  document.getElementById("ptzBtn").addEventListener("click", () => togglePtz());
  document.getElementById("ptzClose").addEventListener("click", () => togglePtz(false));
  document.getElementById("shotBtn").addEventListener("click", () => {
    const ch = channels[state.selected];
    if (!ch.online || !ch.preview) {
      toast("此通道目前沒有畫面");
      return;
    }
    addShot(ch);
  });
  document.getElementById("menuBtn").addEventListener("click", () => {
    state.menuOpen = !state.menuOpen;
    state.context = null;
    renderChrome();
  });
  document.getElementById("alarmBtn").addEventListener("click", jumpAlarm);
  document.getElementById("goLive").addEventListener("click", () => openScreen("live"));
  document.getElementById("goPlayback").addEventListener("click", () => {
    if (state.screen === "playback") {
      state.menuOpen = false;
      renderChrome();
      return;
    }
    openPlayback(state.selected);
  });
  document.getElementById("goPictures").addEventListener("click", () => openScreen("pictures"));
  document.getElementById("goSettings").addEventListener("click", () => openScreen("settings"));
  document.getElementById("goPower").addEventListener("click", () => {
    state.menuOpen = false;
    state.confirm = "power";
    renderChrome();
  });
  document.getElementById("confirmCancel").addEventListener("click", () => {
    state.confirm = null;
    renderChrome();
  });
  document.getElementById("confirmOk").addEventListener("click", () => {
    if (state.confirm === "factory") {
      factoryReset();
      return;
    }
    if (state.confirm === "firmware") {
      startFirmware();
      return;
    }
    state.confirm = null;
    renderChrome();
    toast("預覽模式不會關閉這台電腦");
  });
  const wizard = document.getElementById("wizard");
  wizard.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]");
    if (!action) return;
    runSettingsAction(action.dataset.action);
  });
  wizard.addEventListener("input", (event) => {
    const key = event.target.dataset.wizard;
    if (key === "password" || key === "confirm") state.wizard[key] = event.target.value;
  });
  wizard.addEventListener("change", onPageChange);

  document.getElementById("ptz").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-ptz]");
    if (!btn) return;
    ptzAction(btn.dataset.ptz);
  });

  const wall = document.getElementById("wall");
  wall.addEventListener("click", (event) => {
    const tile = event.target.closest(".tile[data-index]");
    if (!tile) return;
    selectIndex(Number(tile.dataset.index));
  });
  wall.addEventListener("dblclick", (event) => {
    const tile = event.target.closest(".tile[data-index]");
    if (!tile) return;
    state.selected = Number(tile.dataset.index);
    toggleZoom();
  });
  wall.addEventListener("contextmenu", (event) => {
    const tile = event.target.closest(".tile[data-index]");
    if (!tile) return;
    event.preventDefault();
    state.selected = Number(tile.dataset.index);
    state.context = { x: event.clientX, y: event.clientY };
    paintSelection();
    renderChrome();
  });
  wall.addEventListener("wheel", (event) => {
    event.preventDefault();
    step(event.deltaY > 0 ? 1 : -1, true);
  }, { passive: false });

  document.addEventListener("click", (event) => {
    if (!state.context) return;
    if (event.target.closest("#context")) return;
    state.context = null;
    renderChrome();
  });
  document.addEventListener("keydown", (event) => {
    if (state.locked) return;
    if (!state.setup) return;
    if (event.key === "Escape") {
      if (state.shotView) {
        state.shotView = null;
        renderViewer();
        return;
      }
      if (state.context) {
        state.context = null;
        renderChrome();
        return;
      }
      if (state.confirm) {
        state.confirm = null;
        renderChrome();
        return;
      }
      if (state.menuOpen) {
        state.menuOpen = false;
        renderChrome();
        return;
      }
      if (state.ptzOpen) {
        togglePtz(false);
        return;
      }
      if (state.zoomed && state.screen === "live") toggleZoom();
      else if (state.screen !== "live") openScreen("live");
      return;
    }
    if (state.menuOpen || state.confirm) return;
    if (state.screen === "playback") {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        seekMinute(5);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        seekMinute(-5);
      } else if (event.key === "Enter") {
        event.preventDefault();
        const current = channels[state.play.index];
        if (!hasRecord(current)) return;
        state.play.playing = !state.play.playing;
        paintPlayhead();
      }
      return;
    }
    if (state.screen !== "live") return;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      step(1, true);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      step(-1, true);
    } else if (event.key === "Enter") {
      event.preventDefault();
      toggleZoom();
    }
  });

  document.getElementById("backLive").addEventListener("click", () => openScreen("live"));
  window.addEventListener("storage", pullRemote);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") pullRemote();
  });
  document.getElementById("remotePill").addEventListener("click", () => {
    state.settingsTab = "remote";
    openScreen("settings");
  });
  document.getElementById("diskPill").addEventListener("click", () => {
    state.settingsTab = "disk";
    openScreen("settings");
  });
  document.getElementById("viewerClose").addEventListener("click", () => {
    state.shotView = null;
    renderViewer();
  });
  document.getElementById("viewerDelete").addEventListener("click", () => {
    if (state.shotView) removeShot(state.shotView);
  });
  document.getElementById("viewer").addEventListener("click", (event) => {
    if (event.target.id === "viewer") {
      state.shotView = null;
      renderViewer();
    }
  });

  const page = document.getElementById("page");
  page.addEventListener("click", onPageClick);
  page.addEventListener("change", onPageChange);
  page.addEventListener("pointerdown", (event) => {
    if (!event.target.closest("#playTrack")) return;
    seekFromEvent(event);
    const move = (e) => seekFromEvent(e);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  });

  ["pointerdown", "keydown", "wheel"].forEach((type) => {
    document.addEventListener(type, noteActivity, true);
  });
  document.addEventListener("mousemove", () => {
    const last = Number(sessionStorage.getItem(IDLE_KEY) || 0);
    if (Date.now() - last < 1000) return;
    noteActivity();
  }, true);
}

loadStore();
resumeSession();
buildSplits();
buildPresets();
bind();
renderAll();
new ResizeObserver(() => fitWall()).observe(document.getElementById("wall"));
tick();
setInterval(tick, 1000);
setInterval(checkIdle, 1000);
setInterval(() => {
  if (state.screen !== "playback" || !state.play.playing) return;
  if (!hasRecord(channels[state.play.index])) {
    state.play.playing = false;
    paintPlayhead();
    return;
  }
  state.play.minute = (state.play.minute + 1) % 1440;
  paintPlayhead();
  document.getElementById("current").textContent = `${chLabel(channels[state.play.index])} · 回放 · ${formatMinute(state.play.minute)}`;
}, 500);
