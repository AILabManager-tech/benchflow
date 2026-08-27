#!/usr/bin/env node
/* Capture d'écran du README, refaite à la commande.

   Une image collée à la main se périme sans le dire : l'interface bouge, la
   capture reste. Celle-ci se régénère, donc elle peut être remise à jour au
   même titre qu'un test.

       node capture.mjs                 → capture.png (thème clair)
       node capture.mjs sombre          → capture-sombre.png

   Comme sonde.mjs, c'est un outil de développement : il lui faut Chrome.
   L'application, elle, n'a toujours aucune dépendance. */
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ici = dirname(fileURLToPath(import.meta.url));
const SOMBRE = process.argv[2] === "sombre";
const SORTIE = join(ici, SOMBRE ? "capture-sombre.png" : "capture.png");
const PORT = 29224;
const PAGE = "file://" + join(ici, "atelier.html");

const chrome = spawn("google-chrome", [
  "--headless=new", `--remote-debugging-port=${PORT}`,
  "--user-data-dir=/tmp/claude-1000/chrome-capture", "--no-first-run",
  "--no-default-browser-check", "--disable-gpu", "--allow-file-access-from-files",
  "--hide-scrollbars", "--force-device-scale-factor=2",
  "--window-size=1600,1000", "about:blank"
], { stdio: "ignore" });

const dodo = ms => new Promise(r => setTimeout(r, ms));

let cible;
for (let i = 0; i < 60 && !cible; i++){
  try {
    const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    cible = l.find(x => x.type === "page");
  } catch(e){}
  if (!cible) await dodo(250);
}
if (!cible){ console.error("Chrome n'a pas répondu"); process.exit(2); }

const ws = new WebSocket(cible.webSocketDebuggerUrl);
let id = 0; const attentes = new Map();
ws.addEventListener("message", ev => {
  const m = JSON.parse(ev.data);
  if (m.id && attentes.has(m.id)){ attentes.get(m.id)(m); attentes.delete(m.id); }
});
const cmd = (method, params) => new Promise(r => {
  const n = ++id; attentes.set(n, r);
  ws.send(JSON.stringify({ id: n, method, params: params || {} }));
});

await new Promise(r => ws.addEventListener("open", r));
await cmd("Page.enable");
await cmd("Runtime.enable");
await cmd("Page.navigate", { url: PAGE });
await dodo(2600);

/* Un montage neuf, thème voulu, sans l'encart d'astuce ni la sauvegarde d'une
   séance précédente : la capture doit montrer ce que voit quelqu'un qui ouvre
   le fichier pour la première fois, pas l'état de la machine qui la produit. */
const preparation = `(() => {
  try { localStorage.clear(); } catch(e){}
  document.documentElement.setAttribute("data-theme", ${JSON.stringify(SOMBRE ? "dark" : "light")});
  const a = document.getElementById("astuce"); if (a) a.style.display = "none";
  M = EXEMPLES["Commandes d'une boutique en ligne"]();
  chargeForges(M.forges); dessine(); inspecteur(); panneaux(); dessineJournal();
  return { blocs: M.blocs.length, theme: document.documentElement.getAttribute("data-theme") };
})()`;
const prep = await cmd("Runtime.evaluate", { expression: preparation, returnByValue: true });
if (prep.result?.exceptionDetails){
  const d = prep.result.exceptionDetails;
  console.error("préparation impossible :", (d.exception && d.exception.description) || d.text);
  ws.close(); chrome.kill(); process.exit(1);
}
await cmd("Runtime.evaluate", { expression: "ajusteVue()" });
await dodo(900);

const tir = await cmd("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
const data = tir.result && tir.result.data;
if (!data){ console.error("capture vide"); ws.close(); chrome.kill(); process.exit(1); }
writeFileSync(SORTIE, Buffer.from(data, "base64"));

const octets = Buffer.from(data, "base64").length;
console.log(`✓ ${SORTIE.split("/").pop()} — ${(octets / 1024).toFixed(0)} ko` +
            `, ${SOMBRE ? "thème sombre" : "thème clair"}, 3200×2000 (×2)`);
console.log(`  ${prep.result.result.value.blocs} blocs · thème ${prep.result.result.value.theme}`);
ws.close(); chrome.kill(); process.exit(0);
