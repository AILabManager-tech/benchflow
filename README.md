# Atelier de blocs

Bac à sable de flux de données. On pose des blocs, on tire des fils, on donne une
petite fonction à chacun, et on regarde des valeurs typées traverser le montage.

Sert à **éprouver une idée de pipeline avant de l'écrire en code** : où une valeur se
perd, ce qu'une validation refuse, ce qu'une réparation bornée absorbe, ce qui finit
chez l'humain.

## Lancer

- l'icône **Atelier de blocs** dans le menu d'applications, ou
- `atelier-blocs` au terminal, ou
- ouvrir `atelier.html` dans un navigateur.

Le lanceur ouvre une fenêtre d'application sans barre d'adresse, avec son propre
profil de navigateur — le montage sauvegardé lui appartient et ne se mélange pas au
reste.

## Ce qu'il y a dedans

Neuf comportements : Source, Transformer, Valider, Aiguiller, Fusionner, Réparer,
Compter, Refuser, Sortie. Quatre types de valeur : nombre, texte, booléen, anomalie.

Les encadrés de section regroupent visuellement des blocs. Ils ne changent rien à
l'exécution — ils expliquent.

Le bouton `→ schema.json` convertit le montage au format de la skill `/blocs`, qui
en fait un schéma présentable.

## Principes tenus

- **Aucun repli silencieux.** Un mode inconnu, une expression fautive, une capacité
  absente produisent une *anomalie qui voyage*, jamais un résultat par défaut.
- **Rien n'est masqué.** Chaque valeur qui passe s'affiche sur son fil; le journal
  garde la trace de chaque décision.
- **Aucune dépendance.** Un seul fichier HTML, ouvrable hors ligne, pour toujours.

## État

Première esquisse, volontairement minimale. Le moteur d'exécution est couvert par
26 assertions (comportements, réparation bornée à budget variable, expression
fautive, montage sans source, exécution de bout en bout sans boucle infinie).

Pas de dépôt Git pour l'instant — à initialiser si le développement se poursuit.
