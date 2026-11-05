// The "server" of the preview. What the owner decides in the admin panel —
// sold-out items, paused branches, order statuses, campaigns, loyalty rules —
// lives here, and both the app and the panel listen to it. On one device the
// two tabs talk instantly (BroadcastChannel + storage events). The live
// version replaces this file with Conpanna's own server.
const KEY = "conpanna.hub.v1";
const DEF = () => ({
  soldOut: [], prices: {}, paused: {}, orderStatus: {}, broadcasts: [], autoAdvance: true,
  loyalty: { stamps: 8 }, journeys: { welcome: true, winback: true, birthday: true, review: true, stamp: true }, replies: {},
});
let hub = DEF();
const read = () => { try { const r = localStorage.getItem(KEY); if (r) hub = { ...DEF(), ...JSON.parse(r) }; } catch (e) {} };
read();
const subs = new Set();
let bc = null;
try { bc = new BroadcastChannel("conpanna"); bc.onmessage = (e) => { if (e.data?.type === "hub") { read(); emit(); } else subs.forEach((f) => f(hub, e.data)); }; } catch (e) {}
addEventListener("storage", (e) => { if (e.key === KEY) { read(); emit(); } else if (e.key === "conpanna.v1") subs.forEach((f) => f(hub, { type: "app" })); });
function emit(msg = { type: "hub" }) { subs.forEach((f) => { try { f(hub, msg); } catch (err) { console.error(err); } }); }

export const getHub = () => hub;
export function setHub(patch) {
  hub = { ...hub, ...(typeof patch === "function" ? patch(hub) : patch) };
  try { localStorage.setItem(KEY, JSON.stringify(hub)); } catch (e) {}
  try { bc?.postMessage({ type: "hub" }); } catch (e) {}
  emit();
}
export const onHub = (f) => { subs.add(f); return () => subs.delete(f); };
export const ping = (msg) => { try { bc?.postMessage(msg); } catch (e) {} };

export const isSoldOut = (id) => hub.soldOut.includes(id);
export const priceOf = (it) => hub.prices[it.id] ?? it.price;
export const isPaused = (branch) => !!hub.paused[branch] && hub.paused[branch] > Date.now();
export const stampsGoal = () => hub.loyalty?.stamps || 8;
