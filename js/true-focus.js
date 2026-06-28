function initTrueFocus(container, options = {}) {
  if (!container || container.dataset.trueFocusInit === "true") return;

  const sentence = options.sentence ?? container.dataset.sentence ?? "Les bon plan";
  const separator = options.separator ?? container.dataset.separator ?? " ";
  const manualMode = options.manualMode ?? container.dataset.manualMode === "true";
  const blurAmount = Number(options.blurAmount ?? container.dataset.blurAmount ?? 5);
  const borderColor = options.borderColor ?? container.dataset.borderColor ?? "#E8341A";
  const glowColor = options.glowColor ?? container.dataset.glowColor ?? "rgba(232, 52, 26, 0.6)";
  const animationDuration = Number(options.animationDuration ?? container.dataset.animationDuration ?? 0.5);
  const pauseBetweenAnimations = Number(
    options.pauseBetweenAnimations ?? container.dataset.pauseBetween ?? 1
  );

  const words = sentence.split(separator).filter(Boolean);
  if (!words.length) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let currentIndex = 0;
  let lastActiveIndex = null;
  let intervalId = null;
  const wordEls = [];

  container.dataset.trueFocusInit = "true";
  container.classList.add("focus-container");
  container.innerHTML = "";

  words.forEach((word, index) => {
    const span = document.createElement("span");
    span.className = "focus-word";
    span.textContent = word;
    span.style.setProperty("--border-color", borderColor);
    span.style.setProperty("--glow-color", glowColor);
    span.style.transition = `filter ${animationDuration}s ease`;

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
  frame.innerHTML = `
    <span class="corner top-left"></span>
    <span class="corner top-right"></span>
    <span class="corner bottom-left"></span>
    <span class="corner bottom-right"></span>
  `;
  container.appendChild(frame);

  function updateBlur() {
    wordEls.forEach((el, index) => {
      const isActive = index === currentIndex;
      el.style.filter = isActive ? "blur(0px)" : `blur(${blurAmount}px)`;
      el.classList.toggle("active", isActive && !manualMode);
    });
  }

  function updateFrame() {
    const activeEl = wordEls[currentIndex];
    if (!activeEl) return;

    const parentRect = container.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();
    const x = activeRect.left - parentRect.left;
    const y = activeRect.top - parentRect.top;

    frame.style.transition = reducedMotion
      ? "none"
      : `transform ${animationDuration}s ease, width ${animationDuration}s ease, height ${animationDuration}s ease, opacity ${animationDuration}s ease`;
    frame.style.transform = `translate(${x}px, ${y}px)`;
    frame.style.width = `${activeRect.width}px`;
    frame.style.height = `${activeRect.height}px`;
    frame.style.opacity = currentIndex >= 0 ? "1" : "0";
  }

  function goToIndex(index) {
    currentIndex = ((index % words.length) + words.length) % words.length;
    updateBlur();
    updateFrame();
  }

  function startAutoPlay() {
    if (manualMode || reducedMotion || words.length <= 1) return;
    clearInterval(intervalId);
    intervalId = setInterval(() => {
      goToIndex(currentIndex + 1);
    }, (animationDuration + pauseBetweenAnimations) * 1000);
  }

  goToIndex(0);
  startAutoPlay();

  const resizeObserver = new ResizeObserver(() => updateFrame());
  resizeObserver.observe(container);
  wordEls.forEach((el) => resizeObserver.observe(el));
  window.addEventListener("resize", updateFrame);

  return {
    destroy() {
      clearInterval(intervalId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateFrame);
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
