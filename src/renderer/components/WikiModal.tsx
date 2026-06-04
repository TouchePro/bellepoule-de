import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from '../contexts/TranslationContext';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface WikiSection {
  type: 'h2' | 'h3' | 'p' | 'ul' | 'ol' | 'tip' | 'warning' | 'kbd';
  text?: string;
  items?: string[];
  shortcuts?: { key: string; desc: string }[];
}

interface WikiArticle {
  id: string;
  icon: string;
  category: 'start' | 'competition' | 'phases' | 'remote' | 'advanced';
  title: { fr: string; en: string };
  content: { fr: WikiSection[]; en: WikiSection[] };
}

const ARTICLES: WikiArticle[] = [
  {
    id: 'quickstart',
    icon: '🚀',
    category: 'start',
    title: { fr: 'Démarrage rapide', en: 'Quick Start' },
    content: {
      fr: [
        { type: 'p', text: 'BellePoule Modern est un logiciel de gestion de tournois d\'escrime. Il prend en charge les poules, les tableaux d\'élimination directe et la saisie distante via tablette.' },
        { type: 'h2', text: 'Flux de travail standard' },
        { type: 'ol', items: [
          'Créer une compétition (arme, catégorie, genre)',
          'Ajouter les tireurs dans l\'onglet Appel et les pointer',
          'Générer les poules et saisir les scores',
          'Valider le classement des poules → accès au Tableau',
          'Saisir les scores du tableau jusqu\'à la finale',
          'Consulter les Résultats et exporter le classement final',
        ]},
        { type: 'h2', text: 'Raccourcis indispensables' },
        { type: 'kbd', shortcuts: [
          { key: 'Ctrl+K', desc: 'Palette de commandes (recherche rapide)' },
          { key: '?', desc: 'Aide des raccourcis clavier' },
          { key: 'Ctrl+N', desc: 'Nouvelle compétition' },
          { key: 'Échap', desc: 'Fermer une fenêtre / Annuler' },
        ]},
        { type: 'tip', text: 'Utilisez Ctrl+K pour naviguer rapidement entre les compétitions ouvertes, accéder aux paramètres ou créer une nouvelle compétition.' },
      ],
      en: [
        { type: 'p', text: 'BellePoule Modern is a fencing tournament management software. It handles pools, direct elimination brackets, and remote scoring via tablets.' },
        { type: 'h2', text: 'Standard Workflow' },
        { type: 'ol', items: [
          'Create a competition (weapon, category, gender)',
          'Add fencers in the Check-in tab and mark them present',
          'Generate pools and enter scores',
          'Validate pool ranking → access to the Bracket',
          'Enter bracket scores up to the final',
          'View Results and export the final ranking',
        ]},
        { type: 'h2', text: 'Essential Shortcuts' },
        { type: 'kbd', shortcuts: [
          { key: 'Ctrl+K', desc: 'Command palette (quick search)' },
          { key: '?', desc: 'Keyboard shortcuts help' },
          { key: 'Ctrl+N', desc: 'New competition' },
          { key: 'Esc', desc: 'Close window / Cancel' },
        ]},
        { type: 'tip', text: 'Use Ctrl+K to quickly navigate between open competitions, access settings, or create a new competition.' },
      ],
    },
  },
  {
    id: 'competition',
    icon: '🏆',
    category: 'competition',
    title: { fr: 'Créer une compétition', en: 'Create a Competition' },
    content: {
      fr: [
        { type: 'p', text: 'Une compétition est définie par son arme, son genre et sa catégorie. Ces paramètres déterminent les règles de scoring et les formules disponibles.' },
        { type: 'h2', text: 'Armes disponibles' },
        { type: 'ul', items: [
          '⚔️ Épée — touche n\'importe où, score max 15 par défaut',
          '🤺 Fleuret — cible limitée au torse, scoring standard',
          '🗡️ Sabre — touche au-dessus de la ceinture, scoring rapide',
          '⚡ Sabre Laser — zones A/B/C avec points variables (1/3/5)',
          '🎛️ À la carte — formule entièrement personnalisable',
        ]},
        { type: 'h2', text: 'Catégories' },
        { type: 'ul', items: [
          'Poussins (U11), Benjamins (U13), Minimes (U15)',
          'Cadets (U17), Juniors (U20), Seniors',
          'Vétérans V1 à V4',
        ]},
        { type: 'h2', text: 'Formules' },
        { type: 'p', text: 'BellePoule propose des formules prédéfinies adaptées au nombre de tireurs. Vous pouvez aussi utiliser le Constructeur de formule pour créer des enchaînements de phases (poules → tableau → classement) avec des règles d\'avancement personnalisées.' },
        { type: 'tip', text: 'La couleur de compétition aide à distinguer les onglets lorsque plusieurs compétitions sont ouvertes simultanément.' },
      ],
      en: [
        { type: 'p', text: 'A competition is defined by its weapon, gender, and category. These parameters determine scoring rules and available formulas.' },
        { type: 'h2', text: 'Available Weapons' },
        { type: 'ul', items: [
          '⚔️ Epee — touch anywhere, default max score 15',
          '🤺 Foil — target limited to torso, standard scoring',
          '🗡️ Sabre — touches above the waist, fast scoring',
          '⚡ Laser Sabre — zones A/B/C with variable points (1/3/5)',
          '🎛️ Custom — fully customizable formula',
        ]},
        { type: 'h2', text: 'Categories' },
        { type: 'ul', items: [
          'U11, U13, U15 (Youth)',
          'U17 (Cadet), U20 (Junior), Senior',
          'Veterans V1 to V4',
        ]},
        { type: 'h2', text: 'Formulas' },
        { type: 'p', text: 'BellePoule provides predefined formulas adapted to the number of fencers. You can also use the Formula Builder to create phase sequences (pools → bracket → ranking) with custom advancement rules.' },
        { type: 'tip', text: 'The competition color helps distinguish tabs when multiple competitions are open simultaneously.' },
      ],
    },
  },
  {
    id: 'checkin',
    icon: '✅',
    category: 'competition',
    title: { fr: 'Phase d\'Appel', en: 'Check-in Phase' },
    content: {
      fr: [
        { type: 'p', text: 'L\'Appel est la première phase. Elle permet de gérer la liste des tireurs et de confirmer leur présence avant le début de la compétition.' },
        { type: 'h2', text: 'Gestion des tireurs' },
        { type: 'ul', items: [
          'Ajouter des tireurs manuellement ou par import (CSV, XML, FFE)',
          'Pointer chaque tireur présent (coche verte)',
          '"Tout pointer" pour marquer tous les inscrits comme présents',
          'Définir le statut : Présent, Forfait, Abandon',
        ]},
        { type: 'h2', text: 'Import de tireurs' },
        { type: 'ul', items: [
          'Format CSV — colonnes : Nom, Prénom, Club, Licence, Classement',
          'Format XML — export standard FFE',
          'Format FFE Connect — connexion directe à la fédération',
        ]},
        { type: 'warning', text: 'Il faut au minimum 4 tireurs pointés pour générer les poules. Un message d\'erreur s\'affiche si ce seuil n\'est pas atteint.' },
        { type: 'h2', text: 'Statuts des tireurs' },
        { type: 'ul', items: [
          '⚪ Non pointé — inscrit mais absent',
          '🟢 Présent — pointé, participera à la compétition',
          '🔵 Qualifié — a passé les poules avec succès',
          '🔴 Éliminé — sorti du tableau',
          '⚫ Forfait / Abandon — retiré de la compétition',
        ]},
      ],
      en: [
        { type: 'p', text: 'Check-in is the first phase. It manages the fencer list and confirms their presence before the competition starts.' },
        { type: 'h2', text: 'Managing Fencers' },
        { type: 'ul', items: [
          'Add fencers manually or via import (CSV, XML, FFE)',
          'Check in each present fencer (green checkmark)',
          '"Check in all" to mark all registered fencers as present',
          'Set status: Present, Forfeit, Withdrawal',
        ]},
        { type: 'h2', text: 'Fencer Import' },
        { type: 'ul', items: [
          'CSV format — columns: Last name, First name, Club, License, Ranking',
          'XML format — standard FFE export',
          'FFE Connect — direct federation connection',
        ]},
        { type: 'warning', text: 'At least 4 checked-in fencers are required to generate pools. An error message is shown if this threshold is not met.' },
        { type: 'h2', text: 'Fencer Statuses' },
        { type: 'ul', items: [
          '⚪ Not checked in — registered but absent',
          '🟢 Present — checked in, will compete',
          '🔵 Qualified — passed the pool phase',
          '🔴 Eliminated — knocked out of the bracket',
          '⚫ Forfeit / Withdrawal — removed from competition',
        ]},
      ],
    },
  },
  {
    id: 'pools',
    icon: '🎯',
    category: 'phases',
    title: { fr: 'Phase de Poules', en: 'Pool Phase' },
    content: {
      fr: [
        { type: 'p', text: 'Les poules sont des mini-tournois en round-robin. Chaque tireur affronte tous les autres tireurs de sa poule. Le classement final détermine qui accède au tableau.' },
        { type: 'h2', text: 'Génération des poules' },
        { type: 'p', text: 'BellePoule répartit automatiquement les tireurs en poules de taille optimale selon le nombre de participants. La répartition peut être ajustée manuellement dans la phase de Préparation.' },
        { type: 'h2', text: 'Saisie des scores' },
        { type: 'ul', items: [
          'Cliquez sur une case dans la grille pour saisir le score',
          'Format : score du tireur en ligne vs tireur en colonne',
          'V = Victoire, score max configurable (défaut : 5)',
          'Le vainqueur est noté V, le perdant son score réel',
        ]},
        { type: 'h2', text: 'Critères de classement' },
        { type: 'ol', items: [
          'Ratio V/M (victoires sur matchs joués)',
          'Indice (touches données − touches reçues)',
          'Touches données (TD)',
          'Confrontation directe (en cas d\'égalité)',
          'Classement initial',
        ]},
        { type: 'h2', text: 'Tours de poules' },
        { type: 'p', text: 'Une formule peut comporter plusieurs tours de poules. Les tireurs sont redistribués entre chaque tour selon leur classement intermédiaire.' },
        { type: 'tip', text: 'La saisie distante (tablette arbitre) permet de saisir les scores en temps réel depuis les arènes pendant les poules.' },
      ],
      en: [
        { type: 'p', text: 'Pools are round-robin mini-tournaments. Each fencer faces all others in their pool. The final ranking determines who advances to the bracket.' },
        { type: 'h2', text: 'Pool Generation' },
        { type: 'p', text: 'BellePoule automatically distributes fencers into optimally-sized pools based on participant count. Distribution can be manually adjusted in the Preparation phase.' },
        { type: 'h2', text: 'Score Entry' },
        { type: 'ul', items: [
          'Click a cell in the grid to enter the score',
          'Format: row fencer\'s score vs column fencer',
          'V = Victory, configurable max score (default: 5)',
          'The winner is marked V, the loser gets their actual score',
        ]},
        { type: 'h2', text: 'Ranking Criteria' },
        { type: 'ol', items: [
          'V/M ratio (victories to bouts ratio)',
          'Index (touches scored − touches received)',
          'Touches scored (TS)',
          'Direct encounter (in case of tie)',
          'Initial seeding',
        ]},
        { type: 'h2', text: 'Pool Rounds' },
        { type: 'p', text: 'A formula can include multiple pool rounds. Fencers are redistributed between rounds based on their intermediate ranking.' },
        { type: 'tip', text: 'Remote scoring (referee tablet) allows real-time score entry from arenas during pools.' },
      ],
    },
  },
  {
    id: 'tableau',
    icon: '🏅',
    category: 'phases',
    title: { fr: 'Tableau d\'élimination', en: 'Elimination Bracket' },
    content: {
      fr: [
        { type: 'p', text: 'Le tableau d\'élimination directe (DE) place les tireurs en bracket selon leur classement de poules. Les perdants sont éliminés jusqu\'à la finale.' },
        { type: 'h2', text: 'Types de tableaux' },
        { type: 'ul', items: [
          'Tableau classique — élimination simple, de 2 à 256 tireurs',
          'Double élimination — les perdants passent dans un bracket repêchage',
          'Petite finale — match pour la 3ème place (configurable)',
        ]},
        { type: 'h2', text: 'Têtes de série' },
        { type: 'p', text: 'Le seeding est automatique selon le classement des poules. Les 4 (ou 8) premiers sont placés comme têtes de série pour éviter de se retrouver trop tôt dans le tableau.' },
        { type: 'h2', text: 'Saisie des scores du tableau' },
        { type: 'ul', items: [
          'Cliquez sur une MatchCard pour ouvrir la saisie',
          'Score max configurable (défaut : 15 pour épée)',
          'Mort subite : en cas d\'égalité au bout du temps, tirage au sort puis score à 1 touche',
          'Cartons : jaune (+1 pt à l\'adversaire), rouge (+1 pt), noir (exclusion)',
        ]},
        { type: 'warning', text: 'Le tableau ne devient accessible qu\'une fois toutes les poules terminées et le classement validé.' },
        { type: 'tip', text: 'Le chronomètre est intégré à chaque match. Raccourci : Espace pour démarrer/pauser.' },
      ],
      en: [
        { type: 'p', text: 'The direct elimination (DE) bracket places fencers according to their pool ranking. Losers are eliminated until the final.' },
        { type: 'h2', text: 'Bracket Types' },
        { type: 'ul', items: [
          'Classic bracket — single elimination, 2 to 256 fencers',
          'Double elimination — losers move to a repechage bracket',
          'Bronze medal match — 3rd place match (configurable)',
        ]},
        { type: 'h2', text: 'Seeding' },
        { type: 'p', text: 'Seeding is automatic based on pool ranking. The top 4 (or 8) are seeded to prevent early high-profile matchups.' },
        { type: 'h2', text: 'Bracket Score Entry' },
        { type: 'ul', items: [
          'Click a MatchCard to open the score entry',
          'Configurable max score (default: 15 for epee)',
          'Sudden death: in case of tie at time, coin toss then 1-touch score',
          'Cards: yellow (+1 pt to opponent), red (+1 pt), black (exclusion)',
        ]},
        { type: 'warning', text: 'The bracket is only accessible once all pools are finished and the ranking has been validated.' },
        { type: 'tip', text: 'A timer is integrated into each match. Shortcut: Space to start/pause.' },
      ],
    },
  },
  {
    id: 'remote',
    icon: '📡',
    category: 'remote',
    title: { fr: 'Saisie distante', en: 'Remote Scoring' },
    content: {
      fr: [
        { type: 'p', text: 'La saisie distante permet aux arbitres de saisir les scores depuis une tablette ou un smartphone via Wi-Fi. Un serveur Express est intégré à l\'application (port 8066).' },
        { type: 'h2', text: 'Démarrer la saisie distante' },
        { type: 'ol', items: [
          'Cliquez sur "📡 Saisie distante" dans la barre d\'en-tête',
          'Cliquez sur "Démarrer" — le serveur se lance',
          'Notez l\'adresse IP et le port affichés',
          'Sur la tablette arbitre : ouvrez un navigateur et entrez l\'adresse',
          'Entrez le code d\'accès arbitre pour vous connecter',
        ]},
        { type: 'h2', text: 'Interfaces disponibles' },
        { type: 'ul', items: [
          'Arbitre (/areneN/arbitre) — saisie des scores, chronomètre',
          'Arène (/areneN) — affichage public des scores en temps réel',
          'Tableau de bord (/dashboard) — vue d\'ensemble des arènes actives',
          'Kiosque (/kiosk) — affichage en boucle pour écran public',
          'Public (/public) — classement en temps réel',
        ]},
        { type: 'h2', text: 'Mode hors-ligne' },
        { type: 'p', text: 'Les tablettes arbitres disposent d\'un service worker qui met en cache l\'interface. En cas de perte de connexion Wi-Fi, les actions sont mises en file d\'attente et synchronisées automatiquement à la reconnexion.' },
        { type: 'warning', text: 'L\'ordinateur principal et les tablettes doivent être sur le même réseau Wi-Fi local. Le port 8066 ne doit pas être bloqué par le pare-feu.' },
      ],
      en: [
        { type: 'p', text: 'Remote scoring allows referees to enter scores from a tablet or smartphone via Wi-Fi. An Express server is built into the application (port 8066).' },
        { type: 'h2', text: 'Starting Remote Scoring' },
        { type: 'ol', items: [
          'Click "📡 Remote Scoring" in the header bar',
          'Click "Start" — the server launches',
          'Note the displayed IP address and port',
          'On the referee tablet: open a browser and enter the address',
          'Enter the referee access code to connect',
        ]},
        { type: 'h2', text: 'Available Interfaces' },
        { type: 'ul', items: [
          'Referee (/arenaN/arbitre) — score entry, timer',
          'Arena (/arenaN) — public real-time score display',
          'Dashboard (/dashboard) — overview of active arenas',
          'Kiosk (/kiosk) — looping display for public screen',
          'Public (/public) — real-time ranking',
        ]},
        { type: 'h2', text: 'Offline Mode' },
        { type: 'p', text: 'Referee tablets have a service worker that caches the interface. If Wi-Fi is lost, actions are queued and automatically synchronized upon reconnection.' },
        { type: 'warning', text: 'The main computer and tablets must be on the same local Wi-Fi network. Port 8066 must not be blocked by the firewall.' },
      ],
    },
  },
  {
    id: 'formula',
    icon: '🔧',
    category: 'advanced',
    title: { fr: 'Formule personnalisée', en: 'Custom Formula' },
    content: {
      fr: [
        { type: 'p', text: 'Le Constructeur de formule permet de créer des enchaînements de phases sur mesure pour des formats de tournoi non standards.' },
        { type: 'h2', text: 'Types de phases' },
        { type: 'ul', items: [
          'Tour de poules — round-robin avec règles d\'avancement',
          'Élimination directe — tableau simple ou double élimination',
          'Classement — phase finale de classement sans élimination',
        ]},
        { type: 'h2', text: 'Règles d\'avancement' },
        { type: 'ul', items: [
          'Tous avancent — pas d\'élimination à cette phase',
          'Top % — ex. 80% des tireurs avancent',
          'Nombre fixe — ex. les 32 premiers',
          'Tableau direct — tous passent dans le tableau',
        ]},
        { type: 'h2', text: 'Critères de classement personnalisés' },
        { type: 'p', text: 'Pour chaque phase de poules, vous pouvez choisir l\'ordre des critères de classement : V/M, Indice, TD, TR, Confrontation directe, Classement initial.' },
        { type: 'h2', text: 'Modèles de formule' },
        { type: 'p', text: 'Enregistrez vos formules comme modèles réutilisables. Les modèles prédéfinis incluent des configurations standard pour 8, 16, 32, 64+ tireurs.' },
        { type: 'tip', text: 'La simulation dans le Constructeur permet de visualiser comment les tireurs seraient répartis avec la formule actuelle, avant de la valider.' },
      ],
      en: [
        { type: 'p', text: 'The Formula Builder allows you to create custom phase sequences for non-standard tournament formats.' },
        { type: 'h2', text: 'Phase Types' },
        { type: 'ul', items: [
          'Pool round — round-robin with advancement rules',
          'Direct elimination — single or double elimination bracket',
          'Classification — final ranking phase without elimination',
        ]},
        { type: 'h2', text: 'Advancement Rules' },
        { type: 'ul', items: [
          'All advance — no elimination at this phase',
          'Top % — e.g. 80% of fencers advance',
          'Fixed number — e.g. top 32',
          'Direct bracket — all move to the bracket',
        ]},
        { type: 'h2', text: 'Custom Ranking Criteria' },
        { type: 'p', text: 'For each pool phase, you can choose the order of ranking criteria: V/M, Index, TS, TR, Direct encounter, Initial seeding.' },
        { type: 'h2', text: 'Formula Templates' },
        { type: 'p', text: 'Save your formulas as reusable templates. Predefined templates include standard configurations for 8, 16, 32, 64+ fencers.' },
        { type: 'tip', text: 'The simulation in the Formula Builder lets you visualize how fencers would be distributed with the current formula before committing.' },
      ],
    },
  },
  {
    id: 'laser',
    icon: '⚡',
    category: 'advanced',
    title: { fr: 'Sabre Laser', en: 'Laser Sabre' },
    content: {
      fr: [
        { type: 'p', text: 'Le mode Sabre Laser est une variante de l\'escrime sportive avec un système de zones de touches à points variables et un système de cartons spécifique.' },
        { type: 'h2', text: 'Zones de touches' },
        { type: 'ul', items: [
          '🟢 Zone A — touche standard : 1 point',
          '🟡 Zone B — touche zone intermédiaire : 3 points',
          '🔴 Zone C — touche zone cible : 5 points',
        ]},
        { type: 'h2', text: 'Quest Points' },
        { type: 'p', text: 'Le classement des poules en Sabre Laser utilise les "Quest Points" au lieu du ratio V/M standard. Le total des points de zones remplace l\'indice de touches.' },
        { type: 'h2', text: 'Système de cartons' },
        { type: 'p', text: 'Les cartons sont regroupés en 4 groupes de fautes progressives :' },
        { type: 'ul', items: [
          'Groupe 1 — Blanc → Jaune → Jaune (fautes légères)',
          'Groupe 2 — Jaune → Rouge → Rouge (fautes moyennes)',
          'Groupe 3 — Rouge → Exclusion (fautes graves)',
          'Groupe 4 — Exclusion immédiate (brutalité, tricherie)',
        ]},
        { type: 'tip', text: 'Les statistiques par zone (A/B/C) sont disponibles dans l\'onglet Analytics de chaque compétition Sabre Laser.' },
      ],
      en: [
        { type: 'p', text: 'Laser Sabre mode is a variant of sport fencing with a variable-point touch zone system and a specific card system.' },
        { type: 'h2', text: 'Touch Zones' },
        { type: 'ul', items: [
          '🟢 Zone A — standard touch: 1 point',
          '🟡 Zone B — mid zone touch: 3 points',
          '🔴 Zone C — target zone touch: 5 points',
        ]},
        { type: 'h2', text: 'Quest Points' },
        { type: 'p', text: 'Laser Sabre pool ranking uses "Quest Points" instead of the standard V/M ratio. Zone point totals replace the touch index.' },
        { type: 'h2', text: 'Card System' },
        { type: 'p', text: 'Cards are grouped into 4 progressive fault groups:' },
        { type: 'ul', items: [
          'Group 1 — White → Yellow → Yellow (minor faults)',
          'Group 2 — Yellow → Red → Red (moderate faults)',
          'Group 3 — Red → Exclusion (serious faults)',
          'Group 4 — Immediate exclusion (brutality, cheating)',
        ]},
        { type: 'tip', text: 'Per-zone statistics (A/B/C) are available in the Analytics tab of each Laser Sabre competition.' },
      ],
    },
  },
  {
    id: 'export',
    icon: '📤',
    category: 'advanced',
    title: { fr: 'Import & Export', en: 'Import & Export' },
    content: {
      fr: [
        { type: 'h2', text: 'Formats d\'export' },
        { type: 'ul', items: [
          'PDF — classement, poules, tableau (personnalisable via Paramètres → PDF)',
          'CSV — données brutes pour tableur',
          'JSON — export complet de la compétition',
          'XML — format FFE standard',
          '.BPM — format natif BellePoule (sauvegarde complète)',
        ]},
        { type: 'h2', text: 'Export PDF personnalisé' },
        { type: 'p', text: 'Dans Paramètres → Personnaliser les PDF, vous pouvez configurer : couleurs, logo du club, sections à inclure, titre personnalisé. Les templates sont exportables/importables en JSON.' },
        { type: 'h2', text: 'Formats d\'import' },
        { type: 'ul', items: [
          'CSV tireurs — Nom, Prénom, Club, Licence, Classement, Nationalité',
          'XML FFE — format standard de la fédération française',
          'FFE Connect — import direct depuis l\'API fédérale',
          '.BPM — réouverture d\'une compétition sauvegardée',
        ]},
        { type: 'h2', text: 'Sync cloud' },
        { type: 'p', text: 'BellePoule supporte la synchronisation chiffrée (AES-GCM) avec Dropbox, Google Drive et OneDrive. Configurez la sync dans Paramètres → Cloud Sync.' },
        { type: 'warning', text: 'Le format .BPM est le seul format qui préserve l\'intégralité de la compétition (scores, cartons, historique des matchs). Utilisez-le pour les sauvegardes.' },
      ],
      en: [
        { type: 'h2', text: 'Export Formats' },
        { type: 'ul', items: [
          'PDF — ranking, pools, bracket (customizable via Settings → PDF)',
          'CSV — raw data for spreadsheets',
          'JSON — full competition export',
          'XML — standard FFE format',
          '.BPM — native BellePoule format (full backup)',
        ]},
        { type: 'h2', text: 'Custom PDF Export' },
        { type: 'p', text: 'In Settings → Customize PDFs, you can configure: colors, club logo, included sections, custom title. Templates are exportable/importable as JSON.' },
        { type: 'h2', text: 'Import Formats' },
        { type: 'ul', items: [
          'CSV fencers — Last name, First name, Club, License, Ranking, Nationality',
          'XML FFE — standard French federation format',
          'FFE Connect — direct import from the federal API',
          '.BPM — reopen a saved competition',
        ]},
        { type: 'h2', text: 'Cloud Sync' },
        { type: 'p', text: 'BellePoule supports encrypted sync (AES-GCM) with Dropbox, Google Drive, and OneDrive. Configure sync in Settings → Cloud Sync.' },
        { type: 'warning', text: 'The .BPM format is the only format that preserves the entire competition (scores, cards, match history). Use it for backups.' },
      ],
    },
  },
  {
    id: 'shortcuts',
    icon: '⌨️',
    category: 'advanced',
    title: { fr: 'Raccourcis clavier', en: 'Keyboard Shortcuts' },
    content: {
      fr: [
        { type: 'h2', text: 'Globaux' },
        { type: 'kbd', shortcuts: [
          { key: 'Ctrl+K', desc: 'Palette de commandes' },
          { key: '?', desc: 'Aide raccourcis clavier' },
          { key: 'Ctrl+N', desc: 'Nouvelle compétition' },
          { key: 'Échap', desc: 'Fermer / Annuler' },
          { key: 'Ctrl+S', desc: 'Sauvegarder' },
          { key: 'Ctrl+Z', desc: 'Annuler (Undo)' },
          { key: 'Ctrl+Y', desc: 'Refaire (Redo)' },
          { key: 'F5', desc: 'Rafraîchir les données' },
        ]},
        { type: 'h2', text: 'Navigation' },
        { type: 'kbd', shortcuts: [
          { key: 'Tab', desc: 'Navigation entre champs' },
          { key: '↑ ↓', desc: 'Naviguer dans une liste' },
          { key: 'Entrée', desc: 'Valider / Ouvrir' },
          { key: 'Alt+P', desc: 'Aller aux poules' },
          { key: 'Alt+T', desc: 'Aller au tableau' },
          { key: 'Alt+R', desc: 'Aller aux résultats' },
        ]},
        { type: 'h2', text: 'Compétition' },
        { type: 'kbd', shortcuts: [
          { key: 'Espace', desc: 'Démarrer/Pause le chronomètre' },
        ]},
      ],
      en: [
        { type: 'h2', text: 'Global' },
        { type: 'kbd', shortcuts: [
          { key: 'Ctrl+K', desc: 'Command palette' },
          { key: '?', desc: 'Keyboard shortcuts help' },
          { key: 'Ctrl+N', desc: 'New competition' },
          { key: 'Esc', desc: 'Close / Cancel' },
          { key: 'Ctrl+S', desc: 'Save' },
          { key: 'Ctrl+Z', desc: 'Undo' },
          { key: 'Ctrl+Y', desc: 'Redo' },
          { key: 'F5', desc: 'Refresh data' },
        ]},
        { type: 'h2', text: 'Navigation' },
        { type: 'kbd', shortcuts: [
          { key: 'Tab', desc: 'Field navigation' },
          { key: '↑ ↓', desc: 'Navigate a list' },
          { key: 'Enter', desc: 'Validate / Open' },
          { key: 'Alt+P', desc: 'Go to pools' },
          { key: 'Alt+T', desc: 'Go to bracket' },
          { key: 'Alt+R', desc: 'Go to results' },
        ]},
        { type: 'h2', text: 'Competition' },
        { type: 'kbd', shortcuts: [
          { key: 'Space', desc: 'Start/Pause timer' },
        ]},
      ],
    },
  },
];

