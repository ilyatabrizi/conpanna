// A tiny hand-off so screens can ask for a language switch without importing
// the app module (which would load it twice).
let handler = null;
export const onSwitchLang = (f) => { handler = f; };
export const switchLang = (l) => handler?.(l);
