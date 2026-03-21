# Stack Technique - BellePoule Modern

## Frontend

| Technologie | Version | Usage |
|-------------|---------|-------|
| TypeScript | 5.x | Langage principal |
| Vite | 5.x | Build tool |
| React | 18.x | UI framework |
| Zustand | 4.x | State management |
| TailwindCSS | 3.x | Styling |

## Testing

| Technologie | Version | Usage |
|-------------|---------|-------|
| Vitest | 1.x | Test runner |
| Testing Library | 14.x | React testing |

## Desktop (Electron)

| Technologie | Version | Usage |
|-------------|---------|-------|
| Electron | 28.x | Desktop wrapper |
| electron-builder | 24.x | Packaging |

## PWA (à venir)

| Technologie | Version | Usage |
|-------------|---------|-------|
| vite-plugin-pwa | 0.17.x | PWA support |
| workbox | 7.x | Service Worker |
| idb | 8.x | IndexedDB wrapper |

## Structure des dossiers

```
bellepoule-modern/
├── src/
│   ├── shared/
│   │   ├── types/           # Types TypeScript
│   │   ├── utils/           # Utilitaires (avec tests)
│   │   └── services/        # Services (API, storage)
│   ├── features/            # Fonctionnalités par domaine
│   │   ├── competition/
│   │   ├── fencer/
│   │   ├── pool/
│   │   ├── match/
│   │   └── penalties/
│   ├── pages/               # Pages de l'app
│   ├── components/          # Composants réutilisables
│   └── stores/              # Zustand stores
├── docs/                    # Documentation
├── .planning/               # Fichiers GSD
└── dist/                    # Build output
```

## Conventions

### Nommage fichiers
- `camelCase.ts` pour les utilitaires
- `PascalCase.tsx` pour les composants React
- `*.test.ts` pour les tests (même dossier)

### Commits
```
✨ feat: nouvelle fonctionnalité
🐛 fix: correction de bug
🧪 test: ajout de tests
📚 docs: documentation
♻️ refactor: refactoring
🔧 chore: maintenance
```

### Types
- Interfaces pour les objets avec méthodes
- Types pour les unions et primitifs
- Enums pour les valeurs fixes
- Pas de `any` (strict mode)

## Scripts npm

```bash
npm run dev        # Dev server
npm run build      # Build production
npm test           # Run tests
npm run test:watch # Tests en mode watch
npm run test:coverage # Couverture
npm run lint       # ESLint
```
