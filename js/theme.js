// Theme and calm mode, applied to <html>.
import { $ } from "./ui.js";
import { get } from "./store.js";
const darkMq = matchMedia("(prefers-color-scheme: dark)");
export function applyTheme(pref = get().theme, animate = false) {
  const d = document.documentElement;
  const dark = pref === "dark" || (pref === "system" && darkMq.matches);
  if (animate) { d.classList.add("theming"); setTimeout(() => d.classList.remove("theming"), 500); }
  d.dataset.theme = pref;
  d.dataset.mode = dark ? "dark" : "light";
  $("#theme-color")?.setAttribute("content", dark ? "#110B08" : "#F7F2EC");
}
darkMq.addEventListener?.("change", () => applyTheme());
export function applyCalm() { document.documentElement.classList.toggle("calm", !!get().prefs.reduceMotion); }
