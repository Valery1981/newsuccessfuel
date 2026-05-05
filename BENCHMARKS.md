# SuccessFuel Performance Benchmarks

## Objectifs de Performance (Guide §18)

- **Chargement pages et requêtes ≤ 1 seconde** (règle absolue)
- **useQuery staleTime ajusté par type de donnée**:
  - Prix = 5min
  - Stocks = 30s
  - KPIs = 1min
- **Pagination côté serveur** pour toutes les DataTable
- **Supabase Realtime UNIQUEMENT** pour ventes live et mises à jour critiques

## Métriques Actuelles

### Chargement Pages (estimé)

| Page | Chargement | Conforme |
|------|-------------|----------|
| Dashboard Manager | < 500ms | ✅ |
| POS Boutique | < 800ms | ✅ |
| Vente Carburant | < 700ms | ✅ |
| Rapports | < 1s | ✅ |

### Optimisations Implémentées

- ✅ `next/image` pour toutes les images
- ✅ `dynamic()` pour composants lourds (POS catalog, graphiques recharts)
- ✅ `useQuery` staleTime ajusté par type de donnée
- ✅ Supabase Realtime limité aux événements critiques (doléances, ventes boutique)
- ✅ Pagination côté serveur pour DataTable

### Configuration useQuery

```typescript
// Prix - 5min cache
useQuery({
  queryKey: ["prix-vente"],
  staleTime: 5 * 60 * 1000, // 5 minutes
})

// Stocks - 30s cache
useQuery({
  queryKey: ["stocks"],
  staleTime: 30 * 1000, // 30 secondes
})

// KPIs - 1min cache
useQuery({
  queryKey: ["kpis"],
  staleTime: 60 * 1000, // 1 minute
})
```

## Tests Performance

Pour exécuter les tests de performance:

```bash
# Build de production
npm run build

# Lancer en mode production
npm run start

# Mesurer avec Lighthouse
npx lighthouse http://localhost:3000 --view
```

## Résultats Attendus

- Performance Score ≥ 90
- First Contentful Paint < 1s
- Time to Interactive < 2s
- Total Blocking Time < 200ms
