# Tablet Interface Guide

## Overview

L'interface tablette optimisée de BellePoule Modern est spécialement conçue pour les arbitres avec des contrôles tactiles intuitifs et des commandes vocales avancées.

## Fonctionnalités principales

### 🎯 **Contrôles tactiles optimisés**

- **Zones de touch larges** - Boutons de 64x64px minimum
- **Actions rapides** - +1/-1 avec feedback visuel immédiat
- **Glissement intuitif** - Swipe gauche/rouge, droite/vert
- **Interface landscape** - Optimisée pour tablettes 10-12 pouces

### 👆 **Gestes de glissement (Swipe)**

- **Glisser vers la gauche** : Ajoute 1 point au tireur A (rouge)
- **Glisser vers la droite** : Ajoute 1 point au tireur B (vert)
- **Animation visuelle** : Confirmation du geste enregistré
- **Anti-accident** : Détection de mouvement horizontal uniquement

### 🎤 **Commandes vocales (Français)**

Activez le contrôle vocal pour les mains libres :

#### 🎯 **Commandes de score**

- `"Point rouge"` ou `"Touche rouge"` : +1 pour tireur A
- `"Point vert"` ou `"Touche verte"` : +1 pour tireur B
- `"Annuler"` ou `"Retirer"` : -1 point

#### ⏱️ **Commandes de contrôle**

- `"Pause"` ou `"Arrêter"` : Mettre en pause le chronomètre
- `"Reprendre"` ou `"Continuer"` : Relancer le chronomètre
- `"Terminer"` ou `"Fin"` : Terminer le match
- `"Réinitialiser"` : Remettre les scores à zéro

### ⏱️ **Chronomètre avancé**

- **Affichage géant** - Temps visible de 10m de distance
- **Format MM:SS** - Standard international
- **Auto-pause** : Arrêt automatique au score maximum
- **Statut visuel** : Rouge (pause) / Vert (actif)

## Configuration de l'interface

### 🎨 **Personnalisation**

- **Langue vocale** : Français (par défaut)
- **Sensibilité du swipe** : Réglable selon préférence
- **Taille des boutons** : Adaptable à la vue
- **Thème visuel** : Rouge/vert par arme

### 📱 **Adaptation tablette**

- **Mode paysage** : Obligatoire pour l'arbitrage
- **Zoom automatique** : Interface adaptée à la distance
- **Anti-reflet** : Réduction des éblouissements
- **Mode haute luminosité** : Pour les salles lumineuses

## Utilisation pratique

### 🎯 **Début d'un match**

1. **Vérifiez les tireurs** affichés (noms et numéros)
2. **Configurez le score max** (5 pour poules, 10/15 pour DE)
3. **Lancez le chronomètre** avec le bouton START
4. **Commencez l'arbitrage** dès le signal de départ

### 👆 **Saisie des points**

#### méthode 1 : Touch direct

- **Touchez +1** (bouton géant) sous le score du tireur pour ajouter 1 point
- **Touchez +3** pour ajouter 3 points
- **Touchez +5** pour ajouter 5 points

#### ✋ **Appui long pour retirer des points**

Maintenez le doigt ou la souris appuyé pendant **800ms** sur un bouton de score pour retirer des points :

| Bouton | Clic court | Appui long (800ms) |
| ------ | ---------- | ------------------ |
| +1     | +1 point   | -1 point           |
| +3     | +3 points  | -3 points          |
| +5     | +5 points  | -5 points          |

**Feedback visuel** : Le bouton pulse pendant l'appui long pour indiquer que l'action de retrait va être déclenchée.

#### méthode 2 : Swipe

- **Glissez la main** vers la gauche pour un point rouge
- **Glissez la main** vers la droite pour un point vert

#### méthode 3 : Voix

- **Activez le micro** 🎤
- **Dites** : "Point rouge" ou "Point vert"
- **Le système** ajuste automatiquement le score

### 🟨 **Gestion des cartons**

Les boutons de cartons (B = Blanc, J = Jaune, R = Rouge) permettent d'ajouter des pénalités :

| Bouton    | Clic court                          | Appui long (800ms)    |
| --------- | ----------------------------------- | --------------------- |
| B (Blanc) | +1 carton blanc                     | Retire 1 carton blanc |
| J (Jaune) | +1 carton jaune (+3 à l'adversaire) | Retire 1 carton jaune |
| R (Rouge) | +1 carton rouge (+5 à l'adversaire) | Retire 1 carton rouge |

**Note** : Pour les cartons, l'appui long retire un seul carton à la fois. Exemple : 2 cartons jaunes → 1 appui long → 1 carton jaune restant.

### ⏰ **Gestion du temps**

- **Pause** en cas de problème ou de temps-mort
- **Reprise** automatique après la pause
- **Fin** quand le score maximum est atteint
- **Réinitialisation** pour le match suivant

## Sécurité et fiabilité

### 🛡️ **Anti-erreurs**

- **Double confirmation** pour les terminaisons de match
- **Détection de swipe invalide** (mouvement vertical ignoré)
- **Timeout vocal** : 5 secondes max par commande
- **Backup tactile** : Fonctionne même si le micro échoue

### 🔧 **Diagnostics**

- **Test vocal** : Vérifiez que le micro fonctionne
- **Test swipe** : Confirmez la détection de gestes
- **Statut connexion** : Indicateur de synchronisation WiFi
- **Reconnexion auto** : Retour automatique en cas de déconnexion

## Recommandations matérielles

### 📱 **Tablettes recommandées**

- **iPad Air/Pro** : 10.9"+, iOS 13+
- **Surface Pro** : 10"+, Windows 11
- **Samsung Galaxy Tab** : S8+, Android 10+

### 🎤 **Micro et audio**

- **Micro intégré** : OK pour usage normal
- **Micro externe** : Recommandé pour salles bruyantes
- **Casque Bluetooth** : Pour feedback audio

### 📶 **Connectivité**

- **WiFi 5GHz** : Pour faible latence
- **4G/5G mobile** : Solution de secours
- **Ethernet adaptateur** : Pour stabilité maximum

## Formation et support

### 🎓 **Formation rapide**

1. **Mode démo** : Interface de test sans données réelles
2. **Tutoriel intégré** : Guide interactif
3. **Vidéos de démonstration** : Techniques avancées
4. **Support technique** : Assistance directe

### 🆘 **Aide en direct**

- **Guide contextuel** : Appuyez sur l'icône "?"
- **Raccourcis clavier** : Pour maintenabilité
- **Mode sans échec** : L'application continue même en cas d'erreur

---

_L'interface tablette transforme l'arbitrage en une expérience fluide, rapide et professionnelle, permettant aux arbitres de se concentrer sur le jugement plutôt que sur la technologie._
