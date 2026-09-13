const menuButton = document.querySelector(".menu-toggle");
const navigationMenu = document.querySelector("#navigation");
const mobileViewport = window.matchMedia("(max-width: 760px)");

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

  document.addEventListener("keydown", (event) => {
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

const viewportButtons = document.querySelectorAll(
  ".viewport-switcher button",
);

const componentPreview = document.querySelector(".component-preview");

if (viewportButtons.length > 0 && componentPreview) {
  viewportButtons.forEach((button) => {
    button.addEventListener("click", () => {
      viewportButtons.forEach((viewportButton) => {
        const isActive = viewportButton === button;

        viewportButton.setAttribute("aria-pressed", String(isActive));
      });

      componentPreview.dataset.viewport = button.dataset.viewport;
    });
  });
}

const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();
