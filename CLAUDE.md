# CLAUDE.md — Atelier de blocs

Simulateur de pipelines en **un seul fichier HTML**. On monte un schéma-bloc, on
l'exécute, des valeurs typées le traversent pendant qu'une horloge simulée avance.
Voir `README.md` pour ce que fait le logiciel ; ce fichier-ci dit comment y toucher
sans le casser.

## Invariants — à ne pas violer sans accord explicite

**1. Un seul fichier, zéro dépendance.**
`atelier.html` se suffit à lui-même et s'ouvre hors ligne. Pas de `package.json`,
pas de bundler, pas de `npm install`, pas de CDN (l'unique exception est Google
Fonts, qui dégrade proprement). Découper en modules détruirait la propriété
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
