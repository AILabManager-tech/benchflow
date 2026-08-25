# Atelier de blocs

Un bac à sable pour **concevoir un pipeline, puis le faire tourner**. On pose des blocs,
on tire des fils, on donne une fonction à chacun — et des valeurs typées traversent le
montage pendant qu'une horloge simulée avance, que les files se remplissent et que les
pannes arrivent.

Sert à **éprouver une idée de pipeline avant de l'écrire en code** : où une valeur se perd,
ce qu'une validation refuse, ce qu'une reprise bornée absorbe, ce qui finit chez l'humain,
et ce que tout ça coûte en temps.

Un seul fichier HTML. Aucune dépendance. Ouvrable hors ligne, pour toujours.

## Lancer

- l'icône **Atelier de blocs** dans le menu d'applications, ou
- `atelier-blocs` au terminal, ou
- ouvrir `atelier.html` dans un navigateur.

Le lanceur ouvre une fenêtre d'application sans barre d'adresse, avec son propre profil de
navigateur — le montage sauvegardé lui appartient et ne se mélange pas au reste.

## Les trois principes tenus

**Aucun repli silencieux.** Un mode inconnu, une expression fautive, une conversion
impossible produisent une *anomalie qui voyage* sur un fil — jamais un zéro par défaut. Un
bloc qui ne sait pas traiter une anomalie ne l'avale pas : il la retransmet telle quelle,
sans exécuter sa fonction, et le journal le dit.

**Rien n'est masqué.** Chaque valeur qui passe s'affiche sur son fil, chaque décision est
journalisée avec son instant simulé, chaque file d'attente se compte, chaque bloc rapporte
son taux d'occupation.

**Reproductible.** Tout le hasard vient d'une graine. Même graine, même exécution —
sinon un scénario ne voudrait rien dire.

## Ce qu'il y a dedans

**26 comportements** répartis en six familles :

| Famille | Blocs |
|---|---|
| Entrée | Source, Générateur (suite / uniforme / normale / liste), Jeu de données (CSV ou JSON) |
| Transformation | Fonction, Script, Convertir, Formater |
| Contrôle | Valider, Aiguiller (*n* voies), Filtrer, Attendre, Limiteur de débit |
| Agrégation | Fusionner, Fenêtre, Accumuler, Compter, Statistiques |
| Fiabilité | Réparer (budget + usure + backoff), Disjoncteur, Aléa de panne, Refuser |
| Sortie | Sortie, Rebut, Assertion, Sonde |

À l'ouverture, l'atelier charge le **traitement des commandes d'une boutique en ligne**.
Ce ne sont pas des entiers déguisés : dix vraies lignes de commande entrent par un jeu de
données CSV, chaque bloc lit des champs qui existent — quantité, prix unitaire, pays — et
applique une règle qu'on pourrait défendre en réunion. Une quantité de 0 ou de 40 est
refusée, le sous-total s'ajoute à l'enregistrement, l'expédition s'aiguille par zone
(taxes du Québec, douane américaine, forfait international), le paiement passe par une
passerelle limitée à cinq appels par seconde qui tombe parfois en panne, une reprise
bornée rattrape ce qu'elle peut, et le reste part au traitement manuel.

On voit l'enregistrement s'enrichir en traversant : `objet · 5 champs` à l'entrée,
`6 champs` après le sous-total, `8 champs` après la taxe et la facture. Changer un taux
et regarder les totaux bouger prend dix secondes — c'est la différence entre un schéma
et un modèle.

**Six types de valeur** : nombre, texte, booléen, liste, objet, anomalie. Les types se
propagent statiquement dans le graphe : on connaît le type porté par un fil avant
d'exécuter quoi que ce soit.

**Cinq réglages avancés sur *tous* les blocs** : temps de traitement, variation du temps,
coût par valeur, traitements simultanés (d'où les files d'attente), et taux de panne
aléatoire. Sans eux un pipeline n'est qu'un dessin ; avec eux, c'est un modèle.

