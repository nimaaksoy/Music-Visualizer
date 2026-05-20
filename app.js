(function () {
  const ASPECT_PRESETS = {
    landscape: {
      ratio: 16 / 9,
      previewWidth: 1280,
      previewHeight: 720,
      label: "16:9",
      meta: "16:9 live preview",
    },
    portrait: {
      ratio: 9 / 16,
      previewWidth: 720,
      previewHeight: 1280,
      label: "9:16",
      meta: "9:16 live preview",
    },
  };

  const QUALITY_PRESETS = {
    720: { short: 720, bitrate: 6_000_000 },
    1080: { short: 1080, bitrate: 10_000_000 },
    1440: { short: 1440, bitrate: 16_000_000 },
    2160: { short: 2160, bitrate: 24_000_000 },
  };

  const EXPORT_FPS = 30;
  const MEDIA_EVENT_TIMEOUT = 2500;
  const ASPECT_STORAGE_KEY = "mv:aspect";

  const canvas = document.getElementById("visualizer-canvas");
  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });

  const aspectModal = document.getElementById("aspect-modal");
  const aspectModalButtons = aspectModal.querySelectorAll("[data-aspect]");
  const aspectToggleButtons = document.querySelectorAll("[data-aspect-toggle]");
  const stagePreviews = document.querySelector(".mv-stage-previews");
  const stageMeta = document.getElementById("stage-meta");

  const audioInput = document.getElementById("audio-file");
  const audioPlayer = document.getElementById("audio-player");
  const audioFileName = document.getElementById("audio-file-name");
  const trackTitle = document.getElementById("track-title");
  const trackText = document.getElementById("track-text");
  const trackCardOffsetX = document.getElementById("track-card-offset-x");
  const trackCardOffsetY = document.getElementById("track-card-offset-y");
  const trackCardScale = document.getElementById("track-card-scale");
  const extraText = document.getElementById("extra-text");
  const extraOffsetX = document.getElementById("extra-offset-x");
  const extraOffsetY = document.getElementById("extra-offset-y");
  const extraScale = document.getElementById("extra-scale");
  const visualizerStyle = document.getElementById("visualizer-style");
  const accentColor = document.getElementById("accent-color");
  const barCount = document.getElementById("bar-count");
  const intensity = document.getElementById("intensity");
  const smoothing = document.getElementById("smoothing");
  const visualizerOffsetX = document.getElementById("visualizer-offset-x");
  const visualizerOffsetY = document.getElementById("visualizer-offset-y");
  const visualizerScale = document.getElementById("visualizer-scale");
  const visualizerCurve = document.getElementById("visualizer-curve");
  const particleStyle = document.getElementById("particle-style");
  const particleIntensity = document.getElementById("particle-intensity");
  const particleIntensityValue = document.getElementById("particle-intensity-value");
  const backgroundSource = document.getElementById("background-source");
  const presetPicker = document.getElementById("preset-picker");
  const backgroundImageInput = document.getElementById("background-image");
  const backgroundVideoInput = document.getElementById("background-video");
  const imageUploadGroup = document.getElementById("image-upload-group");
  const videoUploadGroup = document.getElementById("video-upload-group");
  const backgroundImageName = document.getElementById("background-image-name");
  const backgroundVideoName = document.getElementById("background-video-name");
  const overlayStrength = document.getElementById("overlay-strength");
  const backgroundBlur = document.getElementById("background-blur");
  const exportQuality = document.getElementById("export-quality");
  const downloadButton = document.getElementById("download-button");
  const downloadButtonLabel = document.getElementById("download-button-label");
  const exportProgress = document.getElementById("export-progress");
  const exportProgressLabel = document.getElementById("export-progress-label");
  const exportProgressValue = document.getElementById("export-progress-value");
  const exportProgressFill = document.getElementById("export-progress-fill");
  const recordingStatus = document.getElementById("recording-status");
  const trimStartInput = document.getElementById("trim-start");
  const trimEndInput = document.getElementById("trim-end");
  const trimStartValue = document.getElementById("trim-start-value");
  const trimEndValue = document.getElementById("trim-end-value");
  const trimDurationValue = document.getElementById("trim-duration-value");
  const trimFill = document.getElementById("trim-fill");

  const barCountValue = document.getElementById("bar-count-value");
  const intensityValue = document.getElementById("intensity-value");
  const smoothingValue = document.getElementById("smoothing-value");
  const trackCardOffsetXValue = document.getElementById("track-card-offset-x-value");
  const trackCardOffsetYValue = document.getElementById("track-card-offset-y-value");
  const trackCardScaleValue = document.getElementById("track-card-scale-value");
  const extraOffsetXValue = document.getElementById("extra-offset-x-value");
  const extraOffsetYValue = document.getElementById("extra-offset-y-value");
  const extraScaleValue = document.getElementById("extra-scale-value");
  const visualizerOffsetXValue = document.getElementById("visualizer-offset-x-value");
  const visualizerOffsetYValue = document.getElementById("visualizer-offset-y-value");
  const visualizerScaleValue = document.getElementById("visualizer-scale-value");
  const visualizerCurveValue = document.getElementById("visualizer-curve-value");
  const overlayStrengthValue = document.getElementById("overlay-strength-value");
  const backgroundBlurValue = document.getElementById("background-blur-value");

  const state = {
    aspect: "landscape",
    audioUrl: "",
    backgroundImageUrl: "",
    backgroundVideoUrl: "",
    backgroundImage: null,
    preset: "mesh",
    isRecording: false,
    isExporting: false,
    canvasVisible: true,
    renderFrame: 0,
  };

  const backgroundVideo = document.createElement("video");
  backgroundVideo.muted = true;
  backgroundVideo.loop = true;
  backgroundVideo.playsInline = true;
  backgroundVideo.preload = "auto";

  let audioContext;
  let analyser;
  let sourceNode;
  let recordingDestination;
  let frequencyData;
  let waveformData;
  let recorder;
  let recorderChunks = [];
  let recorderChunkCount = 0;
  let exportProgressFrame = 0;
  let trimStopWatcher = 0;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function updateOutputValues() {
    barCountValue.textContent = barCount.value;
    intensityValue.textContent = Number(intensity.value).toFixed(1);
    smoothingValue.textContent = Number(smoothing.value).toFixed(2);
    trackCardOffsetXValue.textContent = `${trackCardOffsetX.value}%`;
    trackCardOffsetYValue.textContent = `${trackCardOffsetY.value}%`;
    trackCardScaleValue.textContent = `${trackCardScale.value}%`;
    extraOffsetXValue.textContent = `${extraOffsetX.value}%`;
    extraOffsetYValue.textContent = `${extraOffsetY.value}%`;
    extraScaleValue.textContent = `${extraScale.value}%`;
    visualizerOffsetXValue.textContent = `${visualizerOffsetX.value}%`;
    visualizerOffsetYValue.textContent = `${visualizerOffsetY.value}%`;
    visualizerScaleValue.textContent = `${visualizerScale.value}%`;
    visualizerCurveValue.textContent = `${visualizerCurve.value}%`;
    overlayStrengthValue.textContent = Number(overlayStrength.value).toFixed(2);
    backgroundBlurValue.textContent = `${backgroundBlur.value}px`;
    particleIntensityValue.textContent = `${particleIntensity.value}%`;
  }

  function ensureAudioGraph() {
    if (audioContext) {
      analyser.smoothingTimeConstant = Number(smoothing.value);
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextClass();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.minDecibels = -92;
    analyser.maxDecibels = -18;
    analyser.smoothingTimeConstant = Number(smoothing.value);

    sourceNode = audioContext.createMediaElementSource(audioPlayer);
    recordingDestination = audioContext.createMediaStreamDestination();

    sourceNode.connect(analyser);
    analyser.connect(audioContext.destination);
    analyser.connect(recordingDestination);

    frequencyData = new Uint8Array(analyser.frequencyBinCount);
    waveformData = new Uint8Array(analyser.fftSize);
  }

  function revokeUrl(key) {
    if (state[key]) {
      URL.revokeObjectURL(state[key]);
      state[key] = "";
    }
  }

  function safeName(value, fallback) {
    const normalized = (value || fallback)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);

    return normalized || fallback;
  }

  function waitForEvent(target, eventName, timeoutMs = MEDIA_EVENT_TIMEOUT) {
    return new Promise((resolve) => {
      let isSettled = false;

      const cleanup = () => {
        clearTimeout(timeoutId);
        target.removeEventListener(eventName, handleEvent);
      };

      const handleEvent = () => {
        if (isSettled) return;
        isSettled = true;
        cleanup();
        resolve(true);
      };

      const timeoutId = window.setTimeout(() => {
        if (isSettled) return;
        isSettled = true;
        cleanup();
        resolve(false);
      }, timeoutMs);

      target.addEventListener(eventName, handleEvent, { once: true });
    });
  }

  function waitForAnimationFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  function aspectConfig() {
    return ASPECT_PRESETS[state.aspect];
  }

  function getExportDimensions() {
    const quality = QUALITY_PRESETS[exportQuality.value] || QUALITY_PRESETS[1080];
    const shortSide = quality.short;
    if (state.aspect === "portrait") {
      const w = Math.round(shortSide);
      const h = Math.round(w * (16 / 9));
      return { width: w, height: h, bitrate: quality.bitrate };
    }
    const h = Math.round(shortSide);
    const w = Math.round(h * (16 / 9));
    return { width: w, height: h, bitrate: quality.bitrate };
  }

  function applyAspectToCanvas() {
    const config = aspectConfig();
    if (canvas.width !== config.previewWidth || canvas.height !== config.previewHeight) {
      canvas.width = config.previewWidth;
      canvas.height = config.previewHeight;
    }
    stagePreviews.dataset.aspect = state.aspect;
    stageMeta.textContent = config.meta;
  }

  function setExportCanvasSize() {
    const dims = getExportDimensions();
    if (canvas.width !== dims.width || canvas.height !== dims.height) {
      canvas.width = dims.width;
      canvas.height = dims.height;
    }
  }

  function updateDownloadButtonLabel() {
    const quality = QUALITY_PRESETS[exportQuality.value] || QUALITY_PRESETS[1080];
    downloadButtonLabel.textContent = `Download ${aspectConfig().label} · ${quality.short}p`;
  }

  function setAspect(nextAspect, options) {
    if (!ASPECT_PRESETS[nextAspect]) return;
    state.aspect = nextAspect;
    applyAspectToCanvas();
    aspectToggleButtons.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.aspectToggle === nextAspect);
    });
    updateDownloadButtonLabel();
    if (options && options.persist) {
      try {
        localStorage.setItem(ASPECT_STORAGE_KEY, nextAspect);
      } catch (error) {
        // ignore storage errors
      }
    }
  }

  function showAspectModal() {
    aspectModal.hidden = false;
  }

  function hideAspectModal() {
    aspectModal.hidden = true;
  }

  function getOutputExtension(mimeType) {
    return mimeType.includes("mp4") ? "mp4" : "webm";
  }

  function getOutputFileName(extension) {
    return `${safeName(trackTitle.value, "music-visualizer")}-${aspectConfig().label.replace(":", "x")}.${extension}`;
  }

  async function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.rel = "noopener";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function ensureMediaMetadata(media) {
    if (media.readyState >= 1) return true;
    return waitForEvent(media, "loadedmetadata");
  }

  async function ensureMediaFrame(media) {
    if (media.readyState >= 2) return true;
    return waitForEvent(media, "loadeddata");
  }

  async function seekMedia(media, targetTime) {
    await ensureMediaMetadata(media);
    const duration = Number.isFinite(media.duration) && media.duration > 0 ? media.duration : 0;
    const clampedTime = duration > 0 ? clamp(targetTime, 0, Math.max(0, duration - 0.01)) : 0;

    if (Math.abs(media.currentTime - clampedTime) <= 0.02) {
      media.currentTime = clampedTime;
      return true;
    }

    const seekPromise = waitForEvent(media, "seeked");
    media.currentTime = clampedTime;
    const didSeek = await seekPromise;
    if (didSeek) return true;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await waitForAnimationFrame();
      if (Math.abs(media.currentTime - clampedTime) <= 0.05) return true;
    }
    return false;
  }

  function isVideoBackgroundActive() {
    return backgroundSource.value === "video" && Boolean(backgroundVideo.src);
  }

  function hideExportProgress() {
    exportProgress.hidden = true;
    exportProgressFill.style.width = "0%";
  }

  function updateExportProgress(progress, label) {
    const safeProgress = clamp(progress, 0, 1);
    exportProgress.hidden = false;
    exportProgressLabel.textContent = label;
    exportProgressValue.textContent = `${Math.round(safeProgress * 100)}%`;
    exportProgressFill.style.width = `${safeProgress * 100}%`;
  }

  function stopExportProgressLoop() {
    if (exportProgressFrame) {
      cancelAnimationFrame(exportProgressFrame);
      exportProgressFrame = 0;
    }
  }

  function resetExportUi() {
    stopExportProgressLoop();
    downloadButton.disabled = false;
    audioPlayer.controls = true;
    state.isExporting = false;
    applyAspectToCanvas();
  }

  function formatDuration(seconds) {
    const totalSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(totalSeconds / 60);
    const remainder = totalSeconds % 60;
    return `${minutes}:${String(remainder).padStart(2, "0")}`;
  }

  function startExportProgressLoop(trimStartSec, trimEndSec) {
    stopExportProgressLoop();
    const span = Math.max(0.1, trimEndSec - trimStartSec);

    const step = () => {
      if (!state.isRecording) return;
      const current = clamp(audioPlayer.currentTime, trimStartSec, trimEndSec);
      const elapsed = current - trimStartSec;
      updateExportProgress(
        elapsed / span,
        `Exporting ${aspectConfig().label} ${formatDuration(elapsed)} / ${formatDuration(span)}`
      );
      exportProgressFrame = requestAnimationFrame(step);
    };

    step();
  }

  function setStatus(message, isError) {
    recordingStatus.hidden = !message;
    recordingStatus.textContent = message;
    recordingStatus.style.color = isError ? "var(--danger)" : "var(--ink-3)";
  }

  function syncBackgroundUi() {
    const source = backgroundSource.value;
    presetPicker.hidden = source !== "preset";
    imageUploadGroup.hidden = source !== "image";
    videoUploadGroup.hidden = source !== "video";
  }

  function updatePresetButtons() {
    presetPicker.querySelectorAll(".mv-preset").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.preset === state.preset);
    });
  }

  function syncVisualizerControlsVisibility() {
    const off = visualizerStyle.value === "off";
    document.querySelectorAll("[data-visualizer-control]").forEach((el) => {
      el.hidden = off;
    });
  }

  function loadAudio(file) {
    revokeUrl("audioUrl");
    state.audioUrl = URL.createObjectURL(file);
    audioPlayer.src = state.audioUrl;
    audioFileName.textContent = file.name;
    if (!trackTitle.value.trim()) {
      trackTitle.value = file.name.replace(/\.[^/.]+$/, "");
    }
    ensureAudioGraph();
    setStatus("", false);
    resetTrimRange();
  }

  function loadBackgroundImage(file) {
    revokeUrl("backgroundImageUrl");
    state.backgroundImageUrl = URL.createObjectURL(file);
    state.backgroundImage = new Image();
    state.backgroundImage.src = state.backgroundImageUrl;
    backgroundImageName.textContent = file.name;
  }

  function loadBackgroundVideo(file) {
    revokeUrl("backgroundVideoUrl");
    state.backgroundVideoUrl = URL.createObjectURL(file);
    backgroundSource.value = "video";
    syncBackgroundUi();
    backgroundVideo.pause();
    backgroundVideo.src = state.backgroundVideoUrl;
    backgroundVideo.load();
    backgroundVideoName.textContent = file.name;

    const syncVideoFrame = () => {
      if (audioPlayer.src && !audioPlayer.paused) {
        backgroundVideo.currentTime =
          audioPlayer.currentTime % Math.max(1, backgroundVideo.duration || 1);
        backgroundVideo.play().catch(() => {});
        return;
      }
      backgroundVideo.currentTime = 0;
      const playPromise = backgroundVideo.play();
      if (playPromise && typeof playPromise.then === "function") {
        playPromise
          .then(() => {
            backgroundVideo.pause();
            backgroundVideo.currentTime = 0;
          })
          .catch(() => backgroundVideo.pause());
      }
    };

    if (backgroundVideo.readyState >= 2) {
      syncVideoFrame();
      return;
    }
    backgroundVideo.addEventListener("loadeddata", syncVideoFrame, { once: true });
  }

  function getAverageEnergy() {
    if (!analyser) return 0;
    let total = 0;
    const sampleCount = Math.min(64, frequencyData.length);
    for (let index = 0; index < sampleCount; index += 1) total += frequencyData[index];
    return total / sampleCount / 255;
  }

  function getBassEnergy() {
    if (!analyser) return 0;
    let total = 0;
    const sampleCount = Math.min(12, frequencyData.length);
    for (let index = 0; index < sampleCount; index += 1) total += frequencyData[index];
    return total / sampleCount / 255;
  }

  function drawPresetBackground(preset, time, energy) {
    const width = canvas.width;
    const height = canvas.height;

    if (preset === "noir") {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#0a0a0a");
      grad.addColorStop(1, "#1a1a1a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      const glow = ctx.createRadialGradient(
        width * 0.5,
        height * 1.05,
        height * 0.1,
        width * 0.5,
        height * 1.05,
        height * 0.95
      );
      glow.addColorStop(0, `rgba(255,255,255,${0.05 + energy * 0.05})`);
      glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
      return;
    }

    if (preset === "pastel") {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#fff3ef");
      grad.addColorStop(1, "#f0eaff");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      drawSoftBlob(width * 0.3, height * 0.35, height * 0.55, "rgba(255,200,211,0.55)");
      drawSoftBlob(
        width * (0.7 + Math.sin(time * 0.00015) * 0.04),
        height * (0.65 + Math.cos(time * 0.00012) * 0.04),
        height * 0.55,
        "rgba(200,216,255,0.5)"
      );
      return;
    }

    if (preset === "chrome") {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#d8d8df");
      grad.addColorStop(0.25, "#f4f4f6");
      grad.addColorStop(0.5, "#b8c4d6");
      grad.addColorStop(0.75, "#ecdef3");
      grad.addColorStop(1, "#c8d8e8");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      const shine = ctx.createLinearGradient(0, height * 0.3, width, height * 0.7);
      const shimmer = (Math.sin(time * 0.0006) + 1) / 2;
      shine.addColorStop(0, "rgba(255,255,255,0)");
      shine.addColorStop(0.5, `rgba(255,255,255,${0.15 + shimmer * 0.15})`);
      shine.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = shine;
      ctx.fillRect(0, 0, width, height);
      return;
    }

    if (preset === "sage") {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#e8f0e6");
      grad.addColorStop(1, "#c8d6c0");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      drawSoftBlob(width * 0.7, height * 0.25, height * 0.45, "rgba(255,255,255,0.55)");
      drawSoftBlob(
        width * 0.2,
        height * 0.85 + Math.sin(time * 0.0005) * 20,
        height * 0.4,
        "rgba(160,180,150,0.4)"
      );
      return;
    }

    if (preset === "dusk") {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#2a1a3a");
      grad.addColorStop(0.55, "#6a3a5a");
      grad.addColorStop(1, "#ee9b7a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      drawSoftBlob(
        width * 0.78,
        height * 0.78,
        height * 0.5 + energy * 80,
        "rgba(255,200,160,0.55)"
      );
      return;
    }

    if (preset === "onyx") {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#000000");
      grad.addColorStop(0.5, "#141416");
      grad.addColorStop(1, "#000000");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      const vignette = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        Math.min(width, height) * 0.2,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.7
      );
      vignette.addColorStop(0, `rgba(255,255,255,${0.05 + energy * 0.05})`);
      vignette.addColorStop(1, "rgba(0,0,0,0.6)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
      return;
    }

    if (preset === "gold") {
      const grad = ctx.createLinearGradient(0, height, width, 0);
      grad.addColorStop(0, "#1a1108");
      grad.addColorStop(0.35, "#8a5c20");
      grad.addColorStop(0.65, "#e0b465");
      grad.addColorStop(0.9, "#fbe7a0");
      grad.addColorStop(1, "#fff4cc");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      const shimmerX = width * (0.55 + Math.sin(time * 0.0004) * 0.1);
      const shimmerY = height * (0.3 + Math.cos(time * 0.0003) * 0.1);
      const shimmer = ctx.createRadialGradient(shimmerX, shimmerY, 0, shimmerX, shimmerY, Math.max(width, height) * 0.55);
      shimmer.addColorStop(0, `rgba(255, 240, 200, ${0.35 + energy * 0.15})`);
      shimmer.addColorStop(1, "rgba(255, 240, 200, 0)");
      ctx.fillStyle = shimmer;
      ctx.fillRect(0, 0, width, height);
      return;
    }

    if (preset === "silver") {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#2a2d33");
      grad.addColorStop(0.4, "#8a929c");
      grad.addColorStop(0.7, "#e0e4ea");
      grad.addColorStop(1, "#c4cad2");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      const sweepAngle = time * 0.0004;
      const sweepX = Math.cos(sweepAngle) * width * 0.5;
      const sheen = ctx.createLinearGradient(width * 0.5 - sweepX, 0, width * 0.5 + sweepX, height);
      sheen.addColorStop(0, "rgba(255,255,255,0)");
      sheen.addColorStop(0.5, `rgba(255,255,255,${0.25 + energy * 0.15})`);
      sheen.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sheen;
      ctx.fillRect(0, 0, width, height);
      return;
    }

    if (preset === "vapor") {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, "#2a1840");
      grad.addColorStop(0.4, "#7a2a8a");
      grad.addColorStop(0.75, "#e85aae");
      grad.addColorStop(1, "#ffb37a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = `rgba(255, 90, 170, ${0.25 + energy * 0.18})`;
      ctx.lineWidth = 1;
      const horizonY = height * 0.7;
      for (let row = 0; row < 12; row += 1) {
        const t = row / 11;
        const y = horizonY + Math.pow(t, 1.6) * (height - horizonY);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      for (let col = -6; col <= 6; col += 1) {
        ctx.beginPath();
        ctx.moveTo(width / 2 + col * width * 0.08, horizonY);
        ctx.lineTo(width / 2 + col * width * 0.8, height);
        ctx.stroke();
      }
      return;
    }

    if (preset === "ocean") {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, "#021024");
      grad.addColorStop(0.5, "#052a52");
      grad.addColorStop(0.85, "#0a5680");
      grad.addColorStop(1, "#6ec6df");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = `rgba(180, 230, 255, ${0.12 + energy * 0.08})`;
      ctx.lineWidth = 1.2;
      for (let band = 0; band < 6; band += 1) {
        const baseY = height * (0.55 + band * 0.08);
        const phase = time * 0.0005 + band;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 12) {
          const y = baseY + Math.sin(x * 0.01 + phase) * 4;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      return;
    }

    if (preset === "crimson") {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#1a0408");
      grad.addColorStop(0.45, "#560a16");
      grad.addColorStop(0.8, "#a8202e");
      grad.addColorStop(1, "#e84a5a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      drawSoftBlob(
        width * 0.3 + Math.sin(time * 0.0003) * width * 0.05,
        height * 0.6,
        height * 0.55 + energy * 80,
        "rgba(255,80,90,0.4)"
      );
      return;
    }

    // mesh (default)
    const base = ctx.createLinearGradient(0, 0, width, height);
    base.addColorStop(0, "#f6e8ff");
    base.addColorStop(1, "#eaf6ff");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    const driftX = Math.sin(time * 0.0002) * width * 0.04;
    const driftY = Math.cos(time * 0.00018) * height * 0.04;

    drawSoftBlob(width * 0.2 + driftX, height * 0.25 + driftY, height * 0.6, "rgba(255,141,161,0.65)");
    drawSoftBlob(
      width * 0.78 - driftX,
      height * 0.3 - driftY,
      height * 0.55,
      "rgba(138,180,255,0.55)"
    );
    drawSoftBlob(
      width * 0.55 + driftX * 0.6,
      height * 0.8 + driftY * 0.6,
      height * 0.55,
      "rgba(249,196,107,0.5)"
    );
  }

  function drawSoftBlob(x, y, radius, color) {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, color);
    grad.addColorStop(1, color.replace(/,[^,]+\)$/, ",0)"));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawBackground(time, energy) {
    ctx.save();
    const blurValue = state.isExporting ? Math.min(Number(backgroundBlur.value), 8) : Number(backgroundBlur.value);
    ctx.filter = blurValue > 0 ? `blur(${blurValue}px)` : "none";

    if (backgroundSource.value === "image" && state.backgroundImage && state.backgroundImage.complete) {
      drawMediaCover(state.backgroundImage);
    } else if (backgroundSource.value === "video" && backgroundVideo.readyState >= 2) {
      drawMediaCover(backgroundVideo);
    } else {
      drawPresetBackground(state.preset, time, energy);
    }

    ctx.restore();

    const overlayOpacity = Number(overlayStrength.value);
    if (overlayOpacity > 0) {
      const overlay = ctx.createLinearGradient(0, 0, 0, canvas.height);
      overlay.addColorStop(0, `rgba(5, 5, 8, ${Math.min(0.75, overlayOpacity + 0.1)})`);
      overlay.addColorStop(0.5, `rgba(5, 5, 8, ${overlayOpacity * 0.7})`);
      overlay.addColorStop(1, `rgba(5, 5, 8, ${Math.min(0.9, overlayOpacity + 0.25)})`);
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  function drawMediaCover(media) {
    const canvasRatio = canvas.width / canvas.height;
    const mediaRatio = media.videoWidth
      ? media.videoWidth / media.videoHeight
      : media.width / media.height;

    let drawWidth = canvas.width;
    let drawHeight = canvas.height;
    let offsetX = 0;
    let offsetY = 0;

    if (mediaRatio > canvasRatio) {
      drawHeight = canvas.height;
      drawWidth = drawHeight * mediaRatio;
      offsetX = (canvas.width - drawWidth) / 2;
    } else {
      drawWidth = canvas.width;
      drawHeight = drawWidth / mediaRatio;
      offsetY = (canvas.height - drawHeight) / 2;
    }

    ctx.drawImage(media, offsetX, offsetY, drawWidth, drawHeight);
  }

  function getCanvasScale() {
    return Math.min(canvas.width / 1280, canvas.height / 720);
  }

  function getVisualizerLayout() {
    const scale = Number(visualizerScale.value) / 100;
    const shiftX = (Number(visualizerOffsetX.value) / 100) * canvas.width * 0.5;
    const shiftY = (Number(visualizerOffsetY.value) / 100) * canvas.height * 0.5;
    return { scale, shiftX, shiftY };
  }

  function getCurveOffset(ratio, layout, strengthMultiplier) {
    const curve = Number(visualizerCurve.value) / 100;
    if (curve === 0) return 0;
    const normalized = ratio * 2 - 1;
    const shape = 1 - normalized * normalized;
    return -curve * canvas.height * 0.18 * layout.scale * shape * strengthMultiplier;
  }

  function getRadialCurveFactor() {
    return 1 + (Number(visualizerCurve.value) / 100) * 0.35;
  }

  function getFrequencySample(ratio) {
    if (!analyser || !frequencyData || frequencyData.length === 0) {
      return 0.18 + Math.sin(ratio * Math.PI * 8) * 0.04;
    }
    const sampleIndex = clamp(Math.floor(ratio * frequencyData.length), 0, frequencyData.length - 1);
    return frequencyData[sampleIndex] / 255;
  }

  function getWaveformSample(ratio, time) {
    if (!analyser || !waveformData || waveformData.length === 0) {
      return Math.sin(time * 0.002 + ratio * Math.PI * 4) * 0.12;
    }
    const sampleIndex = clamp(Math.floor(ratio * waveformData.length), 0, waveformData.length - 1);
    return (waveformData[sampleIndex] - 128) / 128;
  }

  function getMirroredBarProfile(index, bars) {
    if (bars <= 1) return { ratio: 0.5, mirroredRatio: 0, centerWeight: 1 };
    const ratio = index / (bars - 1);
    const mirroredRatio = Math.abs(ratio - 0.5) / 0.5;
    const centerWeight = Math.max(0, 1 - mirroredRatio);
    return { ratio, mirroredRatio, centerWeight };
  }

  function drawRoundedBars(energy, layout) {
    const bars = Number(barCount.value);
    const usableWidth = canvas.width * 0.78 * layout.scale;
    const startX = (canvas.width - usableWidth) / 2 + layout.shiftX;
    const cellWidth = usableWidth / bars;
    const floorY = canvas.height * 0.74 + layout.shiftY;
    const maxHeight = canvas.height * (0.3 + energy * 0.1) * Number(intensity.value) * layout.scale;
    const barWidth = Math.max(3, cellWidth * 0.55);
    const radius = barWidth / 2;

    ctx.save();
    ctx.fillStyle = accentColor.value;

    for (let index = 0; index < bars; index += 1) {
      const { ratio, mirroredRatio, centerWeight } = getMirroredBarProfile(index, bars);
      const sample = analyser ? getFrequencySample(mirroredRatio) : 0.1;
      const shaped = sample * (0.2 + centerWeight * 0.8);
      const h = Math.max(barWidth, 6 + shaped * maxHeight);
      const x = startX + index * cellWidth + (cellWidth - barWidth) / 2;
      const y = floorY + getCurveOffset(ratio, layout, 0.8) - h;
      ctx.globalAlpha = 0.5 + shaped * 0.5;
      roundedRect(x, y, barWidth, h, radius);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawReflectiveBars(energy, layout) {
    const bars = Number(barCount.value);
    const usableWidth = canvas.width * 0.78 * layout.scale;
    const startX = (canvas.width - usableWidth) / 2 + layout.shiftX;
    const cellWidth = usableWidth / bars;
    const floorY = canvas.height * 0.58 + layout.shiftY;
    const maxHeight = canvas.height * (0.24 + energy * 0.1) * Number(intensity.value) * layout.scale;
    const barWidth = Math.max(3, cellWidth * 0.55);
    const radius = barWidth / 2;

    ctx.save();
    ctx.fillStyle = accentColor.value;

    for (let index = 0; index < bars; index += 1) {
      const { ratio, mirroredRatio, centerWeight } = getMirroredBarProfile(index, bars);
      const sample = analyser ? getFrequencySample(mirroredRatio) : 0.1;
      const shaped = sample * (0.2 + centerWeight * 0.8);
      const h = Math.max(barWidth, 6 + shaped * maxHeight);
      const x = startX + index * cellWidth + (cellWidth - barWidth) / 2;
      const y = floorY + getCurveOffset(ratio, layout, 0.6) - h;

      ctx.globalAlpha = 0.6 + shaped * 0.4;
      roundedRect(x, y, barWidth, h, radius);
      ctx.fill();

      ctx.globalAlpha = (0.2 + shaped * 0.18) * 0.6;
      roundedRect(x, floorY + getCurveOffset(ratio, layout, 0.6) + 6, barWidth, h * 0.6, radius);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawDotSpectrum(energy, layout) {
    const dots = Math.min(Number(barCount.value), 72);
    const spectrumWidth = canvas.width * 0.78 * layout.scale;
    const startX = (canvas.width - spectrumWidth) / 2 + layout.shiftX;
    const baseY = canvas.height * 0.62 + layout.shiftY;
    const maxRise = canvas.height * (0.18 + energy * 0.08) * Number(intensity.value) * layout.scale;
    const gap = spectrumWidth / Math.max(1, dots - 1);

    ctx.save();
    ctx.fillStyle = accentColor.value;
    for (let index = 0; index < dots; index += 1) {
      const ratio = dots === 1 ? 0 : index / (dots - 1);
      const sample = getFrequencySample(ratio);
      const radius = Math.max(2, (2.5 + sample * 8) * layout.scale);
      const x = startX + gap * index;
      const y = baseY + getCurveOffset(ratio, layout, 0.8) - sample * maxRise;
      ctx.globalAlpha = 0.45 + sample * 0.55;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawLiquidWave(time, layout) {
    const waveWidth = canvas.width * 0.92 * layout.scale;
    const startX = (canvas.width - waveWidth) / 2 + layout.shiftX;
    const centerY = canvas.height * 0.6 + layout.shiftY;
    const amplitude = 110 * Number(intensity.value) * layout.scale;
    const totalPoints = 96;

    ctx.save();

    const fill = ctx.createLinearGradient(0, centerY - amplitude, 0, canvas.height);
    const accent = hexToRgba(accentColor.value, 0.5);
    const accentSoft = hexToRgba(accentColor.value, 0);
    fill.addColorStop(0, accent);
    fill.addColorStop(1, accentSoft);
    ctx.fillStyle = fill;

    ctx.beginPath();
    ctx.moveTo(startX, canvas.height);
    for (let point = 0; point <= totalPoints; point += 1) {
      const ratio = point / totalPoints;
      const x = startX + ratio * waveWidth;
      const sample = getWaveformSample(ratio, time);
      const freq = getFrequencySample(ratio);
      const y = centerY + getCurveOffset(ratio, layout, 0.6) + sample * amplitude * 0.6 - freq * amplitude * 0.5;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(startX + waveWidth, canvas.height);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = accentColor.value;
    ctx.lineWidth = Math.max(1.5, 2 * layout.scale);
    ctx.beginPath();
    for (let point = 0; point <= totalPoints; point += 1) {
      const ratio = point / totalPoints;
      const x = startX + ratio * waveWidth;
      const sample = getWaveformSample(ratio, time);
      const freq = getFrequencySample(ratio);
      const y = centerY + getCurveOffset(ratio, layout, 0.6) + sample * amplitude * 0.6 - freq * amplitude * 0.5;
      if (point === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawAuroraBands(time, energy, layout) {
    const bandCount = 5;
    const waveWidth = canvas.width * 0.96 * Math.max(0.5, layout.scale);
    const startX = (canvas.width - waveWidth) / 2 + layout.shiftX;
    const centerY = canvas.height * 0.5 + layout.shiftY;
    const totalPoints = 80;
    const amplitudeBase = canvas.height * 0.08 * Number(intensity.value) * layout.scale;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (let band = 0; band < bandCount; band += 1) {
      const bandOffset = (band - (bandCount - 1) / 2) * canvas.height * 0.06 * Math.max(0.6, layout.scale);
      const phase = time * (0.00025 + band * 0.00008);
      const bandAlpha = 0.16 + energy * 0.1 + band * 0.02;

      const grad = ctx.createLinearGradient(0, centerY - amplitudeBase * 2, 0, centerY + amplitudeBase * 2);
      grad.addColorStop(0, hexToRgba(accentColor.value, 0));
      grad.addColorStop(0.5, hexToRgba(accentColor.value, bandAlpha));
      grad.addColorStop(1, hexToRgba(accentColor.value, 0));
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.moveTo(startX, centerY + bandOffset);
      for (let point = 0; point <= totalPoints; point += 1) {
        const ratio = point / totalPoints;
        const x = startX + ratio * waveWidth;
        const sample = getFrequencySample(ratio);
        const y =
          centerY +
          bandOffset +
          getCurveOffset(ratio, layout, 0.4) +
          Math.sin(ratio * Math.PI * 3 + phase + band) * amplitudeBase * (1 + sample * 1.4) -
          amplitudeBase * 0.6;
        ctx.lineTo(x, y);
      }
      for (let point = totalPoints; point >= 0; point -= 1) {
        const ratio = point / totalPoints;
        const x = startX + ratio * waveWidth;
        const sample = getFrequencySample(ratio);
        const y =
          centerY +
          bandOffset +
          getCurveOffset(ratio, layout, 0.4) +
          Math.sin(ratio * Math.PI * 3 + phase + band) * amplitudeBase * (1 + sample * 1.4) +
          amplitudeBase * 0.6;
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSpectrumHills(energy, layout) {
    const points = Math.max(60, Math.min(Number(barCount.value) * 2, 200));
    const waveWidth = canvas.width * 0.96 * Math.max(0.5, layout.scale);
    const startX = (canvas.width - waveWidth) / 2 + layout.shiftX;
    const baseline = canvas.height * 0.78 + layout.shiftY;
    const peakHeight = canvas.height * (0.34 + energy * 0.1) * Number(intensity.value) * layout.scale;

    const samples = new Array(points);
    for (let i = 0; i < points; i += 1) {
      const ratio = i / (points - 1);
      const mirrored = Math.abs(ratio - 0.5) / 0.5;
      const sample = analyser ? getFrequencySample(mirrored) : 0.1 + Math.sin(i * 0.2) * 0.04;
      const centerWeight = Math.max(0.1, 1 - mirrored * 0.7);
      samples[i] = sample * centerWeight;
    }

    ctx.save();

    const fillGrad = ctx.createLinearGradient(0, baseline - peakHeight, 0, baseline);
    fillGrad.addColorStop(0, hexToRgba(accentColor.value, 0.7));
    fillGrad.addColorStop(1, hexToRgba(accentColor.value, 0.05));
    ctx.fillStyle = fillGrad;

    ctx.beginPath();
    ctx.moveTo(startX, baseline);
    for (let i = 0; i < points; i += 1) {
      const x = startX + (i / (points - 1)) * waveWidth;
      const y = baseline + getCurveOffset(i / (points - 1), layout, 0.5) - samples[i] * peakHeight;
      if (i === 0) ctx.lineTo(x, y);
      else {
        const prevX = startX + ((i - 1) / (points - 1)) * waveWidth;
        const prevY = baseline + getCurveOffset((i - 1) / (points - 1), layout, 0.5) - samples[i - 1] * peakHeight;
        const midX = (prevX + x) / 2;
        const midY = (prevY + y) / 2;
        ctx.quadraticCurveTo(prevX, prevY, midX, midY);
      }
    }
    ctx.lineTo(startX + waveWidth, baseline);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = accentColor.value;
    ctx.lineWidth = Math.max(1.5, 2 * layout.scale);
    ctx.beginPath();
    for (let i = 0; i < points; i += 1) {
      const x = startX + (i / (points - 1)) * waveWidth;
      const y = baseline + getCurveOffset(i / (points - 1), layout, 0.5) - samples[i] * peakHeight;
      if (i === 0) ctx.moveTo(x, y);
      else {
        const prevX = startX + ((i - 1) / (points - 1)) * waveWidth;
        const prevY = baseline + getCurveOffset((i - 1) / (points - 1), layout, 0.5) - samples[i - 1] * peakHeight;
        const midX = (prevX + x) / 2;
        const midY = (prevY + y) / 2;
        ctx.quadraticCurveTo(prevX, prevY, midX, midY);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  const ripples = [];
  let lastRippleSpawn = 0;

  function drawFrequencyRings(time, energy, layout) {
    const centerX = canvas.width / 2 + layout.shiftX;
    const centerY = canvas.height / 2 + layout.shiftY;
    const bass = getBassEnergy();
    const reach = Math.max(canvas.width, canvas.height) * 0.55;
    const lifeSpan = 1800;

    if (bass > 0.45 && time - lastRippleSpawn > 160) {
      ripples.push({ birth: time, intensity: bass });
      lastRippleSpawn = time;
      if (ripples.length > 18) ripples.shift();
    }

    ctx.save();
    ctx.strokeStyle = accentColor.value;

    for (let i = ripples.length - 1; i >= 0; i -= 1) {
      const r = ripples[i];
      const age = time - r.birth;
      if (age > lifeSpan) {
        ripples.splice(i, 1);
        continue;
      }
      const t = age / lifeSpan;
      const radius = r.intensity * reach * Number(intensity.value) * t * layout.scale;
      ctx.globalAlpha = (1 - t) * (0.4 + r.intensity * 0.5);
      ctx.lineWidth = Math.max(1, (1.5 + (1 - t) * 3) * layout.scale);
      ctx.beginPath();
      ctx.arc(centerX, centerY, Math.max(1, radius), 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.5 + bass * 0.4;
    ctx.fillStyle = hexToRgba(accentColor.value, 0.18 + bass * 0.3);
    ctx.beginPath();
    ctx.arc(centerX, centerY, (10 + bass * 24) * layout.scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.fillStyle = accentColor.value;
    ctx.beginPath();
    ctx.arc(centerX, centerY, (4 + bass * 8) * layout.scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawBloomLine(time, energy, layout) {
    const waveWidth = canvas.width * 0.82 * layout.scale;
    const startX = (canvas.width - waveWidth) / 2 + layout.shiftX;
    const centerY = canvas.height * 0.58 + layout.shiftY;
    const amplitude = 22 * Number(intensity.value) * layout.scale;
    const totalPoints = 160;
    const bass = getBassEnergy();

    ctx.save();
    // bloom
    const bloom = ctx.createRadialGradient(canvas.width / 2 + layout.shiftX, centerY, 0, canvas.width / 2 + layout.shiftX, centerY, 300 * layout.scale);
    bloom.addColorStop(0, hexToRgba(accentColor.value, 0.25 + bass * 0.3));
    bloom.addColorStop(1, hexToRgba(accentColor.value, 0));
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = accentColor.value;
    ctx.lineWidth = Math.max(1.5, (2 + bass * 4) * layout.scale);
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let point = 0; point < totalPoints; point += 1) {
      const ratio = point / (totalPoints - 1);
      const x = startX + ratio * waveWidth;
      const sample = getWaveformSample(ratio, time);
      const y = centerY + getCurveOffset(ratio, layout, 0.6) + sample * amplitude;
      if (point === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawVisualizer(time, energy) {
    const style = visualizerStyle.value;
    if (style === "off") return;

    if (analyser) {
      analyser.smoothingTimeConstant = Number(smoothing.value);
      analyser.getByteFrequencyData(frequencyData);
      analyser.getByteTimeDomainData(waveformData);
    }

    const layout = getVisualizerLayout();

    switch (style) {
      case "reflective-bars":  return drawReflectiveBars(energy, layout);
      case "dot-spectrum":     return drawDotSpectrum(energy, layout);
      case "liquid-wave":      return drawLiquidWave(time, layout);
      case "bloom-line":       return drawBloomLine(time, energy, layout);
      case "aurora-bands":     return drawAuroraBands(time, energy, layout);
      case "spectrum-hills":   return drawSpectrumHills(energy, layout);
      case "frequency-rings":  return drawFrequencyRings(time, energy, layout);
      case "rounded-bars":
      default:                 return drawRoundedBars(energy, layout);
    }
  }

  function drawParticles(time, energy) {
    const style = particleStyle.value;
    if (style === "off") return;
    const strength = Number(particleIntensity.value) / 100;
    if (strength <= 0) return;

    switch (style) {
      case "dust":      return drawDustParticles(time, strength);
      case "snow":      return drawSnowParticles(time, strength);
      case "embers":    return drawEmberParticles(time, strength, energy);
      case "bubbles":   return drawBubbleParticles(time, strength);
      case "confetti":  return drawConfettiParticles(time, strength);
      case "sparks":    return drawSparkParticles(time, strength, energy);
      case "rain":      return drawRainParticles(time, strength);
      case "grain":     return drawGrainOverlay(strength);
      case "glitch":    return drawGlitchOverlay(time, strength, energy);
      case "leaks":     return drawLightLeaks(time, strength, energy);
    }
  }

  const particleState = { style: null, items: [] };

  function ensureParticles(style, count, factory) {
    if (particleState.style !== style) {
      particleState.style = style;
      particleState.items.length = 0;
    }
    while (particleState.items.length < count) {
      particleState.items.push(factory());
    }
    if (particleState.items.length > count) particleState.items.length = count;
    return particleState.items;
  }

  function drawDustParticles(time, strength) {
    const width = canvas.width;
    const height = canvas.height;
    const count = Math.round(40 + strength * 160);
    const items = ensureParticles("dust", count, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.8 + 0.4,
      v: Math.random() * 0.3 + 0.05,
      a: Math.random() * 0.5 + 0.2,
      seed: Math.random() * 1000,
    }));

    ctx.save();
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < items.length; i += 1) {
      const p = items[i];
      p.y -= p.v * (1 + strength);
      p.x += Math.sin(time * 0.0005 + p.seed) * 0.2;
      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }
      ctx.globalAlpha = p.a * (0.3 + strength * 0.7);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (1 + strength * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSnowParticles(time, strength) {
    const width = canvas.width;
    const height = canvas.height;
    const count = Math.round(60 + strength * 180);
    const items = ensureParticles("snow", count, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2.4 + 0.8,
      v: Math.random() * 1.4 + 0.4,
      sway: Math.random() * 1.2 + 0.3,
      seed: Math.random() * 1000,
      a: Math.random() * 0.5 + 0.4,
    }));
    const wind = Math.sin(time * 0.00015) * 0.6;

    ctx.save();
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < items.length; i += 1) {
      const p = items[i];
      p.y += p.v * (0.6 + strength * 1.4);
      p.x += Math.sin(time * 0.0008 + p.seed) * p.sway + wind;
      if (p.y > height + 6) {
        p.y = -6;
        p.x = Math.random() * width;
      }
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;
      ctx.globalAlpha = p.a * (0.5 + strength * 0.5);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawEmberParticles(time, strength, energy) {
    const width = canvas.width;
    const height = canvas.height;
    const count = Math.round(50 + strength * 200);
    const items = ensureParticles("embers", count, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.8 + 0.4,
      v: Math.random() * 1.6 + 0.3,
      sway: Math.random() * 0.8 + 0.2,
      seed: Math.random() * 1000,
      hue: 18 + Math.random() * 30,
      life: Math.random(),
    }));

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < items.length; i += 1) {
      const p = items[i];
      p.y -= p.v * (0.8 + strength * 1.6 + energy * 0.4);
      p.x += Math.sin(time * 0.001 + p.seed) * p.sway;
      p.life -= 0.005;
      if (p.y < -10 || p.life <= 0) {
        p.y = height + Math.random() * 30;
        p.x = Math.random() * width;
        p.life = 1;
      }
      const fade = Math.min(1, p.life * 1.4);
      const radius = p.r * (1 + strength * 0.6);
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 4);
      glow.addColorStop(0, `hsla(${p.hue}, 95%, 65%, ${0.6 * fade})`);
      glow.addColorStop(0.4, `hsla(${p.hue}, 95%, 50%, ${0.25 * fade})`);
      glow.addColorStop(1, `hsla(${p.hue}, 95%, 50%, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `hsla(${p.hue + 10}, 100%, 75%, ${fade})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBubbleParticles(time, strength) {
    const width = canvas.width;
    const height = canvas.height;
    const count = Math.round(20 + strength * 80);
    const items = ensureParticles("bubbles", count, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 18 + 4,
      v: Math.random() * 0.9 + 0.3,
      sway: Math.random() * 1.6 + 0.4,
      seed: Math.random() * 1000,
    }));

    ctx.save();
    for (let i = 0; i < items.length; i += 1) {
      const p = items[i];
      p.y -= p.v * (0.6 + strength * 1.2);
      p.x += Math.sin(time * 0.001 + p.seed) * p.sway * 0.3;
      if (p.y < -p.r * 2) {
        p.y = height + p.r;
        p.x = Math.random() * width;
      }
      const alpha = 0.18 + strength * 0.18;
      ctx.strokeStyle = `rgba(255,255,255,${alpha + 0.1})`;
      ctx.lineWidth = 1.2;
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.35})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = `rgba(255,255,255,${alpha + 0.25})`;
      ctx.beginPath();
      ctx.arc(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  const CONFETTI_COLORS = ["#ff6b9d", "#ffd166", "#4cc9f0", "#06d6a0", "#b388ff", "#ff7e5f"];

  function drawConfettiParticles(time, strength) {
    const width = canvas.width;
    const height = canvas.height;
    const count = Math.round(40 + strength * 160);
    const items = ensureParticles("confetti", count, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      w: Math.random() * 8 + 5,
      h: Math.random() * 4 + 2,
      vy: Math.random() * 2.4 + 0.8,
      vx: (Math.random() - 0.5) * 1.6,
      rotation: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.12,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    }));

    ctx.save();
    for (let i = 0; i < items.length; i += 1) {
      const p = items[i];
      p.y += p.vy * (0.6 + strength * 1.5);
      p.x += p.vx + Math.sin(time * 0.001 + i) * 0.3;
      p.rotation += p.vr;
      if (p.y > height + 12) {
        p.y = -12;
        p.x = Math.random() * width;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.7 + strength * 0.3;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawSparkParticles(time, strength, energy) {
    const width = canvas.width;
    const height = canvas.height;
    const count = Math.round(20 + strength * 80);
    const items = ensureParticles("sparks", count, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      life: Math.random(),
      hue: 200 + Math.random() * 40,
    }));

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < items.length; i += 1) {
      const p = items[i];
      p.x += p.vx * (0.6 + strength + energy * 0.4);
      p.y += p.vy * (0.6 + strength + energy * 0.4);
      p.life -= 0.015 + strength * 0.01;
      if (p.life <= 0 || p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
        p.x = width * 0.5 + (Math.random() - 0.5) * width * 0.5;
        p.y = height * 0.5 + (Math.random() - 0.5) * height * 0.5;
        p.vx = (Math.random() - 0.5) * 10;
        p.vy = (Math.random() - 0.5) * 10;
        p.life = 1;
        p.hue = 200 + Math.random() * 40;
      }
      const alpha = p.life * (0.5 + strength * 0.5);
      ctx.strokeStyle = `hsla(${p.hue}, 100%, 75%, ${alpha})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx, p.y - p.vy);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRainParticles(time, strength) {
    const width = canvas.width;
    const height = canvas.height;
    const count = Math.round(80 + strength * 320);
    const items = ensureParticles("rain", count, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      len: Math.random() * 14 + 8,
      v: Math.random() * 12 + 8,
      a: Math.random() * 0.4 + 0.3,
    }));
    const slant = 3;

    ctx.save();
    ctx.strokeStyle = `rgba(180, 210, 255, ${0.35 + strength * 0.35})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < items.length; i += 1) {
      const p = items[i];
      p.y += p.v * (0.8 + strength * 1.6);
      p.x += slant * 0.6;
      if (p.y > height + 10 || p.x > width + 10) {
        p.y = -p.len;
        p.x = Math.random() * width - 20;
      }
      ctx.globalAlpha = p.a;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - slant, p.y - p.len);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawGrainOverlay(strength) {
    const width = canvas.width;
    const height = canvas.height;
    const cell = 2;
    const density = 0.06 + strength * 0.18;
    const grainAlpha = 0.04 + strength * 0.18;

    ctx.save();
    ctx.fillStyle = `rgba(255,255,255,${grainAlpha})`;
    for (let i = 0; i < width * height * density / (cell * cell * 60); i += 1) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      ctx.fillRect(x, y, cell, cell);
    }
    ctx.fillStyle = `rgba(0,0,0,${grainAlpha})`;
    for (let i = 0; i < width * height * density / (cell * cell * 60); i += 1) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      ctx.fillRect(x, y, cell, cell);
    }
    ctx.restore();
  }

  function drawGlitchOverlay(time, strength, energy) {
    const width = canvas.width;
    const height = canvas.height;
    const triggerChance = 0.04 + strength * 0.12 + energy * 0.1;

    ctx.save();
    // soft scan lines
    ctx.fillStyle = `rgba(0,0,0,${0.04 + strength * 0.1})`;
    const lineGap = Math.max(3, Math.round(6 - strength * 4));
    for (let y = 0; y < height; y += lineGap) {
      ctx.fillRect(0, y, width, 1);
    }

    // occasional horizontal band offset
    if (Math.random() < triggerChance) {
      const bandY = Math.random() * height;
      const bandH = Math.random() * 60 + 10;
      const shift = (Math.random() - 0.5) * 60 * strength;
      try {
        ctx.drawImage(canvas, 0, bandY, width, bandH, shift, bandY, width, bandH);
      } catch (e) {
        // ignore drawImage cross-origin issues
      }
    }

    // chromatic ghost
    if (strength > 0.3) {
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = `rgba(255,40,80,${0.04 + strength * 0.08})`;
      ctx.fillRect(2 * strength, 0, width, height);
      ctx.fillStyle = `rgba(40,200,255,${0.04 + strength * 0.08})`;
      ctx.fillRect(-2 * strength, 0, width, height);
    }
    ctx.restore();
  }

  function drawLightLeaks(time, strength, energy) {
    const width = canvas.width;
    const height = canvas.height;
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    const a = 0.18 + strength * 0.35 + energy * 0.1;
    const leak1X = width * (0.2 + Math.sin(time * 0.0003) * 0.1);
    const leak1Y = height * (0.3 + Math.cos(time * 0.0002) * 0.1);
    const radius1 = width * (0.35 + strength * 0.2);

    const g1 = ctx.createRadialGradient(leak1X, leak1Y, 0, leak1X, leak1Y, radius1);
    g1.addColorStop(0, `rgba(255,180,120,${a})`);
    g1.addColorStop(1, "rgba(255,180,120,0)");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, width, height);

    const leak2X = width * (0.78 + Math.cos(time * 0.0004) * 0.08);
    const leak2Y = height * (0.7 + Math.sin(time * 0.00035) * 0.08);
    const radius2 = width * (0.32 + strength * 0.2);

    const g2 = ctx.createRadialGradient(leak2X, leak2Y, 0, leak2X, leak2Y, radius2);
    g2.addColorStop(0, `rgba(120,180,255,${a * 0.8})`);
    g2.addColorStop(1, "rgba(120,180,255,0)");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  }

  function hexToRgba(hex, alpha) {
    const normalized = hex.replace("#", "");
    const value = normalized.length === 3
      ? normalized.split("").map((c) => c + c).join("")
      : normalized;
    const r = parseInt(value.substring(0, 2), 16);
    const g = parseInt(value.substring(2, 4), 16);
    const b = parseInt(value.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function roundedRect(x, y, width, height, radius) {
    const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function getTextBlockLayout(offsetXValue, offsetYValue, blockWidth, blockHeight) {
    const margin = 24 * getCanvasScale();
    const normalizedX = (Number(offsetXValue) + 100) / 200;
    const normalizedY = (Number(offsetYValue) + 100) / 200;
    const availableX = Math.max(0, canvas.width - blockWidth - margin * 2);
    const availableY = Math.max(0, canvas.height - blockHeight - margin * 2);
    const x = margin + normalizedX * availableX;
    const y = margin + normalizedY * availableY;
    return { x, y };
  }

  function wrapTextLines(value, maxWidth) {
    const paragraphs = value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (paragraphs.length === 0) return [];
    const lines = [];

    paragraphs.forEach((paragraph) => {
      const words = paragraph.split(/\s+/).filter(Boolean);
      if (words.length === 0) return;
      let currentLine = words[0];
      for (let index = 1; index < words.length; index += 1) {
        const nextLine = `${currentLine} ${words[index]}`;
        if (ctx.measureText(nextLine).width <= maxWidth) {
          currentLine = nextLine;
        } else {
          lines.push(currentLine);
          currentLine = words[index];
        }
      }
      lines.push(currentLine);
    });
    return lines;
  }

  function drawWrappedLines(lines, x, startY, lineHeight) {
    lines.forEach((line, index) => {
      ctx.fillText(line, x, startY + index * lineHeight);
    });
  }

  function drawTextOverlay(options) {
    const title = options.title.trim();
    const text = options.text.trim();
    if (!title && !text) return;

    const scale = (Number(options.scaleControl.value) / 100) * getCanvasScale();
    const blockWidth = Math.min(options.maxWidth * scale, canvas.width - 48);
    const titleFontSize = title ? Math.max(22, options.titleFontSize * scale) : 0;
    const textFontSize = text ? Math.max(18, options.textFontSize * scale) : 0;
    const titleLineHeight = titleFontSize * 1.15;
    const textLineHeight = textFontSize * 1.3;
    const horizontalPadding = 36 * scale;
    const topPadding = 22 * scale;
    const bottomPadding = 18 * scale;
    const lineGap = title && text ? 18 * scale : 0;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    let titleLines = [];
    if (title) {
      ctx.font = `${titleFontSize}px Inter, sans-serif`;
      titleLines = wrapTextLines(title, blockWidth - horizontalPadding * 2);
    }

    let textLines = [];
    if (text) {
      ctx.font = `${textFontSize}px Inter, sans-serif`;
      textLines = wrapTextLines(text, blockWidth - horizontalPadding * 2);
    }

    const blockHeight =
      topPadding +
      titleLines.length * titleLineHeight +
      (titleLines.length && textLines.length ? lineGap : 0) +
      textLines.length * textLineHeight +
      bottomPadding;
    const layout = getTextBlockLayout(
      options.offsetXControl.value,
      options.offsetYControl.value,
      blockWidth,
      blockHeight
    );
    const centerX = layout.x + blockWidth / 2;
    let cursorY = layout.y + topPadding;

    if (titleLines.length > 0) {
      ctx.fillStyle = "#ffffff";
      ctx.font = `${titleFontSize}px Inter, sans-serif`;
      drawWrappedLines(titleLines, centerX, cursorY, titleLineHeight);
      cursorY += titleLines.length * titleLineHeight + lineGap;
    }

    if (textLines.length > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.82)";
      ctx.font = `${textFontSize}px Inter, sans-serif`;
      drawWrappedLines(textLines, centerX, cursorY, textLineHeight);
    }

    ctx.restore();
  }

  function drawMetadataCard() {
    drawTextOverlay({
      title: trackTitle.value,
      text: trackText.value,
      offsetXControl: trackCardOffsetX,
      offsetYControl: trackCardOffsetY,
      scaleControl: trackCardScale,
      maxWidth: 900,
      titleFontSize: 42,
      textFontSize: 24,
    });

    drawTextOverlay({
      title: "",
      text: extraText.value,
      offsetXControl: extraOffsetX,
      offsetYControl: extraOffsetY,
      scaleControl: extraScale,
      maxWidth: 980,
      titleFontSize: 0,
      textFontSize: 28,
    });
  }

  function render() {
    if (!state.canvasVisible && !state.isRecording) {
      state.renderFrame = 0;
      return;
    }
    const time = performance.now();
    const energy = getAverageEnergy();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground(time, energy);
    drawParticles(time, energy);
    drawVisualizer(time, energy);
    drawMetadataCard();

    state.renderFrame = requestAnimationFrame(render);
  }

  function ensureRenderLoop() {
    if (state.renderFrame) return;
    state.renderFrame = requestAnimationFrame(render);
  }

  async function resumeAudioContext() {
    ensureAudioGraph();
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
  }

  function makeRecorderStream() {
    const canvasStream = canvas.captureStream(EXPORT_FPS);
    const tracks = [
      ...canvasStream.getVideoTracks(),
      ...recordingDestination.stream.getAudioTracks(),
    ];
    return new MediaStream(tracks);
  }

  function resolveRecorderFormat() {
    const candidates = [
      { mimeType: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", extension: "mp4" },
      { mimeType: "video/mp4;codecs=h264,aac", extension: "mp4" },
      { mimeType: "video/mp4", extension: "mp4" },
      { mimeType: "video/webm;codecs=vp9,opus", extension: "webm" },
      { mimeType: "video/webm;codecs=vp8,opus", extension: "webm" },
      { mimeType: "video/webm", extension: "webm" },
    ];
    return (
      candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate.mimeType)) || {
        mimeType: "",
        extension: "webm",
      }
    );
  }

  function createRecorderOptions(mimeType, bitrate) {
    const baseOptions = {
      videoBitsPerSecond: bitrate,
      audioBitsPerSecond: 192_000,
    };
    if (!mimeType) return baseOptions;
    return { mimeType, ...baseOptions };
  }

  function getTrimRange() {
    const duration = Number.isFinite(audioPlayer.duration) ? audioPlayer.duration : 0;
    if (duration <= 0) return { start: 0, end: 0, duration: 0 };
    const startFraction = Number(trimStartInput.value) / 1000;
    const endFraction = Number(trimEndInput.value) / 1000;
    const start = clamp(startFraction * duration, 0, duration);
    const end = clamp(endFraction * duration, start + 0.5, duration);
    return { start, end, duration };
  }

  function updateTrimDisplay() {
    const { start, end } = getTrimRange();
    const startPct = Number(trimStartInput.value) / 10;
    const endPct = Number(trimEndInput.value) / 10;
    trimFill.style.left = `${startPct}%`;
    trimFill.style.right = `${100 - endPct}%`;
    trimStartValue.textContent = formatDuration(start);
    trimEndValue.textContent = formatDuration(end);
    trimDurationValue.textContent = formatDuration(Math.max(0, end - start));
  }

  function clampTrimInputs(changed) {
    const minGap = 5;
    let s = Number(trimStartInput.value);
    let e = Number(trimEndInput.value);
    if (s > e - minGap) {
      if (changed === "start") {
        s = e - minGap;
        trimStartInput.value = Math.max(0, s);
      } else {
        e = s + minGap;
        trimEndInput.value = Math.min(1000, e);
      }
    }
    updateTrimDisplay();
  }

  function resetTrimRange() {
    trimStartInput.value = 0;
    trimEndInput.value = 1000;
    updateTrimDisplay();
  }

  async function startRecording() {
    if (!audioPlayer.src) {
      setStatus("Add a music file before downloading.", true);
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setStatus("This browser cannot record a video export here. Use a current Chrome, Edge, or Safari build.", true);
      return;
    }
    if (typeof canvas.captureStream !== "function") {
      setStatus("Canvas capture is not available in this browser.", true);
      return;
    }

    const recorderFormat = resolveRecorderFormat();

    try {
      await resumeAudioContext();
      await ensureMediaMetadata(audioPlayer);

      if (!Number.isFinite(audioPlayer.duration) || audioPlayer.duration <= 0) {
        setStatus("The audio duration is not ready yet. Try again in a moment.", true);
        return;
      }

      const trim = getTrimRange();
      if (trim.end - trim.start < 0.5) {
        setStatus("Trim range is too short.", true);
        return;
      }

      const dims = getExportDimensions();

      downloadButton.disabled = true;
      audioPlayer.controls = false;
      state.isExporting = true;
      setStatus("", false);
      updateExportProgress(0, `Preparing ${aspectConfig().label} export...`);

      setExportCanvasSize();
      audioPlayer.pause();
      backgroundVideo.pause();
      await seekMedia(audioPlayer, trim.start);
      if (isVideoBackgroundActive()) {
        await ensureMediaFrame(backgroundVideo);
        await seekMedia(backgroundVideo, 0);
      }
      await waitForAnimationFrame();
      await waitForAnimationFrame();

      recorderChunks = [];
      recorderChunkCount = 0;
      recorder = new MediaRecorder(
        makeRecorderStream(),
        createRecorderOptions(recorderFormat.mimeType, dims.bitrate)
      );

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recorderChunks.push(event.data);
          recorderChunkCount += 1;
        }
      };

      recorder.onstop = async () => {
        state.isRecording = false;
        clearTrimStopWatcher();
        audioPlayer.pause();
        backgroundVideo.pause();
        resetExportUi();

        if (recorderChunkCount === 0) {
          hideExportProgress();
          setStatus("Download stopped, but no video data was captured.", true);
          return;
        }

        try {
          const finalOutputType = recorder.mimeType || recorderFormat.mimeType || "video/webm";
          const finalOutputExtension = getOutputExtension(finalOutputType);
          const output = new Blob(recorderChunks, { type: finalOutputType });

          updateExportProgress(1, `Saving ${aspectConfig().label} file...`);
          await downloadBlob(output, getOutputFileName(finalOutputExtension));

          window.setTimeout(() => hideExportProgress(), 400);

          if (finalOutputExtension === "mp4") {
            setStatus("Export saved.", false);
            return;
          }
          setStatus("Export saved as WebM because MP4 recording is not available in this browser.", false);
        } catch (error) {
          hideExportProgress();
          setStatus("Export finished, but the file could not be saved.", true);
        } finally {
          recorderChunks = [];
          recorderChunkCount = 0;
        }
      };

      recorder.start();
      state.isRecording = true;
      startExportProgressLoop(trim.start, trim.end);
      watchForTrimEnd(trim.end);

      if (isVideoBackgroundActive()) {
        await backgroundVideo.play().catch(() => {});
      }
      await audioPlayer.play();
    } catch (error) {
      state.isRecording = false;
      recorderChunks = [];
      recorderChunkCount = 0;
      clearTrimStopWatcher();
      audioPlayer.pause();
      backgroundVideo.pause();
      resetExportUi();
      hideExportProgress();
      setStatus("Download could not start in this browser.", true);
    }
  }

  function watchForTrimEnd(endSec) {
    clearTrimStopWatcher();
    trimStopWatcher = window.setInterval(() => {
      if (!state.isRecording) {
        clearTrimStopWatcher();
        return;
      }
      if (audioPlayer.currentTime >= endSec - 0.05) {
        stopRecording();
      }
    }, 80);
  }

  function clearTrimStopWatcher() {
    if (trimStopWatcher) {
      clearInterval(trimStopWatcher);
      trimStopWatcher = 0;
    }
  }

  function stopRecording() {
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  // --- Wiring ---

  aspectModalButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setAspect(button.dataset.aspect, { persist: true });
      hideAspectModal();
    });
  });

  aspectToggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setAspect(button.dataset.aspectToggle, { persist: true });
    });
  });

  audioInput.addEventListener("change", (event) => {
    const [file] = event.target.files || [];
    if (file) loadAudio(file);
  });

  backgroundImageInput.addEventListener("change", (event) => {
    const [file] = event.target.files || [];
    if (file) loadBackgroundImage(file);
  });

  backgroundVideoInput.addEventListener("change", (event) => {
    const [file] = event.target.files || [];
    if (file) loadBackgroundVideo(file);
  });

  backgroundSource.addEventListener("change", syncBackgroundUi);

  presetPicker.addEventListener("click", (event) => {
    const button = event.target.closest(".mv-preset");
    if (!button) return;
    state.preset = button.dataset.preset;
    updatePresetButtons();
  });

  visualizerStyle.addEventListener("change", syncVisualizerControlsVisibility);

  exportQuality.addEventListener("change", updateDownloadButtonLabel);

  [
    trackCardOffsetX,
    trackCardOffsetY,
    trackCardScale,
    extraOffsetX,
    extraOffsetY,
    extraScale,
    barCount,
    intensity,
    smoothing,
    visualizerOffsetX,
    visualizerOffsetY,
    visualizerScale,
    visualizerCurve,
    overlayStrength,
    backgroundBlur,
    particleIntensity,
  ].forEach((control) => control.addEventListener("input", updateOutputValues));

  trimStartInput.addEventListener("input", () => clampTrimInputs("start"));
  trimEndInput.addEventListener("input", () => clampTrimInputs("end"));

  audioPlayer.addEventListener("loadedmetadata", updateTrimDisplay);

  audioPlayer.addEventListener("play", async () => {
    try {
      await resumeAudioContext();
    } catch (error) {
      setStatus("Audio preview needs browser permission to start.", true);
    }
    if (backgroundSource.value === "video" && backgroundVideo.src) {
      backgroundVideo.currentTime =
        audioPlayer.currentTime % Math.max(1, backgroundVideo.duration || 1);
      backgroundVideo.play().catch(() => {});
    }
  });

  audioPlayer.addEventListener("pause", () => {
    backgroundVideo.pause();
  });

  audioPlayer.addEventListener("seeking", () => {
    if (backgroundSource.value === "video" && backgroundVideo.src) {
      backgroundVideo.currentTime =
        audioPlayer.currentTime % Math.max(1, backgroundVideo.duration || 1);
    }
  });

  audioPlayer.addEventListener("ended", () => {
    backgroundVideo.pause();
    if (state.isRecording) stopRecording();
  });

  downloadButton.addEventListener("click", () => {
    if (state.isRecording) return;
    startRecording();
  });

  const panelToggles = document.querySelectorAll("[data-panel-toggle]");

  function setPanelOpen(toggleButton, open) {
    const panel = toggleButton.closest(".mv-panel");
    const panelBody = panel?.querySelector(".mv-panel-body");
    if (!panel || !panelBody) return;
    panelBody.hidden = !open;
    panel.classList.toggle("is-collapsed", !open);
    toggleButton.setAttribute("aria-expanded", String(open));
  }

  panelToggles.forEach((toggleButton) => {
    toggleButton.addEventListener("click", () => {
      const isExpanded = toggleButton.getAttribute("aria-expanded") === "true";
      if (isExpanded) {
        setPanelOpen(toggleButton, false);
        return;
      }
      panelToggles.forEach((other) => {
        if (other !== toggleButton) setPanelOpen(other, false);
      });
      setPanelOpen(toggleButton, true);
    });
  });

  panelToggles.forEach((toggleButton, index) => {
    setPanelOpen(toggleButton, index === 0);
  });

  window.addEventListener("beforeunload", () => {
    revokeUrl("audioUrl");
    revokeUrl("backgroundImageUrl");
    revokeUrl("backgroundVideoUrl");
  });

  // Pause render loop when canvas is offscreen
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          state.canvasVisible = entry.isIntersecting;
          if (state.canvasVisible) ensureRenderLoop();
        });
      },
      { threshold: 0.01 }
    );
    observer.observe(canvas);
  }

  // --- Init ---

  let storedAspect = null;
  try {
    storedAspect = localStorage.getItem(ASPECT_STORAGE_KEY);
  } catch (error) {
    storedAspect = null;
  }

  if (storedAspect && ASPECT_PRESETS[storedAspect]) {
    setAspect(storedAspect, { persist: false });
  } else {
    setAspect("landscape", { persist: false });
    showAspectModal();
  }

  syncBackgroundUi();
  updatePresetButtons();
  updateOutputValues();
  syncVisualizerControlsVisibility();
  updateDownloadButtonLabel();
  resetTrimRange();
  ensureRenderLoop();
})();
