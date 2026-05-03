(function () {
  const PREVIEW_WIDTH = 1280;
  const PREVIEW_HEIGHT = 720;
  const PREVIEW_PORTRAIT_WIDTH = 720;
  const PREVIEW_PORTRAIT_HEIGHT = 1280;
  const EXPORT_WIDTH = 3840;
  const EXPORT_HEIGHT = 2160;
  const PORTRAIT_SOURCE_WIDTH = 3414;
  const PORTRAIT_SOURCE_HEIGHT = 1920;
  const PORTRAIT_EXPORT_WIDTH = 1080;
  const PORTRAIT_EXPORT_HEIGHT = 1920;
  const EXPORT_FPS = 30;
  const MEDIA_EVENT_TIMEOUT = 2500;
  const canvas = document.getElementById("visualizer-canvas");
  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
  const portraitCanvas = document.getElementById("portrait-visualizer-canvas");
  const portraitCtx = portraitCanvas.getContext("2d", { alpha: false, desynchronized: true });

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
  const downloadLandscapeButton = document.getElementById("download-landscape");
  const downloadPortraitButton = document.getElementById("download-portrait");
  const exportProgress = document.getElementById("export-progress");
  const exportProgressLabel = document.getElementById("export-progress-label");
  const exportProgressValue = document.getElementById("export-progress-value");
  const exportProgressFill = document.getElementById("export-progress-fill");
  const recordingStatus = document.getElementById("recording-status");

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
    audioUrl: "",
    backgroundImageUrl: "",
    backgroundVideoUrl: "",
    backgroundImage: null,
    preset: "midnight",
    isRecording: false,
    activeExportAspect: null,
  };

  canvas.width = PREVIEW_WIDTH;
  canvas.height = PREVIEW_HEIGHT;
  portraitCanvas.width = PREVIEW_PORTRAIT_WIDTH;
  portraitCanvas.height = PREVIEW_PORTRAIT_HEIGHT;

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

  const exportButtons = [downloadLandscapeButton, downloadPortraitButton];

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
        if (isSettled) {
          return;
        }

        isSettled = true;
        cleanup();
        resolve(true);
      };

      const timeoutId = window.setTimeout(() => {
        if (isSettled) {
          return;
        }

        isSettled = true;
        cleanup();
        resolve(false);
      }, timeoutMs);

      target.addEventListener(eventName, handleEvent, { once: true });
    });
  }

  function waitForAnimationFrame() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }

  function setRenderSurfaceSize(mode, exportAspect) {
    const renderSize =
      mode === "export"
        ? exportAspect === "portrait"
          ? {
              landscapeWidth: PORTRAIT_SOURCE_WIDTH,
              landscapeHeight: PORTRAIT_SOURCE_HEIGHT,
              portraitWidth: PORTRAIT_EXPORT_WIDTH,
              portraitHeight: PORTRAIT_EXPORT_HEIGHT,
            }
          : {
              landscapeWidth: EXPORT_WIDTH,
              landscapeHeight: EXPORT_HEIGHT,
              portraitWidth: PREVIEW_PORTRAIT_WIDTH,
              portraitHeight: PREVIEW_PORTRAIT_HEIGHT,
            }
        : {
            landscapeWidth: PREVIEW_WIDTH,
            landscapeHeight: PREVIEW_HEIGHT,
            portraitWidth: PREVIEW_PORTRAIT_WIDTH,
            portraitHeight: PREVIEW_PORTRAIT_HEIGHT,
          };

    if (canvas.width !== renderSize.landscapeWidth || canvas.height !== renderSize.landscapeHeight) {
      canvas.width = renderSize.landscapeWidth;
      canvas.height = renderSize.landscapeHeight;
    }

    if (
      portraitCanvas.width !== renderSize.portraitWidth ||
      portraitCanvas.height !== renderSize.portraitHeight
    ) {
      portraitCanvas.width = renderSize.portraitWidth;
      portraitCanvas.height = renderSize.portraitHeight;
    }
  }

  function getOutputExtension(mimeType) {
    return mimeType.includes("mp4") ? "mp4" : "webm";
  }

  function getOutputFileName(exportConfig, extension) {
    return `${safeName(trackTitle.value, "music-visualizer")}-${exportConfig.fileSuffix}.${extension}`;
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

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60_000);
  }

  async function ensureMediaMetadata(media) {
    if (media.readyState >= 1) {
      return true;
    }

    return waitForEvent(media, "loadedmetadata");
  }

  async function ensureMediaFrame(media) {
    if (media.readyState >= 2) {
      return true;
    }

    return waitForEvent(media, "loadeddata");
  }

  async function seekMedia(media, targetTime) {
    await ensureMediaMetadata(media);
    const duration = Number.isFinite(media.duration) && media.duration > 0 ? media.duration : 0;
    const clampedTime = duration > 0 ? Math.min(Math.max(targetTime, 0), Math.max(0, duration - 0.01)) : 0;

    if (Math.abs(media.currentTime - clampedTime) <= 0.02) {
      media.currentTime = clampedTime;
      return true;
    }

    const seekPromise = waitForEvent(media, "seeked");
    media.currentTime = clampedTime;
    const didSeek = await seekPromise;
    if (didSeek) {
      return true;
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await waitForAnimationFrame();
      if (Math.abs(media.currentTime - clampedTime) <= 0.05) {
        return true;
      }
    }

    return false;
  }

  function isVideoBackgroundActive() {
    return backgroundSource.value === "video" && Boolean(backgroundVideo.src);
  }

  function getExportConfig(aspect) {
    if (aspect === "portrait") {
      return {
        aspect,
        aspectLabel: "9:16",
        canvas: portraitCanvas,
        fileSuffix: "9x16",
      };
    }

    return {
      aspect: "landscape",
      aspectLabel: "16:9",
      canvas,
      fileSuffix: "16x9",
    };
  }

  function hideExportProgress() {
    exportProgress.hidden = true;
    exportProgressFill.style.width = "0%";
  }

  function updateExportProgress(progress, label) {
    const safeProgress = Math.max(0, Math.min(1, progress));
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

  function setExportButtonsDisabled(disabled) {
    exportButtons.forEach((button) => {
      button.disabled = disabled;
    });
  }

  function resetExportUi() {
    stopExportProgressLoop();
    setExportButtonsDisabled(false);
    audioPlayer.controls = true;
    state.activeExportAspect = null;
    setRenderSurfaceSize("preview");
  }

  function formatDuration(seconds) {
    const totalSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(totalSeconds / 60);
    const remainder = totalSeconds % 60;
    return `${minutes}:${String(remainder).padStart(2, "0")}`;
  }

  function startExportProgressLoop(duration, aspectLabel) {
    stopExportProgressLoop();

    const step = () => {
      if (!state.isRecording) {
        return;
      }

      const current = Math.min(audioPlayer.currentTime, duration);
      updateExportProgress(
        current / duration,
        `Exporting ${aspectLabel} ${formatDuration(current)} / ${formatDuration(duration)}`
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

  function updateStageState() {
    return;
  }

  function syncBackgroundUi() {
    const source = backgroundSource.value;
    presetPicker.hidden = source !== "preset";
    imageUploadGroup.hidden = source !== "image";
    videoUploadGroup.hidden = source !== "video";
  }

  function updatePresetButtons() {
    const buttons = presetPicker.querySelectorAll(".mv-preset");
    buttons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.preset === state.preset);
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
    updateStageState();
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
        backgroundVideo.currentTime = audioPlayer.currentTime % Math.max(1, backgroundVideo.duration || 1);
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
          .catch(() => {
            backgroundVideo.pause();
          });
      }
    };

    if (backgroundVideo.readyState >= 2) {
      syncVideoFrame();
      return;
    }

    backgroundVideo.addEventListener("loadeddata", syncVideoFrame, { once: true });
  }

  async function prepareExportMedia() {
    audioPlayer.pause();
    backgroundVideo.pause();

    await ensureMediaMetadata(audioPlayer);
    await seekMedia(audioPlayer, 0);

    if (isVideoBackgroundActive()) {
      await ensureMediaFrame(backgroundVideo);
      await seekMedia(backgroundVideo, 0);
    }

    await waitForAnimationFrame();
    await waitForAnimationFrame();
  }

  function getAverageEnergy() {
    if (!analyser) {
      return 0;
    }

    let total = 0;
    const sampleCount = Math.min(64, frequencyData.length);
    for (let index = 0; index < sampleCount; index += 1) {
      total += frequencyData[index];
    }

    return total / sampleCount / 255;
  }

  function drawPresetBackground(preset, time, energy) {
    const width = canvas.width;
    const height = canvas.height;

    if (preset === "sunset") {
      const sunsetGradient = ctx.createLinearGradient(0, 0, width, height);
      sunsetGradient.addColorStop(0, "#1f1235");
      sunsetGradient.addColorStop(0.45, "#7a2f4c");
      sunsetGradient.addColorStop(1, "#da6a55");
      ctx.fillStyle = sunsetGradient;
      ctx.fillRect(0, 0, width, height);

      ctx.globalAlpha = 0.45;
      ctx.fillStyle = "#ffd58f";
      ctx.beginPath();
      ctx.arc(width * 0.78, height * 0.24, 120 + energy * 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = "rgba(255,255,255,0.08)";
      for (let line = 0; line < 10; line += 1) {
        const y = height * 0.55 + line * 18 + Math.sin(time * 0.0012 + line) * 7;
        ctx.fillRect(0, y, width, 2);
      }
      return;
    }

    if (preset === "studio") {
      const studioGradient = ctx.createLinearGradient(0, 0, width, height);
      studioGradient.addColorStop(0, "#101010");
      studioGradient.addColorStop(1, "#343434");
      ctx.fillStyle = studioGradient;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 42) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 42) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.globalAlpha = 0.16 + energy * 0.28;
      ctx.fillStyle = accentColor.value;
      ctx.beginPath();
      ctx.arc(width * 0.2, height * 0.2, 180 + energy * 80, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }

    if (preset === "aurora") {
      const auroraGradient = ctx.createLinearGradient(0, 0, width, height);
      auroraGradient.addColorStop(0, "#06111b");
      auroraGradient.addColorStop(1, "#12273b");
      ctx.fillStyle = auroraGradient;
      ctx.fillRect(0, 0, width, height);

      for (let band = 0; band < 5; band += 1) {
        const yBase = height * (0.18 + band * 0.12);
        const sway = Math.sin(time * 0.0008 + band * 0.9) * 70;
        const bandGradient = ctx.createLinearGradient(0, yBase + sway, width, yBase + 120 + sway);
        bandGradient.addColorStop(0, "rgba(28, 217, 197, 0)");
        bandGradient.addColorStop(0.4, `rgba(28, 217, 197, ${0.18 + energy * 0.18})`);
        bandGradient.addColorStop(0.7, "rgba(154, 236, 123, 0.16)");
        bandGradient.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = bandGradient;
        ctx.fillRect(0, yBase + sway, width, 150);
      }
      return;
    }

    const midnightGradient = ctx.createLinearGradient(0, 0, width, height);
    midnightGradient.addColorStop(0, "#070b18");
    midnightGradient.addColorStop(0.45, "#0f1b35");
    midnightGradient.addColorStop(1, "#271a4b");
    ctx.fillStyle = midnightGradient;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.4;
    const flare = ctx.createRadialGradient(
      width * 0.22,
      height * 0.2,
      20,
      width * 0.22,
      height * 0.2,
      200 + energy * 80
    );
    flare.addColorStop(0, "rgba(126, 164, 255, 0.55)");
    flare.addColorStop(1, "rgba(126, 164, 255, 0)");
    ctx.fillStyle = flare;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;

    for (let star = 0; star < 80; star += 1) {
      const x = (star * 137.5) % width;
      const y = (star * 83.2 + time * 0.02) % height;
      const alpha = 0.2 + ((star % 7) / 20) + energy * 0.18;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  function drawBackground(time, energy) {
    ctx.save();
    ctx.filter = `blur(${backgroundBlur.value}px)`;

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

  function getVisualizerLayout() {
    const scale = Number(visualizerScale.value) / 100;
    const shiftX = (Number(visualizerOffsetX.value) / 100) * canvas.width * 0.45;
    const shiftY = (Number(visualizerOffsetY.value) / 100) * canvas.height * 0.45;

    return { scale, shiftX, shiftY };
  }

  function getTextBlockLayout(offsetXValue, offsetYValue, blockWidth, blockHeight, scale) {
    const margin = 24 * getCanvasScale();
    const normalizedX = (Number(offsetXValue) + 100) / 200;
    const normalizedY = (Number(offsetYValue) + 100) / 200;
    const availableX = Math.max(0, canvas.width - blockWidth - margin * 2);
    const availableY = Math.max(0, canvas.height - blockHeight - margin * 2);
    const x = margin + normalizedX * availableX;
    const y = margin + normalizedY * availableY;

    return { scale, x, y };
  }

  function getCanvasScale() {
    return Math.min(canvas.width / 1280, canvas.height / 720);
  }

  function getCurveOffset(ratio, layout, strengthMultiplier) {
    const curve = Number(visualizerCurve.value) / 100;
    if (curve === 0) {
      return 0;
    }

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

    const sampleIndex = Math.min(
      frequencyData.length - 1,
      Math.max(0, Math.floor(ratio * frequencyData.length))
    );
    return frequencyData[sampleIndex] / 255;
  }

  function getMirroredBarProfile(index, bars) {
    if (bars <= 1) {
      return {
        ratio: 0.5,
        mirroredRatio: 0,
        centerWeight: 1,
      };
    }

    const ratio = index / (bars - 1);
    const mirroredRatio = Math.abs(ratio - 0.5) / 0.5;
    const centerWeight = Math.max(0, 1 - mirroredRatio);

    return {
      ratio,
      mirroredRatio,
      centerWeight,
    };
  }

  function getWaveformSample(ratio, time) {
    if (!analyser || !waveformData || waveformData.length === 0) {
      return Math.sin(time * 0.002 + ratio * Math.PI * 4) * 0.12;
    }

    const sampleIndex = Math.min(
      waveformData.length - 1,
      Math.max(0, Math.floor(ratio * waveformData.length))
    );
    return (waveformData[sampleIndex] - 128) / 128;
  }

  function drawBars(energy, layout) {
    if (!analyser) {
      drawIdleBars(layout);
      return;
    }

    const bars = Number(barCount.value);
    const width = canvas.width;
    const height = canvas.height;
    const usableWidth = width * 0.82 * layout.scale;
    const startX = (width - usableWidth) / 2 + layout.shiftX;
    const barWidth = usableWidth / bars;
    const floorY = height * 0.78 + layout.shiftY;
    const maxHeight = height * (0.34 + energy * 0.12) * Number(intensity.value) * layout.scale;

    ctx.save();
    ctx.fillStyle = accentColor.value;
    ctx.shadowColor = accentColor.value;
    ctx.shadowBlur = 30;

    for (let index = 0; index < bars; index += 1) {
      const { ratio, mirroredRatio, centerWeight } = getMirroredBarProfile(index, bars);
      const sample = getFrequencySample(mirroredRatio);
      const shapedSample = sample * (0.2 + centerWeight * 0.8);
      const barHeight = 8 + shapedSample * maxHeight;
      const x = startX + index * barWidth + 2;
      const y = floorY + getCurveOffset(ratio, layout, 0.8) - barHeight;
      ctx.globalAlpha = 0.18 + shapedSample * 0.85;
      ctx.fillRect(x, y, Math.max(4, barWidth - 5), barHeight);
    }

    ctx.restore();
  }

  function drawIdleBars(layout) {
    const bars = Number(barCount.value);
    const usableWidth = canvas.width * 0.82 * layout.scale;
    const startX = (canvas.width - usableWidth) / 2 + layout.shiftX;
    const barWidth = usableWidth / bars;

    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    for (let index = 0; index < bars; index += 1) {
      const { ratio, mirroredRatio, centerWeight } = getMirroredBarProfile(index, bars);
      const idlePulse = 0.5 + Math.cos(mirroredRatio * Math.PI * 4) * 0.5;
      const heightValue = (8 + (10 + idlePulse * 18) * centerWeight) * layout.scale;
      const x = startX + index * barWidth + 2;
      const y = canvas.height * 0.78 + layout.shiftY + getCurveOffset(ratio, layout, 0.8) - heightValue;
      ctx.fillRect(x, y, Math.max(4, barWidth - 5), heightValue);
    }
    ctx.restore();
  }

  function drawMirrorBars(energy, layout) {
    const bars = Number(barCount.value);
    const usableWidth = canvas.width * 0.82 * layout.scale;
    const startX = (canvas.width - usableWidth) / 2 + layout.shiftX;
    const barWidth = usableWidth / bars;
    const centerY = canvas.height * 0.64 + layout.shiftY;
    const maxHeight = canvas.height * (0.26 + energy * 0.08) * Number(intensity.value) * layout.scale;

    ctx.save();
    ctx.fillStyle = accentColor.value;
    ctx.shadowColor = accentColor.value;
    ctx.shadowBlur = 26;

    for (let index = 0; index < bars; index += 1) {
      const ratio = bars === 1 ? 0 : index / (bars - 1);
      const sample = analyser ? getFrequencySample(ratio) : 0.12 + Math.sin(index * 0.35) * 0.04;
      const barHeight = 16 + sample * maxHeight;
      const x = startX + index * barWidth + 2;
      const y = centerY + getCurveOffset(ratio, layout, 0.8) - barHeight / 2;
      ctx.globalAlpha = 0.24 + sample * 0.8;
      ctx.fillRect(x, y, Math.max(4, barWidth - 5), barHeight);
    }

    ctx.restore();
  }

  function drawMirrorVerticalBars(energy, layout) {
    const bars = Number(barCount.value);
    const usableHeight = canvas.height * 0.7 * layout.scale;
    const startY = (canvas.height - usableHeight) / 2 + layout.shiftY;
    const rowHeight = usableHeight / bars;
    const centerX = canvas.width / 2 + layout.shiftX;
    const maxWidth = canvas.width * (0.22 + energy * 0.08) * Number(intensity.value) * layout.scale;

    ctx.save();
    ctx.fillStyle = accentColor.value;
    ctx.shadowColor = accentColor.value;
    ctx.shadowBlur = 26;

    for (let index = 0; index < bars; index += 1) {
      const ratio = bars === 1 ? 0 : index / (bars - 1);
      const sample = analyser ? getFrequencySample(ratio) : 0.12 + Math.sin(index * 0.35) * 0.04;
      const barWidth = 18 + sample * maxWidth;
      const barHeight = Math.max(4, rowHeight - 5);
      const y = startY + index * rowHeight + 2 + getCurveOffset(ratio, layout, 0.12);
      ctx.globalAlpha = 0.24 + sample * 0.8;
      ctx.fillRect(centerX - barWidth / 2, y, barWidth, barHeight);
    }

    ctx.restore();
  }

  function drawRing(layout) {
    const centerX = canvas.width / 2 + layout.shiftX;
    const centerY = canvas.height / 2 + layout.shiftY;
    const baseRadius = 120 * layout.scale;
    const totalPoints = Math.min(Number(barCount.value), 96);
    const curveFactor = getRadialCurveFactor();

    ctx.save();
    ctx.strokeStyle = accentColor.value;
    ctx.lineWidth = 6;
    ctx.shadowColor = accentColor.value;
    ctx.shadowBlur = 24;
    ctx.beginPath();

    for (let point = 0; point <= totalPoints; point += 1) {
      const ratio = point / totalPoints;
      const angle = ratio * Math.PI * 2 - Math.PI / 2;
      const sample = getFrequencySample(ratio);
      const radius = baseRadius + sample * 180 * Number(intensity.value) * layout.scale;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius * curveFactor;

      if (point === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.closePath();
    ctx.stroke();

    ctx.globalAlpha = 0.18;
    ctx.fillStyle = accentColor.value;
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius * 0.78, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawRadialSpikes(layout) {
    const centerX = canvas.width / 2 + layout.shiftX;
    const centerY = canvas.height / 2 + layout.shiftY;
    const innerRadius = 88 * layout.scale;
    const spikeRange = 170 * Number(intensity.value) * layout.scale;
    const totalPoints = Math.min(Math.max(Number(barCount.value), 28), 96);
    const curveFactor = getRadialCurveFactor();

    ctx.save();
    ctx.strokeStyle = accentColor.value;
    ctx.lineWidth = 3;
    ctx.shadowColor = accentColor.value;
    ctx.shadowBlur = 24;

    for (let point = 0; point < totalPoints; point += 1) {
      const ratio = point / totalPoints;
      const angle = ratio * Math.PI * 2 - Math.PI / 2;
      const sample = getFrequencySample(ratio);
      const outerRadius = innerRadius + 18 + sample * spikeRange;
      const startX = centerX + Math.cos(angle) * innerRadius;
      const startY = centerY + Math.sin(angle) * innerRadius * curveFactor;
      const endX = centerX + Math.cos(angle) * outerRadius;
      const endY = centerY + Math.sin(angle) * outerRadius * curveFactor;

      ctx.globalAlpha = 0.18 + sample * 0.85;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawWave(time, layout) {
    const waveWidth = canvas.width * 0.84 * layout.scale;
    const startX = (canvas.width - waveWidth) / 2 + layout.shiftX;
    const centerY = canvas.height * 0.54 + layout.shiftY;
    const amplitude = 120 * Number(intensity.value) * layout.scale;
    const totalPoints = 180;

    ctx.save();
    ctx.strokeStyle = accentColor.value;
    ctx.lineWidth = 5;
    ctx.shadowColor = accentColor.value;
    ctx.shadowBlur = 18;
    ctx.beginPath();

    for (let point = 0; point < totalPoints; point += 1) {
      const ratio = point / (totalPoints - 1);
      const x = startX + ratio * waveWidth;
      const sample = getWaveformSample(ratio, time);
      const y = centerY + getCurveOffset(ratio, layout, 0.7) + sample * amplitude;
      if (point === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
    ctx.restore();
  }

  function drawThinWave(time, layout) {
    const waveWidth = canvas.width * 0.8 * layout.scale;
    const startX = (canvas.width - waveWidth) / 2 + layout.shiftX;
    const centerY = canvas.height * 0.56 + layout.shiftY;
    const amplitude = 72 * Number(intensity.value) * layout.scale;
    const totalPoints = 180;

    ctx.save();
    ctx.strokeStyle = accentColor.value;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = accentColor.value;
    ctx.shadowBlur = 12;

    for (let pass = 0; pass < 2; pass += 1) {
      ctx.globalAlpha = pass === 0 ? 1 : 0.24;
      ctx.beginPath();

      for (let point = 0; point < totalPoints; point += 1) {
        const ratio = point / (totalPoints - 1);
        const x = startX + ratio * waveWidth;
        const sample = getWaveformSample(ratio, time);
        const y = centerY + getCurveOffset(ratio, layout, 0.65) + sample * amplitude + pass * 14 * layout.scale;
        if (point === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
    }

    ctx.restore();
  }

  function drawDotSpectrum(energy, layout) {
    const dots = Math.min(Number(barCount.value), 72);
    const spectrumWidth = canvas.width * 0.82 * layout.scale;
    const startX = (canvas.width - spectrumWidth) / 2 + layout.shiftX;
    const baseY = canvas.height * 0.72 + layout.shiftY;
    const maxRise = canvas.height * (0.2 + energy * 0.08) * Number(intensity.value) * layout.scale;
    const gap = spectrumWidth / Math.max(1, dots - 1);

    ctx.save();
    ctx.fillStyle = accentColor.value;
    ctx.shadowColor = accentColor.value;
    ctx.shadowBlur = 24;

    for (let index = 0; index < dots; index += 1) {
      const ratio = dots === 1 ? 0 : index / (dots - 1);
      const sample = getFrequencySample(ratio);
      const radius = Math.max(2, (3 + sample * 10) * layout.scale);
      const x = startX + gap * index;
      const y = baseY + getCurveOffset(ratio, layout, 0.8) - sample * maxRise;

      ctx.globalAlpha = 0.2 + sample * 0.85;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawStackedBars(energy, layout) {
    const bars = Math.min(28, Math.max(10, Math.round(Number(barCount.value) / 4)));
    const usableWidth = canvas.width * 0.72 * layout.scale;
    const startX = (canvas.width - usableWidth) / 2 + layout.shiftX;
    const barWidth = usableWidth / bars;
    const floorY = canvas.height * 0.76 + layout.shiftY;
    const maxHeight = canvas.height * (0.28 + energy * 0.1) * Number(intensity.value) * layout.scale;
    const gapY = 8 * layout.scale;

    ctx.save();
    ctx.fillStyle = accentColor.value;
    ctx.shadowColor = accentColor.value;
    ctx.shadowBlur = 22;

    for (let index = 0; index < bars; index += 1) {
      const ratio = bars === 1 ? 0 : index / (bars - 1);
      const sample = getFrequencySample(ratio);
      const totalHeight = 18 + sample * maxHeight;
      const segments = Math.max(1, Math.round(sample * 5));
      const segmentHeight = Math.max(6 * layout.scale, (totalHeight - gapY * (segments - 1)) / segments);
      const widthValue = Math.max(10 * layout.scale, barWidth - 10);
      const x = startX + index * barWidth + (barWidth - widthValue) / 2;
      const curveOffset = getCurveOffset(ratio, layout, 0.75);

      for (let segment = 0; segment < segments; segment += 1) {
        const y = floorY + curveOffset - (segment + 1) * segmentHeight - segment * gapY;
        ctx.globalAlpha = 0.24 + sample * 0.8 - segment * 0.08;
        ctx.fillRect(x, y, widthValue, segmentHeight);
      }
    }

    ctx.restore();
  }

  function drawOrbitParticles(time, energy, layout) {
    const particles = Math.min(48, Math.max(18, Math.round(Number(barCount.value) / 2)));
    const centerX = canvas.width / 2 + layout.shiftX;
    const centerY = canvas.height / 2 + layout.shiftY;
    const orbitBase = 110 * layout.scale;
    const orbitRange = 150 * Number(intensity.value) * layout.scale;
    const curveFactor = getRadialCurveFactor();

    ctx.save();
    ctx.fillStyle = accentColor.value;
    ctx.shadowColor = accentColor.value;
    ctx.shadowBlur = 20;

    for (let index = 0; index < particles; index += 1) {
      const ratio = index / particles;
      const sample = getFrequencySample(ratio);
      const orbitAngle = ratio * Math.PI * 2 + time * (0.0003 + sample * 0.0008);
      const orbitRadius =
        orbitBase +
        sample * orbitRange +
        Math.sin(time * 0.0012 + index * 0.7) * 10 * layout.scale +
        energy * 16 * layout.scale;
      const x = centerX + Math.cos(orbitAngle) * orbitRadius;
      const y = centerY + Math.sin(orbitAngle) * orbitRadius * curveFactor;
      const radius = Math.max(2, (3 + sample * 7) * layout.scale);

      ctx.globalAlpha = 0.16 + sample * 0.84;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawCenterPulse(time, energy, layout) {
    const waveWidth = canvas.width * 0.78 * layout.scale;
    const startX = (canvas.width - waveWidth) / 2 + layout.shiftX;
    const centerY = canvas.height * 0.58 + layout.shiftY;
    const amplitude = 28 * Number(intensity.value) * layout.scale;
    const totalPoints = 140;

    ctx.save();
    ctx.strokeStyle = accentColor.value;
    ctx.lineWidth = 6 + energy * 10 * layout.scale;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = accentColor.value;
    ctx.shadowBlur = 18;
    ctx.beginPath();

    for (let point = 0; point < totalPoints; point += 1) {
      const ratio = point / (totalPoints - 1);
      const x = startX + ratio * waveWidth;
      const sample = getWaveformSample(ratio, time);
      const y = centerY + getCurveOffset(ratio, layout, 0.6) + sample * amplitude;
      if (point === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
    ctx.fillStyle = accentColor.value;
    ctx.globalAlpha = 0.28 + energy * 0.45;
    ctx.beginPath();
    ctx.arc(canvas.width / 2 + layout.shiftX, centerY, 18 + energy * 28 * layout.scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawAlbumFrame(layout) {
    const centerX = canvas.width / 2 + layout.shiftX;
    const centerY = canvas.height / 2 + layout.shiftY;
    const squareSize = 240 * layout.scale;
    const left = centerX - squareSize / 2;
    const top = centerY - squareSize / 2;
    const segmentCount = 16;
    const edgeUnit = squareSize / segmentCount;
    const edgeRange = 64 * Number(intensity.value) * layout.scale;
    const title = trackTitle.value.trim();
    const artist = trackText.value.trim();

    ctx.save();
    ctx.fillStyle = "rgba(8, 8, 10, 0.62)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 2;
    roundRect(left, top, squareSize, squareSize, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = accentColor.value;
    ctx.shadowColor = accentColor.value;
    ctx.shadowBlur = 18;

    for (let index = 0; index < segmentCount; index += 1) {
      const ratio = index / (segmentCount - 1);
      const topSample = getFrequencySample(ratio * 0.25);
      const rightSample = getFrequencySample(0.25 + ratio * 0.25);
      const bottomSample = getFrequencySample(0.5 + ratio * 0.25);
      const leftSample = getFrequencySample(0.75 + ratio * 0.25);
      const x = left + index * edgeUnit + edgeUnit * 0.18;
      const y = top + index * edgeUnit + edgeUnit * 0.18;
      const unitThickness = Math.max(6 * layout.scale, edgeUnit * 0.36);

      ctx.globalAlpha = 0.2 + topSample * 0.8;
      ctx.fillRect(x, top - (12 + topSample * edgeRange), unitThickness, 8 + topSample * edgeRange);

      ctx.globalAlpha = 0.2 + bottomSample * 0.8;
      ctx.fillRect(x, top + squareSize + 12, unitThickness, 8 + bottomSample * edgeRange);

      ctx.globalAlpha = 0.2 + leftSample * 0.8;
      ctx.fillRect(left - (12 + leftSample * edgeRange), y, 8 + leftSample * edgeRange, unitThickness);

      ctx.globalAlpha = 0.2 + rightSample * 0.8;
      ctx.fillRect(left + squareSize + 12, y, 8 + rightSample * edgeRange, unitThickness);
    }

    ctx.shadowBlur = 0;
    ctx.textAlign = "center";
    if (title) {
      ctx.fillStyle = "#ffffff";
      ctx.font = `${Math.max(22, 26 * layout.scale)}px Inter, sans-serif`;
      ctx.fillText(trimText(title, 18), centerX, top + squareSize * 0.44);
    }

    if (artist) {
      ctx.fillStyle = "rgba(255,255,255,0.78)";
      ctx.font = `${Math.max(16, 18 * layout.scale)}px Inter, sans-serif`;
      ctx.fillText(trimText(artist, 24), centerX, top + squareSize * (title ? 0.61 : 0.5));
    }
    ctx.restore();
  }

  function drawVisualizer(time, energy) {
    if (analyser) {
      analyser.smoothingTimeConstant = Number(smoothing.value);
      analyser.getByteFrequencyData(frequencyData);
      analyser.getByteTimeDomainData(waveformData);
    }

    const layout = getVisualizerLayout();

    if (visualizerStyle.value === "ring") {
      drawRing(layout);
      return;
    }

    if (visualizerStyle.value === "wave") {
      drawWave(time, layout);
      return;
    }

    if (visualizerStyle.value === "mirror-bars") {
      drawMirrorBars(energy, layout);
      return;
    }

    if (visualizerStyle.value === "mirror-vertical") {
      drawMirrorVerticalBars(energy, layout);
      return;
    }

    if (visualizerStyle.value === "dot-spectrum") {
      drawDotSpectrum(energy, layout);
      return;
    }

    if (visualizerStyle.value === "radial-spikes") {
      drawRadialSpikes(layout);
      return;
    }

    if (visualizerStyle.value === "thin-wave") {
      drawThinWave(time, layout);
      return;
    }

    if (visualizerStyle.value === "stacked-bars") {
      drawStackedBars(energy, layout);
      return;
    }

    if (visualizerStyle.value === "orbit-particles") {
      drawOrbitParticles(time, energy, layout);
      return;
    }

    if (visualizerStyle.value === "center-pulse") {
      drawCenterPulse(time, energy, layout);
      return;
    }

    if (visualizerStyle.value === "album-frame") {
      drawAlbumFrame(layout);
      return;
    }

    drawBars(energy, layout);
  }

  function wrapTextLines(value, maxWidth) {
    const paragraphs = value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (paragraphs.length === 0) {
      return [];
    }

    const lines = [];

    paragraphs.forEach((paragraph) => {
      const words = paragraph.split(/\s+/).filter(Boolean);
      if (words.length === 0) {
        return;
      }

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
    if (!title && !text) {
      return;
    }

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
      blockHeight,
      scale
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
    if (visualizerStyle.value === "album-frame") {
      return;
    }

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

  function copyPortraitPreview() {
    const sourceWidth = Math.round(canvas.height * (9 / 16));
    const sourceX = Math.max(0, Math.round((canvas.width - sourceWidth) / 2));

    portraitCtx.clearRect(0, 0, portraitCanvas.width, portraitCanvas.height);
    portraitCtx.drawImage(
      canvas,
      sourceX,
      0,
      sourceWidth,
      canvas.height,
      0,
      0,
      portraitCanvas.width,
      portraitCanvas.height
    );
  }

  function roundRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function trimText(value, maxLength) {
    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, Math.max(1, maxLength - 3))}...`;
  }

  function render() {
    const time = performance.now();
    const energy = getAverageEnergy();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground(time, energy);
    drawVisualizer(time, energy);
    drawMetadataCard();
    if (!state.isRecording || state.activeExportAspect === "portrait") {
      copyPortraitPreview();
    }

    requestAnimationFrame(render);
  }

  async function resumeAudioContext() {
    ensureAudioGraph();
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
  }

  function makeRecorderStream(sourceCanvas) {
    const canvasStream = sourceCanvas.captureStream(EXPORT_FPS);
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

  function createRecorderOptions(mimeType) {
    const baseOptions = {
      videoBitsPerSecond: 24_000_000,
      audioBitsPerSecond: 192_000,
    };

    if (!mimeType) {
      return baseOptions;
    }

    return {
      mimeType,
      ...baseOptions,
    };
  }

  async function startRecording(aspect) {
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

    const exportConfig = getExportConfig(aspect);
    const recorderFormat = resolveRecorderFormat();

    try {
      await resumeAudioContext();
      await ensureMediaMetadata(audioPlayer);

      if (!Number.isFinite(audioPlayer.duration) || audioPlayer.duration <= 0) {
        setStatus("The audio duration is not ready yet. Try again in a moment.", true);
        return;
      }

      setExportButtonsDisabled(true);
      audioPlayer.controls = false;
      state.activeExportAspect = exportConfig.aspect;
      setStatus("", false);
      updateExportProgress(0, `Preparing ${exportConfig.aspectLabel} export...`);

      setRenderSurfaceSize("export", exportConfig.aspect);
      await prepareExportMedia();

      const exportDuration = audioPlayer.duration;
      recorderChunks = [];
      recorderChunkCount = 0;
      recorder = new MediaRecorder(
        makeRecorderStream(exportConfig.canvas),
        createRecorderOptions(recorderFormat.mimeType)
      );

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recorderChunks.push(event.data);
          recorderChunkCount += 1;
        }
      };

      recorder.onstop = async () => {
        state.isRecording = false;
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

          updateExportProgress(1, `Saving ${exportConfig.aspectLabel} file...`);
          await downloadBlob(output, getOutputFileName(exportConfig, finalOutputExtension));

          window.setTimeout(() => {
            hideExportProgress();
          }, 400);

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
      startExportProgressLoop(exportDuration, exportConfig.aspectLabel);

      if (isVideoBackgroundActive()) {
        await backgroundVideo.play().catch(() => {});
      }

      await audioPlayer.play();
    } catch (error) {
      state.isRecording = false;
      recorderChunks = [];
      recorderChunkCount = 0;
      audioPlayer.pause();
      backgroundVideo.pause();
      resetExportUi();
      hideExportProgress();
      setStatus("Download could not start in this browser.", true);
    }
  }

  function stopRecording() {
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  audioInput.addEventListener("change", (event) => {
    const [file] = event.target.files || [];
    if (file) {
      loadAudio(file);
    }
  });

  backgroundImageInput.addEventListener("change", (event) => {
    const [file] = event.target.files || [];
    if (file) {
      loadBackgroundImage(file);
    }
  });

  backgroundVideoInput.addEventListener("change", (event) => {
    const [file] = event.target.files || [];
    if (file) {
      loadBackgroundVideo(file);
    }
  });

  backgroundSource.addEventListener("change", syncBackgroundUi);

  presetPicker.addEventListener("click", (event) => {
    const button = event.target.closest(".mv-preset");
    if (!button) {
      return;
    }

    state.preset = button.dataset.preset;
    updatePresetButtons();
  });

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
  ].forEach((control) => {
    control.addEventListener("input", updateOutputValues);
  });

  audioPlayer.addEventListener("play", async () => {
    try {
      await resumeAudioContext();
    } catch (error) {
      setStatus("Audio preview needs browser permission to start.", true);
    }

    if (backgroundSource.value === "video" && backgroundVideo.src) {
      backgroundVideo.currentTime = audioPlayer.currentTime % Math.max(1, backgroundVideo.duration || 1);
      backgroundVideo.play().catch(() => {});
    }

    updateStageState();
  });

  audioPlayer.addEventListener("pause", () => {
    backgroundVideo.pause();
    updateStageState();
  });

  audioPlayer.addEventListener("seeking", () => {
    if (backgroundSource.value === "video" && backgroundVideo.src) {
      backgroundVideo.currentTime = audioPlayer.currentTime % Math.max(1, backgroundVideo.duration || 1);
    }
  });

  audioPlayer.addEventListener("ended", () => {
    backgroundVideo.pause();
    updateStageState();
    if (state.isRecording) {
      stopRecording();
    }
  });

  downloadLandscapeButton.addEventListener("click", () => {
    if (state.isRecording) {
      return;
    }

    startRecording("landscape");
  });

  downloadPortraitButton.addEventListener("click", () => {
    if (state.isRecording) {
      return;
    }

    startRecording("portrait");
  });

  document.querySelectorAll("[data-panel-toggle]").forEach((toggleButton) => {
    toggleButton.addEventListener("click", () => {
      const panel = toggleButton.closest(".mv-panel");
      const panelBody = panel?.querySelector(".mv-panel-body");
      if (!panel || !panelBody) {
        return;
      }

      const isExpanded = toggleButton.getAttribute("aria-expanded") === "true";
      panelBody.hidden = isExpanded;
      panel.classList.toggle("is-collapsed", isExpanded);
      toggleButton.setAttribute("aria-expanded", String(!isExpanded));
    });
  });

  window.addEventListener("beforeunload", () => {
    revokeUrl("audioUrl");
    revokeUrl("backgroundImageUrl");
    revokeUrl("backgroundVideoUrl");
  });

  syncBackgroundUi();
  updatePresetButtons();
  updateOutputValues();
  updateStageState();
  render();
})();
