# CLAUDE.md — Atelier de blocs

Simulateur de pipelines en **un seul fichier HTML**. On monte un schéma-bloc, on
l'exécute, des valeurs typées le traversent pendant qu'une horloge simulée avance.
Voir `README.md` pour ce que fait le logiciel ; ce fichier-ci dit comment y toucher
sans le casser.

## Invariants — à ne pas violer sans accord explicite

**1. Un seul fichier, zéro dépendance.**
`atelier.html` se suffit à lui-même et s'ouvre hors ligne. Pas de `package.json`,
pas de bundler, pas de `npm install`, aucune requête réseau — le fichier n'en fait plus une seule. Découper en modules détruirait la propriété
centrale du projet. Si tu penses qu'il faut un build, dis-le et attends la
réponse — ne le fais pas.

**2. Le noyau ne touche jamais au DOM.**
Le fichier est coupé par `/* @noyau:debut */` et `/* @noyau:fin */`. Tout ce qui
est entre les deux — types, catalogue, moteur, diagnostics, scénarios,
engendrement de code — tourne tel quel sous Node. `verifier.mjs` découpe cette
tranche et lance ses assertions hors navigateur. **Un seul `document.` ou
`window.` dans le noyau casse toute la vérification.** Ce qui décide du
comportement va dans le noyau (`sectionDuBloc` y est pour cette raison) ; ce qui
ne fait que dessiner reste dans l'interface.

**3. Aucun repli silencieux.**
C'est la règle qui définit le projet, pas un slogan. Un mode inconnu, une
expression fautive, une conversion impossible produisent une **anomalie qui
voyage** sur un fil — jamais un zéro par défaut. Une valeur qui se perd est
comptée et nommée. Une exécution tronquée le dit. Un bloc qui retient encore des
valeurs à la fin le déclare.

Le groupe d'assertions **« Aucun repli silencieux »** tient en respect huit
chemins par lesquels une valeur disparaissait autrefois sans un mot. Ils ont tous
existé dans le code. N'en rouvre pas un.

**4. Le code JavaScript engendré n'est pas une traduction.**
`engendreJS` émet le moteur et les fonctions du catalogue via `Function.toString`.
Page et fichier engendré sont le même code, par construction. Ne remplace jamais
ça par une réécriture à la main : la fidélité viendrait alors d'une promesse au
lieu d'une garantie.

**5. Reproductibilité.**
Tout le hasard vient d'une graine (`mulberry32`). Même graine, même exécution.
N'introduis jamais `Math.random()`, `Date.now()` ni l'ordre d'itération d'un `Set`
dans un chemin d'exécution du moteur.

**6. Le français fait partie du protocole, pas de l'habillage.**
Les noms de ports — `refus`, `réparé`, `épuisé`, `voie 1` — sont des
identifiants. Ils sont **sérialisés dans les montages enregistrés** (`l.de.p`) et
servent à rebrancher les fils à l'ouverture. Les traduire n'est pas une
traduction : c'est une migration de format de fichier, qui rebrancherait par
position tous les montages existants — exactement le défaut silencieux que le
diagnostic « un fil a changé de port » existe pour attraper.

Décision prise le 2026-08-25 : **le projet reste francophone**. Interface, code,
diagnostics, exemples, commits. Ce n'est pas un manque, c'est un choix assumé, à
annoncer dans le README.

Si l'anglais revient un jour, ce ne sera pas en renommant le modèle mais en
séparant *identifiant stable* et *libellé affiché*, avec une version de format et
des tests de compatibilité. Ça n'a rien à voir avec une session de traduction.

**7. Nom public : `pipeline-simulation-workbench`.**
Décidé le 2026-08-25. C'est le nom du **dépôt** — descriptif, cherchable,
compréhensible sans parler français, ce qui compense une interface qui, elle,
reste francophone.

Le dossier local reste `atelier-blocs`, le fichier reste `atelier.html`, et le
titre affiché reste « Atelier de blocs ». **Ne les renomme pas pour « aligner » :**
le lanceur `~/.local/bin/atelier-blocs` et l'entrée `.desktop` pointent dessus et
vivent hors du dépôt. Un dépôt peut porter un autre nom que son dossier de
travail, ça n'a jamais gêné personne.

## Défaut connu, non corrigé

**Le déterminisme ne tient pas pour le code écrit par l'utilisateur.** Un bloc
Script ou un bloc forgé peut appeler `Math.random()` ou `Date.now()` directement,
et la garantie « même graine, même exécution » saute — sans un mot, ce que le
principe 3 interdit. Reproduit :

```
Script « return Math.round(Math.random()*1000) », même graine 7
  exécution 1 : 890      exécution 2 : 880
Script « return Math.round(hasard()*1000) », même graine 7
  identiques ✓
```

Conséquence : un scénario bâti sur un tel bloc devient instable en silence.
Le correctif tient en quelques lignes — masquer `Math` et `Date` dans la portée
du code utilisateur, en laissant `hasard()` comme seule source d'aléa.

## Vérifier — les quatre boucles

```
node verifier.mjs        assertions du noyau · contraste des couleurs ·
                         engendre puis EXÉCUTE les 5 exemples en JS et en Python ·
                         compare les deux sorties sur les montages déterministes
node verifier.mjs -v     détail de chaque assertion
node mutation.mjs        casse chaque correctif un par un et exige que la
                         suite devienne ROUGE (une suite verte ne prouve rien
                         tant qu'on n'a pas vérifié qu'elle sait échouer)
node sonde.mjs <script>  charge la page dans Chrome headless via CDP, rapporte
                         les erreurs console et exécute ton script d'inspection
```

Les assertions tournent aussi **dans la page**, onglet *Moteur*. Un seul jeu de
tests, deux endroits pour le lancer.

`mutation.mjs` porte le motif exact de chaque correctif. Si un motif devient
introuvable parce que le code a bougé, il **échoue** au lieu de faire semblant de
vérifier — c'est voulu, remets le motif à jour.

## Ce que la vérification a déjà attrapé

À citer avant de proposer un raccourci :

- un correctif dont **aucune assertion** ne testait rien (trouvé par mutation) ;
- un test qui passait **par chance**, grâce au temps réel écoulé entre deux appels ;
- deux **désaccords réels** entre le moteur JavaScript et sa traduction Python ;
- un jeton de couleur à **4,46** au lieu de 4,5, qui faisait basculer vingt textes
  sous le seuil sans que rien ne l'annonce ;
- des blocs à **1,09:1** contre le canevas — le contrôle mesurait le texte, jamais
  les surfaces.

## Conventions

- Interface, commentaires et messages de commit en **français (Québec)**.
- Les commentaires expliquent **pourquoi**, pas quoi. Beaucoup disent quel bug la
  ligne empêche de revenir — ne les supprime pas en « nettoyant ».
- Commiter librement. **Ne jamais pousser sans accord explicite** ; aucun dépôt
  distant n'existe à ce jour.
- Ports locaux : rester dans `20000–29999` (la sonde navigateur utilise 29222+).

## Pièges connus

- Le lanceur `~/.local/bin/atelier-blocs` et l'entrée `.desktop` sont **hors du
  dossier** et pointent sur `atelier.html`. Renommer le fichier les casse.
- L'atelier restaure le montage sauvegardé au démarrage : après un changement
  d'exemple par défaut, il faut vider `localStorage` ou charger l'exemple à la
  main pour le voir.
- `zsh` analyse toute la ligne avant de l'exécuter : une apostrophe non fermée
  dans une commande annule aussi le patch Python qui la précède sur la même ligne.
  Ça a déjà fait perdre deux correctifs. Sépare les commandes.
