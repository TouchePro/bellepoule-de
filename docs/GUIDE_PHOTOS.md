# Guide — Gestion des photos de tireurs

Ce guide couvre les 4 boutons de gestion de photos disponibles dans la liste des tireurs, ainsi que les conventions de nommage et les formats attendus.

---

## Vue d'ensemble

| Bouton | Raccourci visuel | Fonction |
|--------|-----------------|---------|
| `📤 Export Photos` | ZIP | Exporte toutes les photos de la compétition dans un fichier `.zip` |
| `📥 Import Photos` | ZIP | Importe des photos depuis un fichier `.zip` (matching par numéro de licence) |
| `💾 .bpf` | Archive | Exporte tireurs + photos dans un fichier `.bpf` (BellePoule Fencers) |
| `📦 .bpf` | Archive | Importe tireurs + photos depuis un fichier `.bpf` |

Ces boutons sont disponibles uniquement si une compétition est ouverte.

---

## 1. Export Photos (`📤 Export Photos`)

### Ce que ça fait
Exporte toutes les photos des tireurs inscrits dans la compétition courante vers un fichier `.zip`.

### Format produit
- **Extension** : `.zip`
- **Nom par défaut proposé** : `photos-tireurs.zip`
- **Contenu** : un fichier JPEG par tireur, nommé d'après son numéro de licence

### Convention de nommage des fichiers dans le ZIP

```
{numéro_licence}.jpg
```

**Exemples :**
```
A12345.jpg
B98765.jpg
C00123.jpg
1234567.jpg      ← licence numérique
FR-2024-0042.jpg ← licence avec tirets
```

