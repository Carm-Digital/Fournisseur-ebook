const scrollBtn = document.querySelector(".scroll-btn");
const sectionDots = document.querySelectorAll(".section-indicator__dot");
const sections = ["hero", "stats", "features", "cta"];

scrollBtn?.addEventListener("click", () => {
  const current = getCurrentSection();
  const nextIndex = Math.min(current + 1, sections.length - 1);
  document.getElementById(sections[nextIndex])?.scrollIntoView({ behavior: "smooth" });
});

sectionDots.forEach((dot) => {
  dot.addEventListener("click", (e) => {
    e.preventDefault();
    const id = dot.dataset.section || dot.getAttribute("href")?.slice(1);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  });
});

function getCurrentSection() {
  const scrollY = window.scrollY + window.innerHeight / 3;
  let current = 0;
  sections.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el && el.offsetTop <= scrollY) current = i;
  });
  return current;
}

function updateActiveDot() {
  const current = getCurrentSection();
  sectionDots.forEach((dot, i) => {
    dot.classList.toggle("section-indicator__dot--active", i === current);
  });

  if (scrollBtn) {
    scrollBtn.hidden = current >= sections.length - 1;
  }
  const ring = document.querySelector(".scroll-ring");
  if (ring) ring.hidden = current >= sections.length - 1;
}

if (sections.some((id) => document.getElementById(id))) {
  window.addEventListener("scroll", updateActiveDot, { passive: true });
  updateActiveDot();
}
