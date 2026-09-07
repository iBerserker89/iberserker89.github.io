const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#navigation");
const mobileViewport = window.matchMedia("(max-width: 760px)");

if (menuButton && navigation) {
  function setMenuOpen(open) {
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    navigation.classList.toggle(
      "is-collapsed",
      mobileViewport.matches && !open,
    );
  }

  menuButton.hidden = false;
  setMenuOpen(false);

  menuButton.addEventListener("click", () => {
    setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true");
  });

  navigation.addEventListener("click", (event) => {
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

const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();
