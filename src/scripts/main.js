import { initNavigation } from "./navigation.js";
import { initHeroGlobe } from "./hero-globe.js";

initNavigation();
initHeroGlobe();

const year = document.querySelector("#year");
if (year) year.textContent = String(new Date().getFullYear());
