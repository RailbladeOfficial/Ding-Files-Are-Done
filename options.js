const DEFAULT_SETTINGS = {
  enabled: true,
  minSizeKB: 0,
  hideDownloadShelf: true,
  soundEffect: false,
  sound: "builtin:chime",
  volume: 50 // 0-100, stored as a percentage
};

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB — plenty for a short SFX

// "Standard" group — synthesized in offscreen.js, no audio files needed.
const STANDARD_SOUNDS = [
  { id: "chime", label: "Chime (default)" },
  { id: "ding", label: "Ding" },
  { id: "pop", label: "Pop" },
  { id: "marimba", label: "Marimba" },
  { id: "alert", label: "Retro alert" },
  { id: "bell", label: "Soft bell" },
  { id: "arpeggio", label: "Arpeggio" },
  { id: "fanfare", label: "Fanfare" },
  { id: "levelup", label: "Level Up" },
  { id: "bloop", label: "Descending Bloop" }
];

// "Special" group — real bundled audio files shipped in sounds/custom/.
// Add an entry here (and drop the matching file in sounds/custom/) to add more.
const SPECIAL_SOUNDS = [
  { id: "success", label: "Success!", file: "success.wav" },
  { id: "work", label: "Work", file: "work.wav" },
  { id: "ready", label: "Ready", file: "ready.wav" }
];

const enabledEl = document.getElementById("enabled");
const soundEffectEl = document.getElementById("soundEffect");
const soundPickerRow = document.getElementById("soundPickerRow");
const soundSelectEl = document.getElementById("soundSelect");
const standardGroup = document.getElementById("builtinGroup");
const specialGroup = document.getElementById("customGroup");
const uploadedGroup = document.getElementById("uploadedGroup");
const previewBtn = document.getElementById("previewBtn");
const volumeSliderEl = document.getElementById("volumeSlider");
const volumeValueEl = document.getElementById("volumeValue");
const uploadInput = document.getElementById("uploadInput");
const removeUploadBtn = document.getElementById("removeUploadBtn");
const uploadStatusEl = document.getElementById("uploadStatus");
const hideShelfEl = document.getElementById("hideDownloadShelf");
const minSizeEl = document.getElementById("minSize");
const statusEl = document.getElementById("status");

let saveTimer = null;
let volumeSaveTimer = null;
let uploadStatusTimer = null;

function populateStandardSounds() {
  standardGroup.innerHTML = "";
  for (const s of STANDARD_SOUNDS) {
    const opt = document.createElement("option");
    opt.value = `builtin:${s.id}`;
    opt.textContent = s.label;
    standardGroup.appendChild(opt);
  }
}

function populateSpecialSounds() {
  specialGroup.innerHTML = "";
  if (SPECIAL_SOUNDS.length === 0) {
    specialGroup.hidden = true;
    return;
  }
  specialGroup.hidden = false;
  for (const entry of SPECIAL_SOUNDS) {
    const opt = document.createElement("option");
    opt.value = `custom:${entry.file}`;
    opt.textContent = entry.label || entry.id;
    specialGroup.appendChild(opt);
  }
}

async function getUploadedSound() {
  const stored = await chrome.storage.local.get("uploadedSound");
  return stored.uploadedSound || null;
}

async function refreshUploadedUI() {
  const uploaded = await getUploadedSound();
  uploadedGroup.innerHTML = "";

  if (!uploaded) {
    uploadedGroup.hidden = true;
    removeUploadBtn.hidden = true;
    return;
  }

  uploadedGroup.hidden = false;
  const opt = document.createElement("option");
  opt.value = "uploaded:current";
  opt.textContent = uploaded.name;
  uploadedGroup.appendChild(opt);

  removeUploadBtn.hidden = false;
}

function updateSoundPickerVisibility() {
  soundPickerRow.style.display = soundEffectEl.checked ? "flex" : "none";
}

function updateVolumeLabel() {
  volumeValueEl.textContent = `${volumeSliderEl.value}%`;
}

