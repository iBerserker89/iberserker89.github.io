import { initNavigation } from "./navigation.js";
import { initProjectReveal } from "./navigation.js";
import { initHeroGlobe } from "./hero-globe.js";

initNavigation();
initProjectReveal();
initHeroGlobe();

const year = document.querySelector("#year");
if (year) year.textContent = String(new Date().getFullYear());
