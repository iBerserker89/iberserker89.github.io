export function initNavigation(root = document) {
  const menuButton = root.querySelector(".menu-toggle");
  const navigationMenu = root.querySelector("#navigation");
  const mobileViewport = root.defaultView.matchMedia("(max-width: 760px)");

  if (menuButton && navigationMenu) {
    function setMenuOpen(open) {
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
      navigationMenu.classList.toggle(
        "is-collapsed",
        mobileViewport.matches && !open,
      );
    }

    menuButton.hidden = false;
    setMenuOpen(false);

    menuButton.addEventListener("click", () => {
      setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true");
    });

    navigationMenu.addEventListener("click", (event) => {
      if (event.target.closest("a")) setMenuOpen(false);
    });

    root.addEventListener("keydown", (event) => {
      if (
        event.key === "Escape" &&
        menuButton.getAttribute("aria-expanded") === "true"
      ) {
        setMenuOpen(false);
        menuButton.focus();
      }
    });

    mobileViewport.addEventListener("change", () => setMenuOpen(false));
  }
}

export function initProjectReveal(root = document) {
  const projects = root.querySelector("#projetos");
  if (!projects) return () => {};

  const cards = [...projects.querySelectorAll(".project-card")];
  if (!cards.length) return () => {};

  const win = root.defaultView ?? window;
  const reducedMotion = win.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );

  if (
    reducedMotion.matches ||
    typeof win.IntersectionObserver !== "function"
  ) {
    cards.forEach((card) => card.classList.add("is-visible"));
    return () => {};
  }

  projects.classList.add("projects-reveal-ready");

  const observer = new win.IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -8% 0px",
    },
  );

  cards.forEach((card) => observer.observe(card));

  return () => {
    observer.disconnect();
    projects.classList.remove("projects-reveal-ready");

    cards.forEach((card) => {
      card.classList.remove("is-visible");
    });
  };
}