function showUploadStatus(text, isError) {
  uploadStatusEl.textContent = text;
  uploadStatusEl.style.color = isError ? "#e0457b" : "";
  clearTimeout(uploadStatusTimer);
  uploadStatusTimer = setTimeout(() => {
    uploadStatusEl.textContent = "";
    uploadStatusEl.style.color = "";
  }, 3000);
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function handleUpload(file) {
  if (!file) return;
  if (!file.type.startsWith("audio/")) {
    showUploadStatus("That doesn't look like an audio file.", true);
    return;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    showUploadStatus("Keep it under 5MB — pick a shorter clip.", true);
    return;
  }

  try {
    const dataUrl = await readFileAsDataURL(file);
    await chrome.storage.local.set({
      uploadedSound: { name: file.name, dataUrl }
    });
    await refreshUploadedUI();
    soundSelectEl.value = "uploaded:current";
    await save();
    previewCurrentSelection();
    showUploadStatus("Uploaded.", false);
  } catch (e) {
    showUploadStatus("Couldn't read that file.", true);
  } finally {
    // Reset so picking the same file again still fires the change event.
    uploadInput.value = "";
  }
}

async function removeUpload() {
  await chrome.storage.local.remove("uploadedSound");
  await refreshUploadedUI();
  if (soundSelectEl.value === "uploaded:current") {
    soundSelectEl.value = DEFAULT_SETTINGS.sound;
    await save();
  }
  uploadInput.value = "";
}

async function load() {
  const stored = await chrome.storage.sync.get("settings");
  const settings = Object.assign({}, DEFAULT_SETTINGS, stored.settings || {});

  enabledEl.checked = settings.enabled;
  soundEffectEl.checked = settings.soundEffect;
  hideShelfEl.checked = settings.hideDownloadShelf;
  minSizeEl.value = settings.minSizeKB;
  volumeSliderEl.value = settings.volume;
  updateVolumeLabel();

  populateStandardSounds();
  populateSpecialSounds();
  await refreshUploadedUI();

  // If the previously chosen sound no longer exists (e.g. the uploaded file
  // was removed), fall back to the default rather than leaving a blank select.
  soundSelectEl.value = settings.sound;
  if (soundSelectEl.value !== settings.sound) {
    soundSelectEl.value = DEFAULT_SETTINGS.sound;
  }

  updateSoundPickerVisibility();
}

function showSaved() {
  statusEl.textContent = "Saved";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => (statusEl.textContent = ""), 1200);
}

async function save() {
  const settings = {
    enabled: enabledEl.checked,
    soundEffect: soundEffectEl.checked,
    sound: soundSelectEl.value,
    volume: Number(volumeSliderEl.value),
    hideDownloadShelf: hideShelfEl.checked,
    minSizeKB: Math.max(0, Number(minSizeEl.value) || 0)
  };
  await chrome.storage.sync.set({ settings });
  showSaved();
}

function previewCurrentSelection() {
  chrome.runtime.sendMessage({
    type: "preview-sound",
    sound: soundSelectEl.value,
    volume: Number(volumeSliderEl.value)
  });
}

enabledEl.addEventListener("change", save);
hideShelfEl.addEventListener("change", save);
minSizeEl.addEventListener("change", save);
minSizeEl.addEventListener("input", () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 400);
});

soundEffectEl.addEventListener("change", () => {
  updateSoundPickerVisibility();
  save();
});

soundSelectEl.addEventListener("change", () => {
  save();
  previewCurrentSelection();
});

volumeSliderEl.addEventListener("input", () => {
  updateVolumeLabel();
  clearTimeout(volumeSaveTimer);
  volumeSaveTimer = setTimeout(save, 300);
});
volumeSliderEl.addEventListener("change", previewCurrentSelection);

previewBtn.addEventListener("click", previewCurrentSelection);

uploadInput.addEventListener("change", () => {
  handleUpload(uploadInput.files && uploadInput.files[0]);
});

removeUploadBtn.addEventListener("click", removeUpload);

load();
