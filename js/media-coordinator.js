(function () {
  const config = window.MEDIA_CONFIG?.backgroundMusic || {};
  const storageKey = "niyun-background-music-settings";
  const defaultVolume = Math.min(1, Math.max(0, Number(config.defaultVolume) || 0.03));
  const audio = document.createElement("audio");
  const settingsInput = document.querySelector("#backgroundMusicEnabled");
  const volumeInput = document.querySelector("#backgroundMusicVolume");
  const volumeOutput = document.querySelector("#backgroundMusicVolumeValue");
  const musicButton = document.querySelector("#toggleMusic");
  const restartButton = document.querySelector("#restartMusic");
  const carouselButton = document.querySelector("#toggleMusicCarousel");
  const trackInputs = [...document.querySelectorAll("[name=backgroundMusicTrack]")];
  const tracks = (config.tracks || []).map((track) => ({
    ...track,
    url: window.MediaSecurity?.resolve(track.url) || ""
  })).filter((track) => track.url);
  const trackStorageKey = "niyun-background-music-track";
  const carouselStorageKey = "niyun-background-music-carousel";
  const defaultTrackId = tracks.some((track) => track.id === config.defaultTrackId) ? config.defaultTrackId : tracks[0]?.id || "";
  let settings = { enabled: config.defaultEnabled === true, volume: defaultVolume };
  let selectedTrackId = defaultTrackId;
  let carouselEnabled = config.defaultCarouselEnabled === true;
  let wasPlayingBeforeVideo = false;
  let activeVideos = 0;
  let fadeTimer = null;
  let pauseRequestId = 0;

  audio.loop = true;
  audio.preload = "none";
  audio.volume = defaultVolume;
  audio.title = config.title || "背景音乐";

  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
    settings.enabled = Object.hasOwn(saved, "enabled") ? saved.enabled === true : settings.enabled;
    settings.volume = Number.isFinite(Number(saved.volume)) ? Math.min(1, Math.max(0, Number(saved.volume))) : defaultVolume;
  } catch (_) { /* 使用默认设置。 */ }
  const savedTrackId = window.localStorage.getItem(trackStorageKey);
  if (tracks.some((track) => track.id === savedTrackId)) selectedTrackId = savedTrackId;
  const savedCarousel = window.localStorage.getItem(carouselStorageKey);
  if (savedCarousel !== null) carouselEnabled = savedCarousel === "true";

  function getSelectedTrack() {
    return tracks.find((track) => track.id === selectedTrackId) || tracks[0] || null;
  }

  function applySelectedTrack() {
    const track = getSelectedTrack();
    audio.pause();
    audio.currentTime = 0;
    audio.src = track?.url || "";
    audio.loop = !carouselEnabled;
    audio.title = track?.label || config.title || "背景音乐";
    trackInputs.forEach((input) => { input.checked = input.value === track?.id; });
  }

  function saveSettings() {
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
  }

  function syncControls() {
    if (settingsInput) settingsInput.checked = settings.enabled;
    const hasMusic = Boolean(getSelectedTrack());
    if (settingsInput) settingsInput.disabled = !hasMusic;
    if (volumeInput) volumeInput.value = String(Math.round(settings.volume * 100));
    if (volumeOutput) volumeOutput.value = `${Math.round(settings.volume * 100)}%`;
    if (musicButton) {
      const videoPaused = activeVideos > 0;
      musicButton.setAttribute("aria-pressed", String(settings.enabled));
      musicButton.setAttribute("aria-label", videoPaused ? "视频播放中，背景音乐已暂停" : settings.enabled ? "关闭背景音乐" : "开启背景音乐");
      musicButton.title = videoPaused ? "视频播放中，背景音乐已暂停" : settings.enabled ? "关闭背景音乐" : "开启背景音乐";
      musicButton.dataset.playing = String(settings.enabled && !audio.paused && !videoPaused);
      musicButton.dataset.videoPaused = String(videoPaused);
      musicButton.disabled = !hasMusic;
    }
    if (restartButton) restartButton.disabled = !hasMusic;
    if (carouselButton) {
      const canCarousel = tracks.length > 1;
      carouselButton.disabled = !canCarousel;
      carouselButton.setAttribute("aria-pressed", String(carouselEnabled));
      carouselButton.setAttribute("aria-label", carouselEnabled ? "关闭音乐轮播" : "开启音乐轮播");
      carouselButton.title = carouselEnabled ? "关闭音乐轮播" : "开启音乐轮播";
      carouselButton.dataset.enabled = String(carouselEnabled);
    }
  }

  function fadeTo(target, duration = 320) {
    if (fadeTimer) window.clearInterval(fadeTimer);
    const start = audio.volume;
    const began = performance.now();
    fadeTimer = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - began) / duration);
      audio.volume = start + (target - start) * progress;
      if (progress >= 1) {
        window.clearInterval(fadeTimer);
        fadeTimer = null;
      }
    }, 30);
  }

  async function playMusic() {
    if (!getSelectedTrack() || !settings.enabled || activeVideos > 0) return false;
    pauseRequestId += 1;
    try {
      audio.volume = Math.min(audio.volume, settings.volume);
      await audio.play();
      fadeTo(settings.volume);
      syncControls();
      return true;
    } catch (_) {
      // 浏览器可能暂时拦截自动播放，保留用户的开启偏好，等待首次交互后重试。
      syncControls();
      return false;
    }
  }

  function pauseMusic() {
    const requestId = ++pauseRequestId;
    // 先立即暂停，保证按钮状态马上反映“已关闭”；音量淡出只负责收尾视觉。
    audio.pause();
    fadeTo(0, 180);
    window.setTimeout(() => {
      if (requestId === pauseRequestId) {
        syncControls();
      }
    }, 190);
    syncControls();
  }

  async function restartMusic() {
    if (!getSelectedTrack() || activeVideos > 0) return false;
    audio.currentTime = 0;
    settings.enabled = true;
    saveSettings();
    syncControls();
    return playMusic();
  }

  function handleVideoPlay(event) {
    if (event.target === audio) return;
    if (!(event.target instanceof HTMLVideoElement)) return;
    activeVideos += 1;
    wasPlayingBeforeVideo = !audio.paused;
    pauseMusic();
    syncControls();
  }

  function handleVideoStop(event) {
    if (!(event.target instanceof HTMLVideoElement)) return;
    activeVideos = Math.max(0, activeVideos - 1);
    if (activeVideos === 0 && wasPlayingBeforeVideo) {
      wasPlayingBeforeVideo = false;
      playMusic();
    }
    syncControls();
  }

  function playNextTrack() {
    if (!carouselEnabled || tracks.length < 2) return;
    const currentIndex = tracks.findIndex((track) => track.id === selectedTrackId);
    selectedTrackId = tracks[(currentIndex + 1) % tracks.length].id;
    window.localStorage.setItem(trackStorageKey, selectedTrackId);
    applySelectedTrack();
    syncControls();
    if (settings.enabled && activeVideos === 0) playMusic();
  }

  document.addEventListener("play", handleVideoPlay, true);
  document.addEventListener("pause", handleVideoStop, true);
  document.addEventListener("ended", handleVideoStop, true);
  document.addEventListener("emptied", handleVideoStop, true);
  audio.addEventListener("ended", playNextTrack);

  // 用户已开启音乐时尝试自动播放；若浏览器拦截，则在用户第一次操作页面时重试。
  function resumeAfterUserGesture(event) {
    if (event.target.closest?.("#toggleMusic, #restartMusic, #toggleMusicCarousel, #backgroundMusicEnabled, [name=backgroundMusicTrack], #backgroundMusicVolume")) return;
    if (!settings.enabled || activeVideos > 0 || !audio.paused) return;
    playMusic();
  }
  ["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
    document.addEventListener(eventName, resumeAfterUserGesture, { once: true, passive: true });
  });

  function toggleMusic() {
    if (!getSelectedTrack() || activeVideos > 0) return;
    settings.enabled = !settings.enabled;
    saveSettings();
    if (settings.enabled) playMusic();
    else {
      wasPlayingBeforeVideo = false;
      pauseMusic();
    }
    syncControls();
  }
  musicButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMusic();
  });
  musicButton?.addEventListener("pointerdown", (event) => event.stopPropagation());

  settingsInput?.addEventListener("change", () => {
    settings.enabled = settingsInput.checked;
    saveSettings();
    if (settings.enabled) playMusic();
    else {
      wasPlayingBeforeVideo = false;
      pauseMusic();
    }
  });
  restartButton?.addEventListener("click", restartMusic);
  function toggleCarousel() {
    if (tracks.length < 2) return;
    carouselEnabled = !carouselEnabled;
    window.localStorage.setItem(carouselStorageKey, String(carouselEnabled));
    audio.loop = !carouselEnabled;
    syncControls();
  }
  carouselButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleCarousel();
  });
  carouselButton?.addEventListener("pointerdown", (event) => event.stopPropagation());
  restartButton?.addEventListener("pointerdown", (event) => event.stopPropagation());
  trackInputs.forEach((input) => input.addEventListener("change", () => {
    const shouldResume = settings.enabled && !audio.paused;
    selectedTrackId = input.value;
    window.localStorage.setItem(trackStorageKey, selectedTrackId);
    applySelectedTrack();
    syncControls();
    if (shouldResume && activeVideos === 0) playMusic();
  }));
  volumeInput?.addEventListener("input", () => {
    settings.volume = Number(volumeInput.value) / 100;
    audio.volume = settings.volume;
    saveSettings();
    syncControls();
  });
  window.addEventListener("ai-pet-settings-reset", syncControls);
  window.addEventListener("media-settings-reset", () => {
    settings = { enabled: config.defaultEnabled === true, volume: defaultVolume };
    selectedTrackId = defaultTrackId;
    carouselEnabled = config.defaultCarouselEnabled === true;
    window.localStorage.setItem(trackStorageKey, selectedTrackId);
    window.localStorage.setItem(carouselStorageKey, "false");
    wasPlayingBeforeVideo = false;
    applySelectedTrack();
    saveSettings();
    pauseMusic();
    syncControls();
  });
  window.MediaCoordinator = Object.freeze({
    playMusic,
    pauseMusic,
    restartMusic,
    getAudio: () => audio,
    hasMusic: () => Boolean(getSelectedTrack())
  });
  applySelectedTrack();
  syncControls();
  if (settings.enabled) playMusic();
}());