**Blocs forgés.** La forge (`✎ Forger`) permet d'écrire son propre comportement : ses
ports, ses réglages, son code. Un bloc forgé se comporte ensuite comme les autres et
voyage dans le fichier du montage — donc il se partage avec lui.

## Sections et étages

Un **encadré de section** regroupe des blocs pour expliquer. Un bloc lui appartient quand
son **centre** est dedans — règle franche, qui se juge à l'œil, et qui décide aussi bien du
déplacement groupé que de la couleur : la barre de gauche d'un bloc prend la couleur de sa
section, sa pastille d'en-tête garde celle de sa famille. Si deux encadrés se recouvrent, le
plus petit l'emporte.

Quand le montage s'allonge au-delà de l'écran, **`Ctrl R` le range en étages** : les vagues
se suivent de gauche à droite, et le surplus repart à la ligne un étage plus bas. Le sens de
lecture reste unique — alterner le sens raccourcirait les fils de raccord au prix de la
seule chose qui compte dans un schéma de principe. Le nombre de colonnes par étage se règle
dans le panneau du montage (`0` = autant que l'écran en accepte) ; `Ctrl E` force des étages
courts.

## Le temps

L'exécution se calcule **d'un trait** — un ordonnanceur à événements discrets, sans
animation — puis **s'enregistre**. La barre du bas rejoue cet enregistrement : pas à pas,
à vitesse réglable, en avant comme en arrière. Ce qu'on regarde n'est jamais le calcul,
c'est sa relecture. D'où le retour en arrière gratuit.

- **Chronologie** — un diagramme de Gantt de tous les traitements.
- **Mesures** — durée, débit, coût, occupation par bloc, file maximale, et la désignation
  du goulot d'étranglement.
- **Simulation ×N** — rejoue le montage N fois avec N graines, et donne la distribution :
  moyenne, p95, écart-type, histogrammes, ce qui arrive à chaque puits.

## Scénarios

Un scénario fige des entrées et une graine, puis énonce ce qu'on attend : ce qu'un puits
doit recevoir, combien, combien d'anomalies, quelle durée maximale, quel coût. C'est le
test unitaire du montage — après chaque modification, on sait tout de suite ce qu'on a
cassé. Les blocs **Assertion** posés dans le flux alimentent les mêmes résultats.

Les quatre montages d'exemple livrés viennent avec leurs scénarios, tous verts.

## Ce qui sort d'ici

- **JavaScript** — un fichier autonome qui embarque le moteur et les fonctions
  réellement exécutées, obtenues par `Function.toString`. Ce qui tourne dans la page et
  ce qui tourne dans le fichier sont le *même code* : aucune dérive possible.
  `node montage.js` donne exactement le même journal que l'atelier.
- **Python** — traduction fidèle du flux (mêmes blocs, mêmes ports, mêmes règles de
  propagation des anomalies), sans l'horloge simulée. Les expressions JavaScript passent
  par un traducteur restreint qui échoue bruyamment plutôt que d'inventer.
- **schema.json** pour la skill `/blocs`, **Mermaid**, et le montage brut.

## Raccourcis

`Ctrl K` ouvre la palette de commandes — tout y est. Les principaux :

| | |
|---|---|
| `Ctrl ⏎` / `Maj ⏎` | exécuter avec ou sans animation |
| `Espace` · `←` `→` | jouer/pause · reculer/avancer d'un événement |
| `Ctrl Z` / `Ctrl ⇧ Z` | annuler / rétablir |
| `Ctrl C` `Ctrl V` `Ctrl D` | copier, coller, dupliquer |
| `Ctrl A` · `Maj + glisser` | tout sélectionner · sélection par cadre |
| `Ctrl R` · `Ctrl 0` | ranger par vagues · tout voir |
| `Ctrl S` | enregistrer dans un fichier |
| `?` | aide complète |

## Vérification

Le fichier est coupé en deux moitiés par les marqueurs `@noyau:debut` / `@noyau:fin`. Le
**noyau** — types, catalogue, moteur, diagnostics, scénarios, engendrement de code — ne
touche jamais au DOM. Il tourne donc tel quel hors du navigateur :

```
node verifier.mjs        226 assertions · 124 paires de couleurs au-dessus du
                         seuil de contraste · engendre et exécute les 4 exemples
                         en JavaScript et en Python
node verifier.mjs -v     détail de chaque assertion
node verifier.mjs --rapide   assertions seulement
```

Les deux traductions d'un même montage sont aussi **comparées entre elles** : pour les
montages sans hasard, ce que produit le JavaScript engendré et ce que produit le Python
doivent coïncider ligne pour ligne. C'est ce contrôle qui a révélé qu'un repli du bloc
Réparer manquait côté Python, et que la sérialisation JSON des deux langages ne s'accordait
pas sur `240` contre `240.0`.

Le contrôle de contraste lit les couleurs **dans la feuille de style elle-même** et vérifie
124 paires des deux thèmes : le texte contre son fond (seuil AA, 4,5:1) **et les surfaces
entre elles** (seuil 1.4.11, 3:1) — bordure d'un bloc contre le canevas, corps du bloc
contre le canevas, trait contre panneau. Les deux axes sont nécessaires : la première
version passait le contrôle du texte pendant que les blocs se fondaient dans le fond à
1,09:1. Un seul jeton mal réglé suffit à faire basculer vingt textes sous le seuil sans que
rien ne l'annonce.

Les mêmes assertions tournent dans la page, onglet **Moteur**. Un seul jeu de tests, deux
endroits pour le lancer.

```
node mutation.mjs        casse chaque correctif un par un et exige
                         que la suite devienne rouge
```

Une suite verte ne prouve rien tant qu'on n'a pas vérifié qu'elle sait devenir rouge. Le
banc de mutation remet le code fautif d'origine à la place de chaque correctif et refuse
de passer si les assertions restent vertes. Il a trouvé, à son premier essai, un correctif
qu'aucune assertion ne couvrait.

Un groupe d'assertions porte le nom **« Aucun repli silencieux »** : il tient en respect les
chemins par lesquels une valeur pourrait disparaître sans un mot — fil vers un bloc absent,
lot jamais complété, générateur coupé par une limite, enregistrement tronqué, anomalie
changée en texte anodin, fil rebranché sur un autre port après un changement de réglage,
port d'un bloc forgé écarté parce que son nom était impossible.
Chacun de ces cas a existé dans le code et a été refermé ; les assertions sont là pour
qu'ils ne reviennent pas.

## Reprise de l'esquisse

Un montage ouvert depuis un fichier passe d'abord par une remise d'aplomb : identifiants
uniques, fils dont les deux extrémités existent, noms de port possibles. Ce n'est jamais
fait en douce — une boîte énumère chaque retouche.

> **Un montage est du code.** Les expressions des blocs et le corps des blocs forgés sont
> du JavaScript, exécuté tel quel dès qu'on appuie sur Exécuter. C'est tout l'intérêt de
> l'atelier — et cela veut dire qu'ouvrir un fichier `.atelier.json` reçu de quelqu'un
> revient à lancer son code. À traiter comme un script, pas comme un document. Le panneau
> **Code engendré**, onglet *Montage brut*, permet de lire un fichier avant de l'exécuter.

L'esquisse précédente enregistrait son montage sous la clé `atelier`. Au premier
démarrage, s'il en existe un, il est **converti et chargé**, avec un récapitulatif de ce
qui a changé (`Transformer` devient `Fonction` ; `Aiguiller` passe d'une condition unique à
une table de voies, `oui`/`non` devenant `voie 1`/`autre`). L'ancienne sauvegarde n'est
jamais effacée.

## Fichiers

```
atelier.html    l'application entière — noyau (§0-§11) puis interface (§12-§22)
verifier.mjs    lance les auto-tests du noyau sous Node, hors navigateur
mutation.mjs    vérifie que ces auto-tests savent devenir rouges
README.md       ce fichier
```
