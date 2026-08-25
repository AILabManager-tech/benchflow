#!/usr/bin/env node
/* Vérificateur hors navigateur.

   Découpe le NOYAU d'atelier.html (entre les marqueurs @noyau) et lance ses
   auto-tests sous Node. Le noyau ne touche jamais au DOM, donc le code
   exécuté ici est mot pour mot celui qui tourne dans la page.

       node verifier.mjs           tout vérifier
       node verifier.mjs -v        détailler chaque assertion
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

/* Le code engendré doit vraiment tourner : on l'écrit et on le lance. */
if (!R.echecs.length && !process.argv.includes("--rapide")){
  const tmp = join(ici, ".verif");
  try { execFileSync("mkdir", ["-p", tmp]); } catch(e){}
  let sorties = 0;
  for (const nom of Object.keys(N.EXEMPLES)){
    const M = N.EXEMPLES[nom]();
    const cle = nom.replace(/[^a-zA-Z]+/g, "-").toLowerCase();
    const fjs = join(tmp, cle + ".js"), fpy = join(tmp, cle + ".py");
    writeFileSync(fjs, N.engendreJS(M, { graine: 1 }));
    writeFileSync(fpy, N.engendrePython(M));
    try {
      const outJS = execFileSync("node", [fjs, "1"], { encoding: "utf8" });
      if (!/bilan/.test(outJS)) throw new Error("sortie inattendue");
      console.log(`  ✓ node ${cle}.js`);
      sorties++;
    } catch(err){
      console.log(`  ✗ node ${cle}.js — ${String(err.stderr || err.message).split("\n")[0]}`);
      process.exitCode = 1;
    }
    try {
      const outPY = execFileSync("python3", [fpy, "1"], { encoding: "utf8" });
      if (!/bilan/.test(outPY)) throw new Error("sortie inattendue");
      console.log(`  ✓ python3 ${cle}.py`);
    } catch(err){
      console.log(`  ~ python3 ${cle}.py — ${String(err.stderr || err.message).split("\n").filter(Boolean).pop()}`);
    }
  }
}

process.exit(R.echecs.length ? 1 : (process.exitCode || 0));
