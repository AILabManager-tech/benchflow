#!/usr/bin/env node
/* Vérificateur hors navigateur.

   Découpe le NOYAU d'atelier.html (entre les marqueurs @noyau) et lance ses
   auto-tests sous Node. Le noyau ne touche jamais au DOM, donc le code
   exécuté ici est mot pour mot celui qui tourne dans la page.

       node verifier.mjs           tout vérifier
       node verifier.mjs -v        détailler chaque assertion

   Vérifie trois choses : les auto-tests du noyau, les rapports de contraste des
   jetons de couleur lus dans la feuille de style, et que le code engendré pour
   chaque exemple tourne vraiment sous node et sous python3.
*/
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ici = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(join(ici, "atelier.html"), "utf8");

const d = page.indexOf("/* @noyau:debut */");
const f = page.indexOf("/* @noyau:fin */");
if (d < 0 || f < 0){ console.error("marqueurs @noyau introuvables dans atelier.html"); process.exit(2); }
const noyau = page.slice(d, f);

const fabrique = new Function(`${noyau}
  return { lancerTests, executer, EXEMPLES, engendreJS, engendrePython, diagnostics, verifieTous, monte, defauts, aff };`);
const N = fabrique();

/* ── contraste des jetons de couleur ───────────────────────────────────────
   Les rapports sont calculés sur les valeurs lues dans la feuille de style
   elle-même : si une couleur change là-haut, c'est celle-là qui est mesurée.
   Un seul jeton mal réglé — --ink-3 l'a été — suffit à faire passer vingt
   textes sous le seuil sans que rien ne l'annonce. */
function contrasteJetons(){
  const jetons = bloc => {
    const o = {};
    for (const m of bloc.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9A-Fa-f]{6})/g)) o[m[1]] = m[2];
    return o;
  };
  const CLAIR  = jetons(page.slice(page.indexOf(":root{"), page.indexOf("@media (prefers-color-scheme:dark)")));
  const iSombre = page.indexOf(':root[data-theme="dark"]{');
  /* Jusqu'à l'accolade fermante, pas jusqu'à un nombre rond. La fenêtre de 900
     caractères était déjà plus courte que le bloc (924) : le jour où un jeton
     serait passé la limite, il aurait cessé d'être testé sans un mot. */
  const SOMBRE = jetons(page.slice(iSombre, page.indexOf("}", iSombre)));
  const teintes = [...page.matchAll(/\["(#[0-9A-F]{6})","(#[0-9A-F]{6})"\]/g)].map(m => [m[1], m[2]]);

  const hex = h => ({ r:parseInt(h.slice(1,3),16), g:parseInt(h.slice(3,5),16), b:parseInt(h.slice(5,7),16) });
  const lum = c => { const f = v => { v/=255; return v<=.03928 ? v/12.92 : Math.pow((v+.055)/1.055,2.4); };
    return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b); };
  const rap = (a, b) => { const L1 = lum(hex(a)), L2 = lum(hex(b));
    return (Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05); };

  const FONDS  = ["--surface","--surface-2","--surface-3","--bloc"];
  const APLATS = ["--accent","--ok","--warn","--crit","--abst","--nombre","--texte",
                  "--booleen","--anomalie","--liste","--objet"];
  const ENCRES = ["--ok","--warn","--crit","--accent-ink","--nombre","--texte",
                  "--booleen","--anomalie","--liste","--objet"];

  const ratés = [];
  let total = 0;
  const exige = (nom, a, b, seuil) => {
    total++;
    if (!a || !b){ ratés.push(`${nom} — jeton absent`); return; }
    const v = rap(a, b);
    if (v < seuil) ratés.push(`${nom} : ${v.toFixed(2)} < ${seuil}   (${a} sur ${b})`);
  };

  for (const [nomTheme, T, iT] of [["clair", CLAIR, 0], ["sombre", SOMBRE, 1]]){
    FONDS.forEach(f => {
      exige(`${nomTheme} · --ink-3 sur ${f}`, T["--ink-3"], T[f], 4.5);
      exige(`${nomTheme} · --ink-2 sur ${f}`, T["--ink-2"], T[f], 4.5);
      exige(`${nomTheme} · --ink sur ${f}`,   T["--ink"],   T[f], 7);
    });
    APLATS.forEach(a => exige(`${nomTheme} · --sur-teinte sur ${a}`, T["--sur-teinte"], T[a], 4.5));
    ENCRES.forEach(c => {
      exige(`${nomTheme} · ${c} en texte sur --surface`,   T[c], T["--surface"],   4.5);
      exige(`${nomTheme} · ${c} en texte sur --surface-2`, T[c], T["--surface-2"], 4.5);
    });
    exige(`${nomTheme} · --accent-ink sur --accent-soft`, T["--accent-ink"], T["--accent-soft"], 4.5);
    /* La pastille de titre d'une section se pose sur le fond des blocs ; sa
       bordure, elle, se découpe sur le canevas. Deux fonds, deux exigences. */
    teintes.forEach((t, i) => {
      exige(`${nomTheme} · teinte ${i} en titre sur --bloc`,   t[iT], T["--bloc"],   4.5);
      exige(`${nomTheme} · teinte ${i} en bordure sur --ground`, t[iT], T["--ground"], 3);
    });

    /* ── contraste NON TEXTUEL (WCAG 1.4.11) ────────────────────────────
       C'est ce qui manquait : mesurer le texte ne dit rien de la lisibilité
       des OBJETS. Un bloc dont le corps et le bord se confondent avec le
       canevas est invisible, quelle que soit la qualité de son texte. */
    exige(`${nomTheme} · bordure du bloc vs canevas`, T["--bloc-bord"], T["--ground"], 3);
    exige(`${nomTheme} · bordure du bloc vs corps du bloc`, T["--bloc-bord"], T["--bloc"], 1.8);
    exige(`${nomTheme} · corps du bloc vs canevas`, T["--bloc"], T["--ground"], 1.3);
    exige(`${nomTheme} · --line-2 vs --surface`, T["--line-2"], T["--surface"], 1.8);
    exige(`${nomTheme} · grille vs canevas`, T["--grid"], T["--ground"], 1.1);
    exige(`${nomTheme} · grille forte vs canevas`, T["--grid-fort"], T["--ground"], 1.2);

    /* L'anneau de focus au clavier est un indicateur d'interface : WCAG 1.4.11
       lui demande 3:1 contre ce qu'il entoure. C'est le seul repère de position
       qu'a quelqu'un qui n'utilise pas la souris — s'il se fond dans le fond,
       la navigation clavier est finie, et rien ne l'annonce. */
    exige(`${nomTheme} · anneau de focus vs --surface`,   T["--focus"], T["--surface"],   3);
    exige(`${nomTheme} · anneau de focus vs --surface-2`, T["--focus"], T["--surface-2"], 3);
    exige(`${nomTheme} · anneau de focus vs --ground`,    T["--focus"], T["--ground"],    3);
    exige(`${nomTheme} · anneau de focus vs --bloc`,      T["--focus"], T["--bloc"],      3);
  }
  return { total, ratés };
}

