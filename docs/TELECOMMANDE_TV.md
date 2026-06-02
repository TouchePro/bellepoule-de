# Télécommande TV — Guide d'utilisation

Fonctionnalité accessible via **Outils → 📺 Télécommande TV** depuis n'importe quelle phase de compétition.

---

## Vue d'ensemble

La télécommande TV permet de piloter tous les écrans connectés au serveur BellePoule (TV Android, Xiaomi TV Stick, PC secondaire) depuis le poste organisateur, sans installation supplémentaire. Elle fonctionne via le serveur Socket.IO déjà utilisé pour les arbitres (port 8066 par défaut).

```
PC organisateur
      │  IPC
      ▼
 Main process (Electron)
      │  Socket.IO broadcast
      ▼
 Serveur remote (port 8066)
      │  WebSocket
      ├──► TV Arène 1  (http://<ip>:8066/arene1)
      ├──► TV Arène 2  (http://<ip>:8066/arene2)
      ├──► Kiosk       (http://<ip>:8066/kiosk)
      └──► Lobby       (http://<ip>:8066/lobby)
```

---

## Pages disponibles sur les TV

| URL | Description |
|-----|-------------|
| `/arene1`, `/arene2`, … | Affichage d'arène (match en cours, score, chrono) |
| `/kiosk` | Écran public rotatif (classements, poules, tableau) |
| `/lobby` | Page d'attente neutre — la TV attend son affectation |
| `/` | Classement en direct |

### Page Lobby (`/lobby`)

Utilisez cette URL pour les TV dont l'affectation n'est pas encore décidée. La TV affiche « En attente d'affectation » et apparaît dans le panneau de contrôle avec le type **Lobby**. Depuis le panneau, l'organisateur lui assigne ensuite une arène d'un clic.

---

## Panneau de contrôle

### Accès

Le serveur remote doit être **démarré** (onglet Remote de la compétition). Le panneau est accessible depuis n'importe quelle phase via **🔧 Outils → 📺 Télécommande TV**.

### Liste des écrans

Chaque écran connecté est affiché avec :
- **Indicateur de statut** : vert (< 35 s), orange (35 s – 2 min), gris (hors ligne)
- **Type** : Arène 1, Lobby, Kiosk, Public, etc.
- **IP** et heure du dernier signe de vie

### Actions par écran

| Contrôle | Effet |
|----------|-------|
| **Select arène** (Lobby / Arène 1…N) | Affecte immédiatement l'écran à la vue sélectionnée |
| **↻** | Force le rechargement de la page |
| **▾** (menu) | Navigation vers n'importe quelle vue (lobby, arènes, kiosk, classement) |
| **⇄** | Sélectionne l'écran pour un intervertissement |

### Actions globales

| Bouton | Effet |
|--------|-------|
| **↻ Actualiser** | Rafraîchit la liste des écrans connectés |
| **Tout rafraîchir** | Envoie un `reload` à tous les écrans |
| **Envoyer** (message) | Affiche un bandeau texte en bas de tous les écrans |

### Intervertir deux arènes

1. Cliquer **⇄** sur le premier écran (il s'orange-surligne)
2. Cliquer **⇄** sur le second écran
3. Un bandeau s'affiche en bas du panneau : **⇄ Intervertir Arène 1 ↔ Arène 2**
4. Cliquer **Confirmer** — les deux TV naviguent simultanément vers la vue de l'autre
5. **Annuler** vide la sélection sans rien envoyer

> Fonctionne aussi entre un écran Arène et un écran Lobby.

### Message global

Saisir un texte, choisir la durée (3 / 5 / 10 / 30 / 60 s) et cliquer **Envoyer**. Un bandeau translucide apparaît en bas de **tous** les écrans connectés pendant la durée indiquée.

---

## Architecture technique

### Enregistrement des clients

Quand un navigateur ouvre `/arene1`, `/lobby`, `/kiosk` ou `/public`, il émet automatiquement via Socket.IO :
```js
socket.emit('client:register', { clientType, arenaId, userAgent });
```
Le serveur stocke le client dans `connectedClients: Map<socketId, ConnectedClient>` et notifie le renderer Electron via IPC (`remote:clientListUpdate`).

### Commandes serveur → client

```ts
type TVCommand =
  | { type: 'refresh' }
  | { type: 'navigate'; url: string }
  | { type: 'message'; text: string; duration?: number }
  | { type: 'ping' }
```

Chaque client écoute `socket.on('server:command', cmd => { ... })` et réagit immédiatement.

### IPC (renderer → main → serveur)

| Canal IPC | Description |
|-----------|-------------|
| `remote:getConnectedClients` | Liste tous les écrans enregistrés |
| `remote:sendClientCommand` | Commande vers un seul écran (socketId) |
| `remote:broadcastCommand` | Commande vers tous les écrans |
| `remote:clientListUpdate` (event) | Push temps réel quand la liste change |

---

## Dépannage

| Problème | Solution |
|----------|----------|
| L'écran n'apparaît pas dans la liste | Vérifier que le serveur remote est démarré (onglet Remote) |
| L'écran est gris (hors ligne) | La TV a fermé le navigateur ou perdu le WiFi — le heartbeat 30 s n'est plus reçu |
| Le rafraîchissement ne fonctionne pas | La TV a quitté la page BellePoule ; naviguer manuellement vers `/lobby` pour la ré-enregistrer |
| La commande "Naviguer" change l'URL mais la TV reste blanche | L'arène demandée n'existe pas sur le serveur — vérifier le nombre de pistes configuré |
