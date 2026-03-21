# Conventions - BellePoule Modern

## Code Style

### TypeScript

```typescript
// ✅ Bon : Types explicites
function calculatePoints(score: number, zone: TargetZone): number {
  return ZONE_POINTS[zone];
}

// ❌ Mauvais : any
function calculatePoints(score: any, zone: any): any {
  return ZONE_POINTS[zone];
}
```

```typescript
// ✅ Bon : Interface pour objets
interface Fencer {
  id: string;
  lastName: string;
  firstName: string;
}

// ✅ Bon : Type pour unions
type MatchStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'FINISHED';
```

### Fonctions

```typescript
// ✅ Bon : Fonctions pures, noms descriptifs
export function calculateQuestPoints(myScore: number, oppScore: number): number {
  const diff = Math.abs(myScore - oppScore);
  if (diff >= 12) return 4;
  if (diff >= 8) return 3;
  if (diff >= 4) return 2;
  return 1;
}

// ❌ Mauvais : Effets de bord, nom vague
export function calc(a, b) {
  globalState.lastCalc = a - b;
  return a > b ? 4 : 1;
}
```

### Tests

```typescript
// ✅ Bon : Describe/it lisibles, assertions claires
describe('calculateQuestPoints', () => {
  it('retourne 4 pts pour écart >= 12', () => {
    expect(calculateQuestPoints(15, 3)).toBe(4);
  });
  
  it('retourne 1 pt pour écart <= 3', () => {
    expect(calculateQuestPoints(15, 14)).toBe(1);
  });
});
```

## Règles FFE Sabre Laser

### Zones de touches

| Zone | Points | Couleur |
|------|--------|---------|
| A (membres) | 1 | Vert |
| B (tronc) | 3 | Jaune |
| C (tête) | 5 | Rouge |

### Système de cartons

| Groupe | Fautes | Escalade |
|--------|--------|----------|
| 1 | Retard, équipement | Jaune → Rouge → Rouge → Noir |
| 2 | Brutalité mineure | Rouge → Rouge → Noir |
| 3 | Brutalité majeure | Rouge → Noir |
| 4 | Fraude, violence | Noir (exclusion directe) |

### Points Quest

| Points | Écart requis |
|--------|--------------|
| V4 | ≥ 12 points |
| V3 | 8-11 points |
| V2 | 4-7 points |
| V1 | ≤ 3 points |

### Mort subite

1. **Mode Challenger** : Déclenché quand un tireur atteint 10 pts d'avance
2. **Mode Timeout** : Déclenché à la fin du temps réglementaire si égalité

En mort subite :
- Seule la **Zone C** (tête) est valide
- Première touche Zone C gagne
- Si aucune touche : tirage au sort

## Git

### Branches

- `main` : Production stable
- `dev` : Développement actif
- `feature/*` : Nouvelles fonctionnalités
- `fix/*` : Corrections de bugs

### Commits

Format : `emoji type: description`

```
✨ feat: add sudden death mode
🐛 fix: correct pool ranking calculation
🧪 test: add cardSystem unit tests
📚 docs: update PRD with implemented features
♻️ refactor: extract Quest calculation to separate function
🔧 chore: update dependencies
```

### Pull Requests

1. Titre clair avec emoji
2. Description du changement
3. Tests inclus
4. Review requise avant merge
