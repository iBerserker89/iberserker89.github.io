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
