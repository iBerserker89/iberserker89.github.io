import { initNavigation } from "./navigation.js";
import { initPlayground } from "./playground.js";

initNavigation();
initPlayground();

const year = document.querySelector("#year");
if (year) year.textContent = String(new Date().getFullYear());
