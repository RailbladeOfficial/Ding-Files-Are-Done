// ---------- File-type icon lookup ----------

// Extensions with a dedicated pre-rendered badge in /file-icons.
// Keep in sync with make_icons.py's EXT_CATEGORY.
const KNOWN_EXTENSIONS = new Set([
  "pdf",
  "doc", "docx", "rtf", "odt",
  "xls", "xlsx", "csv", "tsv", "ods",
  "ppt", "pptx", "odp",
  "zip", "rar", "7z", "tar", "gz", "bz2", "xz",
  "jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "ico", "heic", "tiff", "avif",
  "mp3", "wav", "flac", "ogg", "m4a", "aac", "wma",
  "mp4", "mkv", "avi", "mov", "webm", "wmv", "flv", "m4v",
  "exe", "msi", "apk", "dmg", "deb", "bat",
  "html", "htm", "css", "scss", "js", "mjs", "cjs", "ts", "tsx", "jsx",
  "json", "xml", "yaml", "yml", "py", "php", "sql", "sh", "rb", "go", "rs",
  "java", "env", "ini",
  "txt", "md", "log", "nfo"
]);

// Broad category colors, mirrored from make_icons.py, used only for the
// runtime-drawn fallback badge (any extension not in KNOWN_EXTENSIONS).
const CATEGORY_COLORS = {
  pdf:          ["#D93831", "#B32B25"],
  document:     ["#2B6FD6", "#2258AE"],
  spreadsheet:  ["#1C8A4C", "#166E3C"],
  presentation: ["#D9662B", "#B34F1F"],
  archive:      ["#C9A227", "#A6851F"],
  image:        ["#9B4FD1", "#7E3CAD"],
  audio:        ["#E0457B", "#B93762"],
  video:        ["#1AA6A0", "#158481"],
  exe:          ["#8E2323", "#711C1C"],
  code:         ["#5C6BC0", "#47539A"],
  text:         ["#6B7A88", "#57636F"],
  generic:      ["#5A6B7B", "#485663"]
};

function extOf(filename) {
  const m = /\.([a-z0-9]+)$/i.exec(filename || "");
  return m ? m[1].toLowerCase() : "";
}

function baseName(path) {
  return (path || "").split(/[\\/]/).pop() || path || "Download";
}

// Classify by MIME type when the extension isn't one of our pre-rendered ones.
function categoryFromMime(mime) {
  if (!mime) return "generic";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (
    mime === "application/zip" ||
    mime === "application/x-7z-compressed" ||
    mime === "application/x-rar-compressed" ||
    mime === "application/x-tar" ||
    mime === "application/gzip" ||
    mime === "application/x-bzip2"
  ) return "archive";
  if (
    mime === "application/msword" ||
    mime.includes("wordprocessingml")
  ) return "document";
  if (
    mime === "application/vnd.ms-excel" ||
    mime.includes("spreadsheetml") ||
    mime === "text/csv"
  ) return "spreadsheet";
  if (
    mime === "application/vnd.ms-powerpoint" ||
    mime.includes("presentationml")
  ) return "presentation";
  if (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/xml"
  ) return "code";
  if (mime === "application/vnd.microsoft.portable-executable" || mime === "application/x-msdownload") {
    return "exe";
  }
  return "generic";
}

