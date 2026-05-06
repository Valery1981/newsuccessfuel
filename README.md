# SuccessFuel ERP

Système ERP complet pour la gestion de stations-service, incluant gestion des stocks, comptabilité en partie double, POS boutique, et rapports analytiques.

## 🚀 Stack Technique

- **Framework**: Next.js 16 (App Router)
- **Langage**: TypeScript (strict mode)
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **State Management**: Zustand + TanStack Query
- **UI**: Tailwind CSS + shadcn/ui
- **Validation**: Zod
- **Internationalisation**: next-intl (Français/Anglais)
- **Tests**: Vitest (unit) + Playwright (E2E)
- **PWA**: Service Worker manuel pour offline

## ✨ Fonctionnalités Principales

### 🔐 Authentification & Permissions

- Inscription/Login avec email
- Onboarding multi-étapes (6 étapes)
- First-login avec mot de passe à changer
- Permissions granulaires par page
- Sessions employés

### 📦 Gestion des Stocks

- Inventaire carburant (jauge cuves)
- Inventaire boutique (articles)
- Mouvements de stock
- CMUP calcul automatique
- Calibrage cuves (OCR PDF/image)

### 💰 Comptabilité

- Partie double automatique
- Écriture prévisualisation avant validation
- 10 points d'entrée comptables:
  - Achat carburant
  - Achat boutique
  - Virement interne
  - Initialisation
  - Encaissement créances
  - Règlement dettes
  - Charges courantes
  - Salaires
  - Opérations gérant
  - Immobilisations

### 🛒 Point de Vente (POS)

- POS boutique avec catalogue
- Shifts carburant pompistes
- Gestion des paiements
- Impression tickets

### 📊 Rapports

- **Manager**: 14 rapports (ventes, stocks, comptabilité)
- **Admin**: 7 pages (dashboard, stations, dépenses, revenue, audit logs)
- **Partner**: 4 pages + rapports opérationnels
- Dashboards analytiques

### 🔔 Notifications

- Notifications Realtime Supabase
- Doléances client
- Alertes stock

## 📁 Structure du Projet

```
src/
├── app/                    # Next.js App Router
│   ├── (admin)/           # Admin pages
│   ├── (manager)/         # Manager pages
│   ├── (partner)/         # Partner pages
│   ├── (auth)/            # Auth pages
│   └── api/               # API routes
├── components/            # React components
│   ├── admin/
│   ├── manager/
│   ├── partner/
│   ├── auth/
│   ├── common/            # Shared components
│   └── compta/            # Comptability components
├── services/              # Supabase services
├── stores/                # Zustand stores
├── hooks/                 # Custom hooks
├── lib/                   # Utilities
└── types/                 # TypeScript types
```

## 🛠️ Installation

```bash
# Clone le repository
git clone https://github.com/Jordanras96/newsuccessfuel.git
cd newsuccessfuel

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
# Edit .env.local avec vos credentials Supabase

# Run development server
npm run dev
```

## 🧪 Tests

```bash
# Tests unitaires
npm run test

# Tests E2E
npm run test:e2e

# Tests avec coverage
npm run test:coverage
```

## 📊 Audit & Qualité

- **Conformité rules.md**: 100%
- **Tests unitaires**: 112 tests
- **Tests E2E**: 10 specs (40 passed, 3 skipped)
- **TypeScript strict**: 100% (0 erreur, build réussi)
- **ESLint**: 0 erreur
- **0 console.log, 0 TODO/FIXME**

Voir `guide/AUDIT_SRC.md` pour l'audit complet.

## 🚢 Déploiement

Le projet est configuré pour Vercel:

```bash
# Build
npm run build

# Preview
npm run preview
```

Variables d'environnement requises:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OCR_SPACE_API_KEY` (pour calibrage OCR)

## 📖 Documentation

- `guide/rules.md` - Règles métier et techniques
- `guide/AUDIT_SRC.md` - Audit complet du code
- `guide/APEX_PLAN.md` - Journal des 9 phases APEX
- `guide/Guide_Document_SuccessFuel.md` - Guide utilisateur

## 👥 Rôles Utilisateurs

### Superadmin

- Accès complet admin
- Validation des stations
- Audit logs

### Gérant

- Gestion quotidienne station
- POS boutique
- Shifts carburant
- Rapports

### Partenaire

- Rapports opérationnels
- Dashboard partenaire
- Notifications

## 📄 License

MIT

## 🤝 Contribution

Les contributions sont les bienvenues! Veuillez créer une issue ou un pull request.