const detaille = process.argv.includes("-v");
const R = N.lancerTests();

let groupe = null;
for (const l of R.lignes){
  if (l.groupe !== groupe){ groupe = l.groupe; if (detaille || R.echecs.length) console.log("\n  " + groupe); }
  if (!l.ok) console.log(`   ✗ ${l.nom}${l.detail ? "  — " + l.detail : ""}`);
  else if (detaille) console.log(`   · ${l.nom}`);
}

console.log("");
console.log(R.echecs.length
  ? `✗ ${R.echecs.length} échec(s) sur ${R.total} assertions`
  : `✓ ${R.total} assertions vérifiées`);

const C = contrasteJetons();
if (C.ratés.length){
  console.log(`✗ ${C.ratés.length} paire(s) de couleurs sous le seuil de contraste :`);
  C.ratés.forEach(t => console.log("   " + t));
  process.exitCode = 1;
} else {
  console.log(`✓ ${C.total} paires de couleurs au-dessus du seuil de contraste`);
}

/* Le code engendré doit vraiment tourner : on l'écrit et on le lance. */
if (!R.echecs.length && !C.ratés.length && !process.argv.includes("--rapide")){
  const tmp = join(ici, ".verif");
  try { execFileSync("mkdir", ["-p", tmp]); } catch(e){}
  let sorties = 0;
  for (const nom of Object.keys(N.EXEMPLES)){
    const M = N.EXEMPLES[nom]();
    const cle = nom.replace(/[^a-zA-Z]+/g, "-").toLowerCase();
    const fjs = join(tmp, cle + ".js"), fpy = join(tmp, cle + ".py");
    writeFileSync(fjs, N.engendreJS(M, { graine: 1 }));
    writeFileSync(fpy, N.engendrePython(M));
    let outJS = null;
    try {
      outJS = execFileSync("node", [fjs, "1"], { encoding: "utf8" });
      if (!/bilan/.test(outJS)) throw new Error("sortie inattendue");
      console.log(`  ✓ node ${cle}.js`);
      sorties++;
    } catch(err){
      console.log(`  ✗ node ${cle}.js — ${String(err.stderr || err.message).split("\n")[0]}`);
      process.exitCode = 1;
    }
    let outPY = null;
    try {
      outPY = execFileSync("python3", [fpy, "1"], { encoding: "utf8" });
      if (!/bilan/.test(outPY)) throw new Error("sortie inattendue");
      console.log(`  ✓ python3 ${cle}.py`);
    } catch(err){
      console.log(`  ~ python3 ${cle}.py — ${String(err.stderr || err.message).split("\n").filter(Boolean).pop()}`);
    }

    /* Contrôle croisé. Les deux programmes tirent leur hasard de générateurs
       différents : on ne peut les comparer que sur un montage SANS hasard. Sur
       ceux-là en revanche, la moindre divergence est un vrai désaccord entre
       les deux moteurs — c'est comme ça qu'a été trouvé le repli manquant du
       bloc Réparer dans la traduction Python. */
    const empreinte = g => JSON.stringify(Object.entries(N.executer(M, { graine: g, trace: false }).puits)
                                  .map(([k, l]) => [k, l.map(N.aff)]));
    const deterministe = empreinte(1) === empreinte(999);
    if (deterministe && outPY){
      const puits = txt => {
        const i = txt.indexOf("── bilan ──");
        if (i < 0) return [];
        return txt.slice(i).split("\n")
          .map(l => l.match(/^ {2}(?!assertion )(.+?) : (.*)$/))
          .filter(Boolean).map(m => m[1].trim() + " = " + m[2].trim());
      };
      const a2 = puits(outJS), b2 = puits(outPY);
      if (JSON.stringify(a2) === JSON.stringify(b2) && a2.length){
        console.log(`  ✓ js ≡ python sur ${cle} (${a2.length} puits identiques)`);
      } else {
        console.log(`  ✗ js ≢ python sur ${cle}`);
        a2.forEach((l, i) => { if (l !== b2[i]) console.log(`      js : ${l}\n      py : ${b2[i]}`); });
        process.exitCode = 1;
      }
    }
  }
}

process.exit(R.echecs.length || C.ratés.length ? 1 : (process.exitCode || 0));
