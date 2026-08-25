#!/usr/bin/env node
/* Banc de mutation.

   Une suite de tests verte ne prouve rien tant qu'on n'a pas vérifié qu'elle
   sait devenir rouge. Ce banc remet, un par un, le code fautif d'origine à la
   place de chaque correctif, et exige que les assertions censées le couvrir
   passent au rouge. Une assertion qui reste verte sur du code cassé ne teste
   rien — et c'est exactement ce qu'il a trouvé la première fois qu'il a tourné.

       node mutation.mjs

   Chaque entrée de MUTATIONS porte le motif exact du code corrigé. Si un motif
   devient introuvable, c'est que le code a bougé : le banc le dit et échoue,
   plutôt que de laisser croire qu'il vérifie encore quelque chose.

   Les correctifs qui vivent dans l'interface ne sont pas ici : le noyau seul
   tourne hors navigateur. Ils ont été éprouvés de la même façon, à la main,
   en chargeant des copies mutées dans Chrome. */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ici = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(join(ici, "atelier.html"), "utf8");

const MUTATIONS = [
 { nom: "fil vers un bloc absent / comportement inconnu",
   de: `        const cible = indexBloc[l.vers.b];
        if (!cible){`,
   vers: `        const cible = indexBloc[l.vers.b]; if (!cible || !E[cible.id]) return;
        if (false){`,
   attend: [/fil vers un bloc absent/, /comportement inconnu/] },

 { nom: "diagnostic du fil pendant",
   de: `    if (!bv){ ajoute("err", bd.id, \`\${bd.nom} — fil vers un bloc absent\`,`,
   vers: `    if (!bv){ ajoute("info", bd.id, \`RIEN\`,`,
   attend: [/diagnostic le voit sans exécuter/] },

 { nom: "fenêtre : déclaration de ce qui reste",
   de: `  reste(etat, p){
    const n = (etat.tampon || []).length;`,
   vers: `  resteDESACTIVE(etat, p){
    const n = (etat.tampon || []).length;`,
   attend: [/fenêtre inachevée déclare/, /journal le dit/] },

 { nom: "limite de valeurs annoncée",
   de: `      else if (!R.arret){
        /* Couper un générateur sans le dire`,
   vers: `      else if (false){
        /* Couper un générateur sans le dire`,
   attend: [/générateur coupé par la limite l'annonce/, /ligne de journal explicite/] },

 { nom: "enregistrement tronqué : dernière image tenue à jour",
   de: `    if (tronque){
      /* On fusionne dans la dernière étape au lieu d'en ajouter une. */`,
   vers: `    if (tronque){
      return;
      /* On fusionne dans la dernière étape au lieu d'en ajouter une. */`,
   attend: [/dernière image reste à jour/] },

 { nom: "enregistrement tronqué : annonce au journal",
   de: `    if (tronque && !R.traceTronquee){`,
   vers: `    if (false && !R.traceTronquee){`,
   attend: [/en le disant/] },

 { nom: "anomalie contaminant une fusion en liste",
   de: `    const ano = vals.find(estAnomalie);
    if (ano) return { z: ano };`,
   vers: `    const ano = vals.find(estAnomalie);
    if (ano && p.mode !== "liste") return { z: ano };`,
   attend: [/ne se change pas en texte anodin/] },

 { nom: "fil rebranché sur un autre port",
   de: `    if (l.de.p !== undefined && ps !== undefined && ps !== l.de.p && !listeS.includes(l.de.p))`,
   vers: `    if (false && l.de.p !== undefined && ps !== undefined && ps !== l.de.p && !listeS.includes(l.de.p))`,
   attend: [/retirer une voie signale/, /nommant l'ancien port/] },

 { nom: "identifiants en double",
   de: `  dedoublonne(M.blocs, "b", "Le bloc");`,
   vers: `  /* mutation */ (M.blocs || []).forEach(x => vus.add(x.id));`,
   attend: [/identifiant en double est renuméroté/, /retouche est rapportée/] },

 { nom: "fil sans extrémité retiré à l'import",
   de: `  M.liens = M.liens.filter(l => l && l.de && l.vers && existe.has(l.de.b) && existe.has(l.vers.b));`,
   vers: `  M.liens = M.liens.filter(l => true);`,
   attend: [/fil sans extrémité est retiré/, /en le disant/] },

 { nom: "Math et Date masqués dans le code de l'utilisateur",
   de: `    const brute = new Function("Math", "Date", ...args, \`"use strict"; return (\${src});\`);
    const f = (...a) => brute(PORTEE.Math, PORTEE.Date, ...a);`,
   vers: `    const f = new Function(...args, \`"use strict"; return (\${src});\`);`,
   attend: [/Math\.random\(\) refusé/, /Date\.now\(\) refusé/, /new Date\(\) sans argument refusé/] },

 { nom: "corps de bloc : même portée que les expressions",
   de: `    const brute = new Function("Math", "Date", ...args, \`"use strict";\\n\${src}\`);
    const f = (...a) => brute(PORTEE.Math, PORTEE.Date, ...a);`,
   vers: `    const f = new Function(...args, \`"use strict";\\n\${src}\`);`,
   attend: [/bloc Script ne peut plus tirer hors graine/] },

 { nom: "cache d'expressions borné",
   de: `  if (_cacheExpr.size > CACHE_MAX && !_cacheExpr.has(cle)) _cacheExpr.clear();`,
   vers: `  /* mutation : plus de borne */`,
   attend: [/cache d'expressions reste borné/] },

 { nom: "bloc forgé traduit en Python",
   de: `    py: () => \`raise RuntimeError("« \${(def.nom || "bloc forgé").replace(/"/g, "'")} » est un bloc forgé : \``,
   vers: `    py: () => \`return js_corps(p["_corps_forge"], {})\` + \`\``,
   attend: [/bloc forgé traduit en Python dit franchement/, /clé de paramètre inexistante/] },

 { nom: "description d'un bloc forgé ramenée à du texte",
   de: `    aide: texte(def.aide) || "Bloc forgé sur mesure.",`,
   vers: `    aide: def.aide || "Bloc forgé sur mesure.",`,
   attend: [/description d'un bloc forgé est ramenée/] },

 { nom: "noms de port impossibles d'un bloc forgé",
   de: `  (M.forges || []).forEach(def => {
    const c = compDe(def.id);
    if (!c || !c.rejetes || !c.rejetes.length) return;`,
   vers: `  (M.forges || []).forEach(def => {
    const c = compDe(def.id);
    if (true) return;`,
   attend: [/port écarté est dénoncé/] },

 { nom: "noms impossibles signalés à l'ouverture",
   de: `    if (mauvais.length)
      notes.push(\`Le bloc forgé « \${def.nom || def.id} » déclare des noms impossibles`,
   vers: `    if (false)
      notes.push(\`Le bloc forgé « \${def.nom || def.id} » déclare des noms impossibles`,
   attend: [/signalé dès l'ouverture du fichier/] }
];

function lance(source){
  const d = source.indexOf("/* @noyau:debut */"), f = source.indexOf("/* @noyau:fin */");
  const noyau = source.slice(d, f);
  try {
    const fab = new Function(noyau + "\nreturn lancerTests();");
    return fab();
  } catch(err){ return { plante: err.message, lignes: [] }; }
}

const base = lance(page);
console.log(`référence : ${base.reussis}/${base.total} assertions vertes\n`);
if (base.echecs.length){ console.log("le code de référence n'est pas vert, on s'arrête"); process.exit(2); }

let faux = 0, ok = 0;
for (const m of MUTATIONS){
  if (!page.includes(m.de)){
    console.log(`?? « ${m.nom} » : motif introuvable, mutation impossible`);
    faux++; continue;
  }
  const mute = page.replace(m.de, m.vers);
  const r = lance(mute);
  if (r.plante){ console.log(`   « ${m.nom} » : le noyau muté ne se charge pas (${r.plante})`); faux++; continue; }
  const noms = r.echecs.map(e => e.nom);
  const attrapes = m.attend.filter(re => noms.some(n => re.test(n)));
  const manques = m.attend.filter(re => !noms.some(n => re.test(n)));
  if (manques.length){
    console.log(`✗ « ${m.nom} »`);
    console.log(`   ${r.echecs.length} assertion(s) rouge(s), mais AUCUNE ne correspond à : ${manques.map(String).join(" ")}`);
    if (noms.length) console.log(`   rouges : ${noms.slice(0,4).join(" · ")}`);
    faux++;
  } else {
    console.log(`✓ « ${m.nom} » → ${attrapes.length} assertion(s) rouge(s) sur ${r.echecs.length}`);
    ok++;
  }
}
console.log(`\n${ok} correctif(s) réellement couverts · ${faux} non couverts`);
process.exit(faux ? 1 : 0);