// Draws the same style of rounded document badge as make_icons.py, but at
// runtime, for extensions we don't have a pre-rendered icon for.
async function drawFallbackBadge(label, category) {
  const [fill, fold] = CATEGORY_COLORS[category] || CATEGORY_COLORS.generic;
  const size = 128;
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d");

  const pad = size * 0.08;
  const foldSize = size * 0.26;
  const corner = size * 0.10;

  function roundedRectPath(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  ctx.fillStyle = fill;
  roundedRectPath(pad, pad, size - pad * 2, size - pad * 2, corner);
  ctx.fill();

  ctx.fillStyle = fold;
  ctx.beginPath();
  ctx.moveTo(size - pad - foldSize, pad);
  ctx.lineTo(size - pad, pad + foldSize);
  ctx.lineTo(size - pad, pad);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(size - pad - foldSize, pad);
  ctx.lineTo(size - pad, pad + foldSize);
  ctx.lineTo(size - pad - foldSize, pad + foldSize);
  ctx.closePath();
  ctx.fill();

  const text = (label || "FILE").slice(0, 4).toUpperCase();
  ctx.fillStyle = "white";
  ctx.font = `bold ${text.length <= 3 ? size * 0.24 : size * 0.20}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, size / 2, size * 0.62);

  const blob = await canvas.convertToBlob({ type: "image/png" });
  return blobToDataURL(blob);
}

async function blobToDataURL(blob) {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return "data:image/png;base64," + btoa(binary);
}

async function iconUrlFor(filename, mime) {
  const ext = extOf(filename);
  if (ext && KNOWN_EXTENSIONS.has(ext)) {
    return chrome.runtime.getURL(`file-icons/${ext}.png`);
  }
  const category = categoryFromMime(mime);
  const label = ext || (mime ? mime.split("/")[1] : "") || "FILE";
  try {
    return await drawFallbackBadge(label, category);
  } catch (e) {
    // Fall back to a pre-rendered generic badge if canvas drawing fails for any reason.
    return chrome.runtime.getURL("file-icons/_category_generic.png");
  }
}

// ---------- Settings ----------

const DEFAULT_SETTINGS = {
  enabled: true,
  minSizeKB: 0,
  hideDownloadShelf: true,
  soundEffect: false,
  // Encoded as "builtin:<id>" (Standard), "custom:<filename>" (Special), or "uploaded:current"
  sound: "builtin:chime",
  volume: 50 // 0-100
};

async function getSettings() {
  const stored = await chrome.storage.sync.get("settings");
  return Object.assign({}, DEFAULT_SETTINGS, stored.settings || {});
}

async function applyShelfSetting(settings) {
  try {
    await chrome.downloads.setUiOptions({ enabled: !settings.hideDownloadShelf });
  } catch (e) {
    console.warn("Could not set download UI options:", e);
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  applyShelfSetting(await getSettings());
});
chrome.runtime.onStartup.addListener(async () => {
  applyShelfSetting(await getSettings());
});
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "sync" || !changes.settings) return;
  // Settings save on every tweak (volume drags, etc.) — only poke the
  // downloads UI when the shelf preference itself actually changed.
  const oldShelf = changes.settings.oldValue && changes.settings.oldValue.hideDownloadShelf;
  const newShelf = changes.settings.newValue && changes.settings.newValue.hideDownloadShelf;
  if (oldShelf === newShelf) return;
  applyShelfSetting(await getSettings());
});

// ---------- Sound effect (via offscreen document) ----------

let creatingOffscreenDocument = null;

async function ensureOffscreenDocument() {
  const existing = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"]
  });
  if (existing.length > 0) return;

  // If several downloads finish in the same instant, each one lands here
  // concurrently — without a lock they'd all see "no document yet" and race
  // to create one. Only the first createDocument() succeeds; the rest throw,
  // and their sounds would be silently dropped. Share one in-flight promise
  // so the losers just wait for the winner instead.
  if (creatingOffscreenDocument) {
    await creatingOffscreenDocument;
    return;
  }

  creatingOffscreenDocument = chrome.offscreen
    .createDocument({
      url: "offscreen.html",
      reasons: ["AUDIO_PLAYBACK"],
      justification: "Play a sound effect when a download finishes"
    })
    .catch((e) => {
      // A parallel caller may still have won the race between our existence
      // check and our create — fine either way, a document exists.
      console.warn("Offscreen document creation:", e);
    })
    .finally(() => {
      creatingOffscreenDocument = null;
    });

  await creatingOffscreenDocument;
}

// `soundValue` is "builtin:<id>", "custom:<filename>", or "uploaded:current".
// `volumePercent` is 0-100.
async function playSound(soundValue, volumePercent) {
  if (!soundValue) return;
  // Number(undefined) is NaN and `?? ` doesn't catch NaN, so coalesce first,
  // then verify the result is a real finite number before trusting it.
  const raw = Number(volumePercent ?? DEFAULT_SETTINGS.volume);
  const clamped = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : DEFAULT_SETTINGS.volume;
  const volume = clamped / 100;
  try {
    await ensureOffscreenDocument();
    const [kind, value] = String(soundValue).split(/:(.+)/);
    if (kind === "custom") {
      await chrome.runtime.sendMessage({ type: "play-custom-sound", file: value, volume });
    } else if (kind === "uploaded") {
      // Offscreen documents only expose chrome.runtime — no chrome.storage access —
      // so the data has to be read here and handed over in the message itself.
      const stored = await chrome.storage.local.get("uploadedSound");
      const uploaded = stored.uploadedSound;
      if (uploaded && uploaded.dataUrl) {
        await chrome.runtime.sendMessage({ type: "play-uploaded-sound", dataUrl: uploaded.dataUrl, volume });
      }
    } else {
      await chrome.runtime.sendMessage({ type: "play-builtin-sound", soundId: value || "chime", volume });
    }
  } catch (e) {
    console.warn("Could not play sound:", e);
  }
}

// Lets the options page audition a sound without waiting for a real download.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "preview-sound") {
    playSound(message.sound, message.volume);
  }
});

// ---------- Download completion -> notification ----------

chrome.downloads.onChanged.addListener(async (delta) => {
  if (!delta.state || delta.state.current !== "complete") return;

  const settings = await getSettings();
  if (!settings.enabled) return;

  const items = await chrome.downloads.search({ id: delta.id });
  const item = items && items[0];
  if (!item) return;

  const minBytes = (settings.minSizeKB || 0) * 1024;
  if (minBytes && item.fileSize >= 0 && item.fileSize < minBytes) return;

  const filename = baseName(item.filename);
  const notificationId = `download-${item.id}`;
  const iconUrl = await iconUrlFor(filename, item.mime);

  chrome.notifications.create(notificationId, {
    type: "basic",
    iconUrl,
    title: "Download complete",
    message: filename,
    contextMessage: item.filename || "",
    priority: 2,
    silent: !!settings.soundEffect,
    buttons: [
      { title: "Open file", iconUrl: chrome.runtime.getURL("icons/btn-open.png") },
      { title: "Show in folder", iconUrl: chrome.runtime.getURL("icons/btn-folder.png") }
    ]
  });

  if (settings.soundEffect) {
    playSound(settings.sound, settings.volume);
  }
});

function downloadIdFromNotification(notificationId) {
  const m = /^download-(\d+)$/.exec(notificationId);
  return m ? Number(m[1]) : null;
}

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  const downloadId = downloadIdFromNotification(notificationId);
  if (downloadId === null) return;

  if (buttonIndex === 0) {
    chrome.downloads.open(downloadId);
  } else {
    chrome.downloads.show(downloadId);
  }
  chrome.notifications.clear(notificationId);
});

// Clicking the body of the notification (not a button) shows the file in its folder.
chrome.notifications.onClicked.addListener((notificationId) => {
  const downloadId = downloadIdFromNotification(notificationId);
  if (downloadId === null) return;
  chrome.downloads.show(downloadId);
  chrome.notifications.clear(notificationId);
});
