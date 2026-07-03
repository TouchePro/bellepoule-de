# Compétitions par équipes

## Principe général (règlement FIE)

Une compétition par équipes oppose des équipes de **N tireurs titulaires** (+ un nombre
configurable de réservistes). Un match d'équipe se dispute en **relais** : chaque
titulaire d'une équipe affronte chaque titulaire de l'équipe adverse exactement une
fois, soit **N² relais** au total (9 relais pour des équipes de 3, conformément au
règlement FIE).

Les relais sont **progressifs** : le score de la rencontre est le cumul des touches
(ou points) marqués par chaque équipe sur l'ensemble des relais déjà joués. Chaque
relais s'arrête dès que le cumul d'une équipe atteint le palier de ce relais
(5-10-15-…-45 pour des équipes de 3, par paliers de 5), ou à la fin du temps imparti.
L'équipe qui atteint la cible totale la première (45 pour des équipes de 3), ou qui a
le plus de touches à la fin du temps réglementaire, gagne la rencontre.

## Ce qui change selon l'arme

Le système ne traite pas toutes les armes de la même façon :

- **Épée** : pas de priorité — une touche double simultanée est possible et compte
  pour les deux équipes. Un bouton dédié « ⚔ double » permet de l'enregistrer.
- **Fleuret / Sabre** : priorité classique, une seule équipe marque par touche.
  Les cartons (pénalités) peuvent être enregistrés par tireur pendant un relais,
  avec l'escalade habituelle (blanc → jaune → rouge → noir selon le motif).
- **Sabre Laser** : arme spécifique à ce projet (zones A/B/C = 1/3/5 points), sans
  équivalent dans le règlement FIE. Deux modes sont possibles au choix de
  l'organisateur (voir plus bas) :
  - **Touches** (par défaut) : chaque touche compte pour 1, comme les autres armes.
  - **Points** : chaque touche compte pour la valeur de sa zone (1/3/5), avec un
    sélecteur de zone dédié lors de la saisie.

## Activer une compétition par équipes

Une compétition devient une compétition par équipes en positionnant
`competition.isTeamEvent = true` (case à cocher lors de la création). Les options
suivantes, dans `competition.settings`, ajustent le format :

| Champ                        | Défaut      | Effet                                                             |
| ----------------------------- | ----------- | ------------------------------------------------------------------ |
| `minTeamSize`                 | `3`         | Nombre de titulaires par équipe (généralise le format FIE 3v3)     |
| `teamReserveCount`             | `1`         | Nombre de réservistes autorisés par équipe                        |
| `laserTeamMode`                | `'touches'` | Sabre Laser uniquement : `'touches'` ou `'points'` (zones)         |
| `teamRelayStepSize`             | `5`         | Palier de progression par relais (avancé — laisser à 5 sauf besoin spécifique) |

La cible totale de la rencontre se déduit automatiquement :
`teamRelayStepSize × minTeamSize²` (45 pour le format FIE par défaut : 5×3²).

## Utilisation

Tout se passe dans la fenêtre « Gestion équipes » (bouton dans le menu Actions de
l'en-tête, visible uniquement quand `isTeamEvent` est actif) :

1. **Équipes** : créer les équipes, affecter les tireurs (position 1..`minTeamSize`
   pour les titulaires, jusqu'à `teamReserveCount` réservistes).
2. **Poule** : « Générer la poule » crée les rencontres round-robin entre toutes les
   équipes complètes, avec les relais correspondants. La saisie des scores se fait
   assaut par assaut (bouton « Scorer »), avec les affordances spécifiques à l'arme
   décrites ci-dessus.
3. **Tableau** : une fois un classement de poule disponible, « Générer le tableau »
   crée le tableau à élimination directe (têtes de série = classement de poule). Les
   tours suivants (et les exempts) se créent automatiquement au fur et à mesure que
   les résultats précédents sont connus — pas besoin de régénérer manuellement.
4. **Classement** : classement des équipes (victoires, relais individuels
   gagnés/perdus, touches cumulées), exportable en CSV.

## Limites connues

- **Pas de saisie live arène/tablette** pour les rencontres d'équipe : la saisie des
  scores se fait uniquement dans la fenêtre « Gestion équipes » (pas d'écran arbitre
  dédié ni de retour temps réel comme pour les matchs individuels).
- **Cartons non persistés entre sessions** : les cartons enregistrés pendant un relais
  sont conservés en mémoire le temps de la session ; ils ne sont pas encore stockés en
  base de données et sont donc perdus à la fermeture de la fenêtre.
- **Collision de têtes de série connue** : le calcul générique de placement en tableau
  (`generateSeedingChart`, partagé avec le tableau individuel) a un bug documenté qui
  peut faire disparaître la tête de série n°2 pour certaines tailles de tableau — ce
  n'est pas spécifique aux équipes, voir `tableCalculations.test.ts`.
- Le nombre de réservistes n'est pas encore utilisé pour les remplacements en cours de
  match (affectation uniquement).