### Qualité d'image
- Format de sortie : **JPEG**
- Qualité : **80 %** (compression appliquée lors de l'enregistrement individuel de la photo)
- Résolution max stockée : **300 × 300 px**

### Résultat affiché
```
12 photos exportées
```

---

## 2. Import Photos (`📥 Import Photos`)

### Ce que ça fait
Lit un fichier `.zip` contenant des photos et les associe automatiquement aux tireurs par leur **numéro de licence**.

### Format attendu
- **Extension** : `.zip`
- **Contenu** : fichiers image nommés `{numéro_licence}.ext`

### Formats d'image acceptés dans le ZIP

| Extension | MIME type | Accepté |
|-----------|-----------|---------|
| `.jpg` | `image/jpeg` | Oui |
| `.jpeg` | `image/jpeg` | Oui |
| `.png` | `image/png` | Oui |
| `.gif`, `.webp`, `.bmp`, etc. | — | **Non** (ignorés) |

### Convention de nommage obligatoire

Le nom du fichier (sans extension) doit correspondre **exactement** au numéro de licence du tireur enregistré dans la base.

```
{numéro_licence}.jpg
{numéro_licence}.jpeg
{numéro_licence}.png
```

**Exemples valides :**
```
A12345.jpg        ← correspond au tireur avec licence "A12345"
B98765.png        ← correspond au tireur avec licence "B98765"
1234567.jpeg      ← licence numérique pure
```

**Exemples invalides (ignorés) :**
```
dupont_jean.jpg         ← nom de tireur, pas une licence
photo_001.jpg           ← numéro séquentiel sans licence
A12345_v2.jpg           ← suffixe non reconnu
```

### Matching

- La correspondance est faite sur le champ `license` du tireur.
- Les fichiers dont le nom ne correspond à aucun tireur inscrit sont **silencieusement ignorés**.
- Une photo existante est **écrasée** si un nouveau fichier correspond à la même licence.

### Résultat affiché
```
8/12 photos importées
```
Signifie : 8 photos ont été associées à un tireur sur 12 fichiers image trouvés dans le ZIP.

### Taille maximale par photo
- **5 Mo** par fichier image dans le ZIP.

---

## 3. Export Archive (`.bpf`) — `💾 .bpf`

### Ce que ça fait
Exporte l'ensemble des tireurs (données + photos) dans un fichier archive `.bpf`.

### Format produit
- **Extension** : `.bpf` (BellePoule Fencers — ZIP renommé)
- **Nom par défaut proposé** : `tireurs.bpf`
- **Compression** : DEFLATE

### Structure interne du fichier `.bpf`

```
tireurs.bpf
├── meta.json          ← métadonnées de l'export
└── fencers.json       ← liste complète des tireurs avec photos (base64)
```

**Exemple `meta.json` :**
```json
{
  "version": "1.0",
  "competitionName": "Championnat régional U17",
  "exportDate": "2026-04-07T10:30:00.000Z",
  "count": 24
}
```

**Exemple extrait `fencers.json` :**
```json
[
  {
    "id": "uuid-...",
    "firstName": "Jean",
    "lastName": "Dupont",
    "license": "A12345",
    "club": "Cercle d'Escrime Paris",
    "photo": "data:image/jpeg;base64,/9j/4AAQ...",
    ...
  }
]
```

### Résultat affiché
```
24 tireurs exportés
```

---

## 4. Import Archive (`.bpf`) — `📦 .bpf`

### Ce que ça fait
Importe des tireurs (données + photos) depuis un fichier `.bpf` dans la compétition courante.

### Format attendu
- **Extension** : `.bpf`
- Doit contenir un fichier `fencers.json` valide (produit par BellePoule Modern)

### Stratégie de matching
L'import tente de faire correspondre chaque tireur importé dans cet ordre :
1. **Par numéro de licence** (correspondance exacte)
2. **Par nom** (prénom + nom) si la licence ne correspond à personne

| Cas | Comportement |
|-----|--------------|
| Tireur existant (même licence) | Mise à jour des données et de la photo |
| Tireur existant (même nom, licence différente) | Mise à jour |
| Tireur inconnu | Ajout comme nouveau tireur |

### Résultat affiché
```
5 ajoutés / 19 mis à jour
```

---

## Résumé — Conventions de nommage

### Fichiers ZIP pour `📥 Import Photos`

| Pattern | Exemple | Résultat |
|---------|---------|---------|
| `{licence}.jpg` | `A12345.jpg` | Associé au tireur licence A12345 |
| `{licence}.jpeg` | `B98765.jpeg` | Associé au tireur licence B98765 |
| `{licence}.png` | `C00123.png` | Associé au tireur licence C00123 |
| Autre nommage | `jean_dupont.jpg` | **Ignoré** |
| Extension non supportée | `A12345.webp` | **Ignoré** |

### Fichiers archives `.bpf`

| Pattern | Exemple |
|---------|---------|
| `{nom_compétition}.bpf` | `champions-regionaux-2026.bpf` |
| Nom libre | `sauvegarde-tireurs.bpf` |

---

## Limites et contraintes

| Contrainte | Valeur |
|------------|--------|
| Taille max par photo (import ZIP) | **5 Mo** |
| Formats acceptés (import ZIP) | `.jpg`, `.jpeg`, `.png` |
| Résolution max stockée | **300 × 300 px** (redimensionnement auto) |
| Qualité JPEG de stockage | **80 %** |
| Format de sortie (export ZIP) | **JPEG** uniquement |
| Clé de matching (import ZIP) | Numéro de licence (exact) |
| Clé de matching (import .bpf) | Licence, puis nom |

---

## Flux typique : préparer un ZIP de photos

1. Récupérer la liste des licences des tireurs inscrits (export CSV ou liste imprimée).
2. Renommer chaque photo au format `{licence}.jpg` (ou `.png`).
3. Compresser tous les fichiers dans une archive `.zip` (à la racine, sans sous-dossiers).
4. Cliquer sur `📥 Import Photos` et sélectionner le fichier.
5. Vérifier le compteur `X/Y photos importées`.

**Exemple de structure ZIP valide :**
```
photos-tireurs.zip
├── A12345.jpg
├── B98765.png
├── C00123.jpg
└── 1234567.jpeg
```

**Exemple de structure ZIP invalide (sous-dossiers) :**
```
photos-tireurs.zip
└── photos/            ← sous-dossier : les fichiers seront ignorés
    ├── A12345.jpg
    └── B98765.png
```
