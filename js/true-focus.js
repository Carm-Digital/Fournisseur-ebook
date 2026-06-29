function initTrueFocus(container, options = {}) {
  if (!container || container.dataset.trueFocusInit === "true") return;

  const sentence = options.sentence ?? container.dataset.sentence ?? "Les bon plan";
  const separator = options.separator ?? container.dataset.separator ?? " ";
  const manualMode = options.manualMode ?? container.dataset.manualMode === "true";
  const borderColor = options.borderColor ?? container.dataset.borderColor ?? "#E8341A";
  const glowColor = options.glowColor ?? container.dataset.glowColor ?? "rgba(232, 52, 26, 0.6)";
  const animationDuration = Number(options.animationDuration ?? container.dataset.animationDuration ?? 0.4);
  const pauseBetweenAnimations = Number(
    options.pauseBetweenAnimations ?? container.dataset.pauseBetween ?? 0.35
  );
  const staggerDelay = Number(options.staggerDelay ?? container.dataset.staggerDelay ?? 0.08);
  const entranceDuration = Number(
    options.entranceDuration ?? container.dataset.entranceDuration ?? 0.4
  );
  const noCycle = options.noCycle ?? container.dataset.noCycle === "true";

  const words = sentence.split(separator).filter(Boolean);
  if (!words.length) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let currentIndex = 0;
  let lastActiveIndex = null;
  let intervalId = null;
  let cyclingStarted = false;
  const wordEls = [];

  container.dataset.trueFocusInit = "true";
  container.classList.add("focus-container");
  if (noCycle) container.classList.add("focus-container--static");
  container.innerHTML = "";

  words.forEach((word, index) => {
    const span = document.createElement("span");
    span.className = noCycle ? "focus-word focus-word--static-enter" : "focus-word";
    span.textContent = word;
    span.style.setProperty("--border-color", borderColor);
    span.style.setProperty("--glow-color", glowColor);
    span.style.setProperty("--entrance-duration", `${entranceDuration}s`);
    span.style.setProperty("--cycle-duration", `${animationDuration}s`);
    span.style.setProperty("--stagger-index", String(index));

    if (manualMode) {
      span.addEventListener("mouseenter", () => {
        lastActiveIndex = index;
        goToIndex(index);
      });
      span.addEventListener("mouseleave", () => {
        if (lastActiveIndex !== null) goToIndex(lastActiveIndex);
      });
    }

    container.appendChild(span);
    wordEls.push(span);
  });

  const frame = document.createElement("div");
  frame.className = "focus-frame";
  frame.style.setProperty("--border-color", borderColor);
  frame.style.setProperty("--glow-color", glowColor);
  if (!noCycle) {
    frame.innerHTML = `
      <span class="corner top-left"></span>
      <span class="corner top-right"></span>
      <span class="corner bottom-left"></span>
      <span class="corner bottom-right"></span>
    `;
    container.appendChild(frame);
  }

  function scheduleFrameUpdate() {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => updateFrame());
    });
  }

  function updateHighlight() {
    if (noCycle) return;
    wordEls.forEach((el, index) => {
      const isActive = index === currentIndex;
      el.classList.toggle("focus-word--active", isActive && cyclingStarted && !manualMode);
      el.classList.toggle("focus-word--dim", !isActive && cyclingStarted && !manualMode);
    });
  }

  function updateFrame() {
    if (noCycle) return;
    const activeEl = wordEls[currentIndex];
    if (!activeEl || !cyclingStarted) {
      frame.style.opacity = "0";
      return;
    }

    const parentRect = container.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();
    const x = activeRect.left - parentRect.left;
    const y = activeRect.top - parentRect.top;

    frame.style.transition = reducedMotion
      ? "none"
      : `transform ${animationDuration}s ease, width ${animationDuration}s ease, height ${animationDuration}s ease, opacity ${animationDuration}s ease`;
    frame.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    frame.style.width = `${Math.max(activeRect.width, 1)}px`;
    frame.style.height = `${Math.max(activeRect.height, 1)}px`;
    frame.style.opacity = "1";
  }

  function goToIndex(index) {
    currentIndex = ((index % words.length) + words.length) % words.length;
    updateHighlight();
    scheduleFrameUpdate();
  }

  function startAutoPlay() {
    if (manualMode || reducedMotion || words.length <= 1) return;
    clearInterval(intervalId);
    intervalId = setInterval(() => {
      goToIndex(currentIndex + 1);
    }, (animationDuration + pauseBetweenAnimations) * 1000);
  }

  function finishEntrance() {
    cyclingStarted = true;
    wordEls.forEach((el) => {
      el.classList.add("focus-word--visible");
      if (noCycle) {
        el.classList.remove("focus-word--dim", "focus-word--active");
        el.style.willChange = "auto";
      }
    });
    if (!noCycle) {
      goToIndex(0);
      startAutoPlay();
      scheduleFrameUpdate();
      if (document.fonts?.ready) {
        document.fonts.ready.then(scheduleFrameUpdate).catch(() => {});
      }
    }
  }

  function runEntrance() {
    if (reducedMotion) {
      wordEls.forEach((el) => el.classList.add("focus-word--visible"));
      finishEntrance();
      return;
    }

    wordEls.forEach((el, index) => {
      window.setTimeout(() => {
        el.classList.add("focus-word--visible");

        if (index === wordEls.length - 1) {
          window.setTimeout(finishEntrance, entranceDuration * 1000);
        }
      }, index * staggerDelay * 1000);
    });
  }

  runEntrance();

  let resizeObserver = null;
  const onLayoutChange = () => scheduleFrameUpdate();

  if (!noCycle) {
    resizeObserver = new ResizeObserver(onLayoutChange);
    resizeObserver.observe(container);
    wordEls.forEach((el) => resizeObserver.observe(el));
    window.addEventListener("resize", onLayoutChange);
    window.addEventListener("orientationchange", onLayoutChange);
    window.addEventListener("pageshow", onLayoutChange);
  }

  return {
    destroy() {
      clearInterval(intervalId);
      if (resizeObserver) {
        resizeObserver.disconnect();
        window.removeEventListener("resize", onLayoutChange);
        window.removeEventListener("orientationchange", onLayoutChange);
        window.removeEventListener("pageshow", onLayoutChange);
      }
      container.dataset.trueFocusInit = "";
    },
    goToIndex,
  };
}

function initAllTrueFocus(root = document) {
  root.querySelectorAll("[data-true-focus]").forEach((el) => initTrueFocus(el));
}

window.initTrueFocus = initTrueFocus;
window.initAllTrueFocus = initAllTrueFocus;
