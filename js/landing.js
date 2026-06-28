document.querySelectorAll(".faq-item__btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const item = btn.closest(".faq-item");
    const body = item?.querySelector(".faq-item__body");
    const isOpen = btn.getAttribute("aria-expanded") === "true";

    document.querySelectorAll(".faq-item__btn").forEach((other) => {
      if (other === btn) return;
      other.setAttribute("aria-expanded", "false");
      other.closest(".faq-item")?.querySelector(".faq-item__body")?.classList.remove("is-open");
    });

    btn.setAttribute("aria-expanded", isOpen ? "false" : "true");
    body?.classList.toggle("is-open", !isOpen);
  });
});

const sections = document.querySelectorAll("section[id], header[id]");
const navLinks = document.querySelectorAll('.landing-nav .nav__link[href*="#"]');

function updateActiveNav() {
  if (!document.body.classList.contains("page-home")) return;

  const scrollY = window.scrollY + 120;
  let current = "hero";

  sections.forEach((section) => {
    if (section.offsetTop <= scrollY) current = section.id;
  });

  navLinks.forEach((link) => {
    const href = link.getAttribute("href") || "";
    const hash = href.includes("#") ? href.split("#")[1] : "";
    link.classList.toggle("nav__link--active", hash === current);
  });
}

if (document.body.classList.contains("page-home")) {
  window.addEventListener("scroll", updateActiveNav, { passive: true });
  updateActiveNav();
}
