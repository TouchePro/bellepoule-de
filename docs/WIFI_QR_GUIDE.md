# Générateur QR Code WiFi

## Présentation

Le bouton **🔧 Outils** dans la barre de navigation de compétition donne accès à un générateur de QR code WiFi. Il permet aux arbitres de connecter leurs tablettes au réseau local en un scan, sans saisir manuellement le mot de passe.

## Accès

1. Ouvrir une compétition
2. Dans la barre de navigation, cliquer sur **🔧 Outils**
3. Sélectionner **📶 QR Code WiFi**

## Champs du formulaire

| Champ | Description |
|---|---|
| **Nom du réseau (SSID)** | Nom exact du réseau WiFi (sensible à la casse) |
| **Type de sécurité** | WPA/WPA2/WPA3, WEP, ou Aucune |
| **Mot de passe** | Masqué si sécurité = Aucune |
| **Réseau masqué** | Cocher si le SSID n'est pas diffusé |

## Utilisation

1. Remplir les champs
2. Cliquer sur **📶 Générer le QR Code**
3. Afficher le QR code sur l'écran ou l'imprimer (**💾 Télécharger**)
4. Les arbitres scannent avec leur tablette → connexion WiFi automatique

## Format technique

Le QR code encode une chaîne au format standard `WIFI:` :

```
WIFI:T:WPA;S:MonReseau;P:MonMotDePasse;;
WIFI:T:WEP;S:MonReseau;P:MonMotDePasse;;
WIFI:T:nopass;S:MonReseau;;;
```

Les caractères spéciaux dans le SSID ou le mot de passe (`\ ; , " :`) sont automatiquement échappés.

## Compatibilité

- Android 10+ : scan natif via l'appareil photo
- iOS 11+ : scan natif via l'appareil photo
- Tout lecteur QR code supportant le format `WIFI:`

## Fichiers source

- `src/renderer/components/WifiQRModal.tsx` — composant modal
- `src/renderer/components/competition/CompetitionNav.tsx` — intégration bouton Outils