const CATEGORY_LABELS: Record<string, { fr: string; en: string; icon: string }> = {
  start:       { fr: 'Démarrage',   en: 'Getting Started', icon: '🚀' },
  competition: { fr: 'Compétition', en: 'Competition',     icon: '🏆' },
  phases:      { fr: 'Phases',      en: 'Phases',          icon: '📋' },
  remote:      { fr: 'Saisie',      en: 'Remote',          icon: '📡' },
  advanced:    { fr: 'Avancé',      en: 'Advanced',        icon: '🔧' },
};

function renderSection(section: WikiSection, idx: number): React.ReactNode {
  switch (section.type) {
    case 'h2':
      return (
        <h2 key={idx} style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '1.5rem', marginBottom: '0.5rem', color: 'var(--color-primary, #3b82f6)', borderBottom: '2px solid var(--color-primary, #3b82f6)', paddingBottom: '0.25rem' }}>
          {section.text}
        </h2>
      );
    case 'h3':
      return (
        <h3 key={idx} style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '1rem', marginBottom: '0.25rem', color: 'var(--color-text, #1f2937)' }}>
          {section.text}
        </h3>
      );
    case 'p':
      return (
        <p key={idx} style={{ margin: '0.5rem 0', lineHeight: 1.7, color: 'var(--color-text, #1f2937)' }}>
          {section.text}
        </p>
      );
    case 'ul':
      return (
        <ul key={idx} style={{ margin: '0.5rem 0 0.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {section.items?.map((item, i) => (
            <li key={i} style={{ lineHeight: 1.6, color: 'var(--color-text, #1f2937)' }}>{item}</li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol key={idx} style={{ margin: '0.5rem 0 0.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {section.items?.map((item, i) => (
            <li key={i} style={{ lineHeight: 1.6, color: 'var(--color-text, #1f2937)' }}>{item}</li>
          ))}
        </ol>
      );
    case 'tip':
      return (
        <div key={idx} style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 8, padding: '0.75rem 1rem', margin: '1rem 0', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>💡</span>
          <p style={{ margin: 0, color: '#065f46', lineHeight: 1.6, fontSize: '0.9rem' }}>{section.text}</p>
        </div>
      );
    case 'warning':
      return (
        <div key={idx} style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '0.75rem 1rem', margin: '1rem 0', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>⚠️</span>
          <p style={{ margin: 0, color: '#92400e', lineHeight: 1.6, fontSize: '0.9rem' }}>{section.text}</p>
        </div>
      );
    case 'kbd':
      return (
        <div key={idx} style={{ margin: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {section.shortcuts?.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.3rem 0', borderBottom: '1px solid var(--color-border, #e5e7eb)' }}>
              <kbd style={{ background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, padding: '0.15rem 0.5rem', fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'nowrap', flexShrink: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                {s.key}
              </kbd>
              <span style={{ color: 'var(--color-text, #1f2937)', fontSize: '0.9rem' }}>{s.desc}</span>
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}

interface Props {
  onClose: () => void;
}

const WikiModal: React.FC<Props> = ({ onClose }) => {
  const { language } = useTranslation();
  const ref = useFocusTrap<HTMLDivElement>(true, onClose);
  const lang = (language === 'fr' || language === 'br' || language === 'ca') ? 'fr' : 'en';

  const [selectedId, setSelectedId] = useState<string>('quickstart');
  const [query, setQuery] = useState('');

  const filteredArticles = useMemo(() => {
    if (!query.trim()) return ARTICLES;
    const q = query.toLowerCase();
    return ARTICLES.filter(a => {
      const title = a.title[lang].toLowerCase();
      if (title.includes(q)) return true;
      const sections = a.content[lang];
      return sections.some(s => {
        if (s.text?.toLowerCase().includes(q)) return true;
        if (s.items?.some(item => item.toLowerCase().includes(q))) return true;
        if (s.shortcuts?.some(sh => sh.desc.toLowerCase().includes(q) || sh.key.toLowerCase().includes(q))) return true;
        return false;
      });
    });
  }, [query, lang]);

  const selectedArticle = useMemo(
    () => ARTICLES.find(a => a.id === selectedId) ?? ARTICLES[0],
    [selectedId]
  );

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setQuery('');
  }, []);

  const categories = ['start', 'competition', 'phases', 'remote', 'advanced'] as const;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={lang === 'fr' ? 'Documentation' : 'Documentation'}
        style={{ background: 'var(--color-surface, #fff)', borderRadius: 12, width: '100%', maxWidth: 900, height: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border, #e5e7eb)', flexShrink: 0 }}>
          <span style={{ fontSize: '1.4rem' }}>📖</span>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700, flex: 1, color: 'var(--color-text, #1f2937)' }}>
            {lang === 'fr' ? 'Documentation' : 'Documentation'}
          </h1>
          <input
            type="search"
            placeholder={lang === 'fr' ? 'Rechercher…' : 'Search…'}
            value={query}
            onChange={e => { setQuery(e.target.value); }}
            style={{ border: '1px solid var(--color-border, #e5e7eb)', borderRadius: 8, padding: '0.4rem 0.75rem', fontSize: '0.875rem', width: 200, outline: 'none', background: 'var(--color-bg, #f3f4f6)' }}
          />
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--color-text-light, #6b7280)', padding: '0.25rem', borderRadius: 4, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar */}
          <nav style={{ width: 200, flexShrink: 0, borderRight: '1px solid var(--color-border, #e5e7eb)', overflowY: 'auto', padding: '0.75rem 0' }}>
            {categories.map(cat => {
              const catArticles = filteredArticles.filter(a => a.category === cat);
              if (catArticles.length === 0) return null;
              const catLabel = CATEGORY_LABELS[cat];
              return (
                <div key={cat} style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-light, #6b7280)', padding: '0.25rem 1rem' }}>
                    {catLabel.icon} {catLabel[lang]}
                  </div>
                  {catArticles.map(article => (
                    <button
                      key={article.id}
                      onClick={() => handleSelect(article.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        width: '100%', padding: '0.4rem 1rem', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.875rem',
                        background: selectedId === article.id ? 'var(--color-primary, #3b82f6)' : 'transparent',
                        color: selectedId === article.id ? '#fff' : 'var(--color-text, #1f2937)',
                        fontWeight: selectedId === article.id ? 600 : 400,
                        borderRadius: 0,
                      }}
                    >
                      <span style={{ flexShrink: 0 }}>{article.icon}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {article.title[lang]}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })}

            {filteredArticles.length === 0 && (
              <div style={{ padding: '1rem', color: 'var(--color-text-light, #6b7280)', fontSize: '0.875rem', textAlign: 'center' }}>
                {lang === 'fr' ? 'Aucun résultat' : 'No results'}
              </div>
            )}
          </nav>

          {/* Article content */}
          <article style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text, #1f2937)' }}>
              <span>{selectedArticle.icon}</span>
              {selectedArticle.title[lang]}
            </h1>
            {selectedArticle.content[lang].map((section, idx) => renderSection(section, idx))}
          </article>
        </div>
      </div>
    </div>
  );
};

export default WikiModal;
