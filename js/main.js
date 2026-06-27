// Interactions de base — prêt pour vos personnalisations

const scrollBtn = document.querySelector(".scroll-btn");
const sectionDots = document.querySelectorAll(".section-indicator__dot");
const navLinks = document.querySelectorAll(".nav__link");

scrollBtn?.addEventListener("click", () => {
  window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
});

sectionDots.forEach((dot, index) => {
  dot.addEventListener("click", () => {
    sectionDots.forEach((d) => d.classList.remove("section-indicator__dot--active"));
    dot.classList.add("section-indicator__dot--active");
  });

  dot.style.cursor = "pointer";
});

navLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    const href = link.getAttribute("href");
    if (!href || href === "#") {
      e.preventDefault();
      navLinks.forEach((l) => l.classList.remove("nav__link--active"));
      link.classList.add("nav__link--active");
    }
  });
});
