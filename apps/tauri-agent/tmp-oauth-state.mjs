const pages = await (await fetch("http://127.0.0.1:9222/json")).json();
const page = pages.find((p) => p.type === "page" && String(p.url).includes("tauri.localhost"));
if (!page) {
  console.log("NO_PAGE", JSON.stringify(pages.map((p) => ({ type: p.type, url: p.url }))));
  process.exit(0);
}
const ws = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
let seq = 0;
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) pending.get(m.id)(m);
});
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const id = ++seq;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
const expression = `(() => {
  const c = window.Clerk && window.Clerk.client;
  const s = c && {
    signedIn: (c.signedInSessions || []).map(x => x.id),
    sessions: (c.sessions || []).map(x => x.id),
    last: c.lastActiveSessionId || null,
    signInStatus: c.signIn && c.signIn.status,
    signInSession: c.signIn && c.signIn.createdSessionId,
    signUpSession: c.signUp && c.signUp.createdSessionId,
    user: !!(window.Clerk.user),
  };
  const err = document.body.innerText.includes("Sign-in did not finish");
  return JSON.stringify({ err, user: !!(window.Clerk && window.Clerk.user), s, text: (document.body.innerText || "").slice(0, 400) });
})()`;
const res = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
console.log(res.result?.result?.value || JSON.stringify(res.result || res));
ws.close();
