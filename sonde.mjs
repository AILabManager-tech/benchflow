#!/usr/bin/env node
/* Sonde navigateur.

   Le noyau se vérifie sous Node ; l'interface, non. Cette sonde ouvre
   atelier.html dans Chrome sans fenêtre, pilote la page par le protocole de
   débogage, rapporte TOUTE erreur console et exécute le script d'inspection
   qu'on lui donne.

       node sonde.mjs                 charge la page, signale les erreurs
       node sonde.mjs regarde.js      … puis évalue regarde.js dans la page

   Le script reçoit la page entière : `M`, `executer`, `dessine`, le DOM. Il doit
   renvoyer un objet sérialisable (une promesse est attendue).

   Seul outil du dépôt à demander autre chose que Node — il lui faut Chrome. Il
   ne sert qu'au développement : l'application, elle, n'a toujours aucune
   dépendance. C'est cette sonde qui a trouvé l'encart d'astuce qui volait les
   clics, le télescopage des étiquettes de ports, et la dérive des blocs qui
   suivaient un encadré. */
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { readFileSync } from "node:fs";

const PORT = 29222;
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const PAGE = "file://" + join(dirname(fileURLToPath(import.meta.url)), "atelier.html");
const script = process.argv[2] ? readFileSync(process.argv[2], "utf8") : "({ok:true})";

/* Profil jetable dans le dossier temporaire du système : un chemin en dur
   marchait sur une machine et sur une seule. */
const PROFIL = join(tmpdir(), "benchflow-sonde");

const chrome = spawn("google-chrome", [
  "--headless=new", `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROFIL}`, "--no-first-run", "--no-default-browser-check",
  "--disable-gpu", "--allow-file-access-from-files", "--window-size=1600,1000", "about:blank"
], { stdio: "ignore" });

const dodo = ms => new Promise(r => setTimeout(r, ms));

async function cible(){
  for (let i = 0; i < 60; i++){
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const l = await r.json();
      const p = l.find(x => x.type === "page");
      if (p) return p;
    } catch(e){}
    await dodo(250);
  }
  throw new Error("Chrome n'a pas répondu");
}

const t = await cible();
const ws = new WebSocket(t.webSocketDebuggerUrl);
let id = 0;
const attentes = new Map();
const journal = [];
const reseau = [];

ws.addEventListener("message", ev => {
  const m = JSON.parse(ev.data);
  if (m.id && attentes.has(m.id)){ attentes.get(m.id)(m); attentes.delete(m.id); return; }
  if (m.method === "Runtime.exceptionThrown"){
    const d = m.params.exceptionDetails;
    journal.push({ k: "EXCEPTION", txt: (d.exception && d.exception.description) || d.text,
                   ligne: d.lineNumber });
  }
  if (m.method === "Runtime.consoleAPICalled" && ["error","warning"].includes(m.params.type)){
    journal.push({ k: m.params.type.toUpperCase(),
                   txt: m.params.args.map(a => a.value ?? a.description ?? a.type).join(" ") });
  }
  if (m.method === "Log.entryAdded" && m.params.entry.level === "error"){
    journal.push({ k: "LOG", txt: m.params.entry.text, url: m.params.entry.url });
  }
  /* Invariant 1 : le fichier ne fait AUCUNE requête réseau. C'était affirmé
     dans le README et dans un commentaire, jamais vérifié. Une balise <link>,
     une police, une image distante glissées un jour dans l'en-tête casseraient
     « ouvrable hors ligne » sans un mot — et publieraient l'adresse IP de qui
     l'ouvre. On regarde donc passer les requêtes. */
  if (m.method === "Network.requestWillBeSent") reseau.push(m.params.request.url);
});
const envoie = (method, params) => new Promise(res => {
  const n = ++id; attentes.set(n, res);
  ws.send(JSON.stringify({ id: n, method, params: params || {} }));
});

await new Promise(r => ws.addEventListener("open", r));
await envoie("Network.enable");
await envoie("Runtime.enable");
await envoie("Log.enable");
await envoie("Page.enable");
await envoie("Page.navigate", { url: PAGE });
await dodo(2500);

const r = await envoie("Runtime.evaluate", {
  expression: `(async function(){ try { return JSON.stringify(await (${script})); } catch(e){ return JSON.stringify({ERREUR: e.message, pile: String(e.stack).split("\\n").slice(0,4)}); } })()`,
  returnByValue: true, awaitPromise: true
});
await dodo(600);

console.log("── console ──");
if (!journal.length) console.log("  (rien : aucune erreur, aucun avertissement)");
journal.forEach(l => console.log(`  ${l.k}: ${l.txt}${l.url ? "  ← " + l.url : ""}`));
console.log("── inspection ──");
const v = r.result && r.result.result && r.result.result.value;
try { console.log(JSON.stringify(JSON.parse(v), null, 1)); } catch(e){ console.log(v, r.result); }

/* Le code de sortie disait toujours 0 : posée dans une CI, la sonde aurait
   été verte avec la console pleine d'erreurs. Elle est rouge si la page a
   signalé quoi que ce soit, ou si le script d'inspection a levé. */
/* La page elle-même est la seule requête légitime : tout le reste est un
   chargement distant, donc une violation. */
const distantes = reseau.filter(u => u !== PAGE && !u.startsWith("data:"));
console.log("── réseau ──");
console.log(distantes.length
  ? distantes.map(u => "  ✗ " + u).join("\n")
  : `  (aucune requête hors du fichier — ${reseau.length} au total, toutes locales)`);

const casse = journal.length > 0 || distantes.length > 0 || /"ERREUR"/.test(String(v));
if (casse) console.log(`\n✗ ${journal.length} message(s) de la page` +
                       (distantes.length ? ` · ${distantes.length} requête(s) réseau` : "") +
                       (/"ERREUR"/.test(String(v)) ? " · le script d'inspection a levé" : ""));
ws.close(); chrome.kill();
process.exit(casse ? 1 : 0);
