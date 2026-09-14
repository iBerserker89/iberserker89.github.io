export function initPlayground(root = document) {
  const viewportButtons = root.querySelectorAll(
    ".viewport-switcher button",
  );

  const componentPreview = root.querySelector(".component-preview");

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
}
