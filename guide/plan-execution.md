# Plan : Recréation SuccessFuel avec Next.js

Ce plan détaille la recréation complète du projet SuccessFuel en suivant le Guide Document SuccessFuel.md, avec Next.js et Supabase, dans un nouveau dossier newsuccessfuel.

**NOTE** : Le plan doit couvrir AU MINIMUM les pages existantes dans src/components du projet successfuel (200+ pages). Le plan actuel est un résumé des fonctionnalités principales.

**IMPORTANT** : Chaque composant doit être documenté avec :

- Description de la page
- Logique métier (selon Guide Document SuccessFuel.md)
- Fonctionnalités principales
- État local (useState)
- Hooks nécessaires (useAuth, useSupabase, useQuery, etc.)
- Services Supabase appelés
- Liens avec d'autres pages
- Contraintes techniques
- Validation (front et back)
- Notifications/toasts

**NOTE SUR LES FICHIERS JS ET JSON** : Tous les fichiers JavaScript et JSON présentés dans ce plan sont des **exemples** et doivent être **adaptés** au fur et à mesure du développement de l'application selon les besoins réels et les contraintes rencontrées.

## ÉTAPE 1 : Création du projet Next.js

**Emplacement** : `/Users/mac/Documents/WORK/newsuccessfuel`

**Actions** :

```bash
cd /Users/mac/Documents/WORK
npx create-next-app@latest newsuccessfuel --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd newsuccessfuel
```

**Configuration** :

- TypeScript : oui
- Tailwind CSS : oui
- ESLint : oui
- App Router : oui
- src directory : oui
- import alias : @/\*

## ÉTAPE 2 : Installation des dépendances

**IMPORTANT** : UI/UX contraintes OBLIGATOIRES :

- Utiliser **UNIQUEMENT** Tailwind CSS et shadcn/ui pour toute l'UX et l'UI
- Aucun autre framework CSS ou bibliothèque de composants UI
- Design system : shadcn/ui avec Tailwind CSS
- Responsive design obligatoire pour tous les types d'écran (mobile, tablet, desktop)
- Application PWA (Progressive Web App) avec support offline

**Dépendances Supabase** :

```bash
npm install @supabase/supabase-js @supabase/ssr
npx skills add supabase/agent-skills
```

**Dépendances UI (shadcn/ui)** :

```bash
npx shadcn@latest init
```

**Dépendances PWA** :

```bash
npm install next-pwa
```

**Dépendances additionnelles** :

```bash
npm install @tanstack/react-query @tanstack/react-table lucide-react date-fns clsx tailwind-merge class-variance-authority
npm install zustand next-intl
npm install -D @testing-library/react @testing-library/jest-dom vitest @vitest/ui
```

## ÉTAPE 3 : Configuration PWA

**Configuration next.config.js** :

```javascript
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

module.exports = withPWA({
  // ... autres configurations Next.js
});
```

**Fichier `public/manifest.json`** :

```json
{
  "name": "SuccessFuel ERP",
  "short_name": "SuccessFuel",
  "description": "Système ERP pour stations-service",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Responsive design** :

- Tous les composants doivent être responsive (mobile-first approach)
- Utiliser Tailwind breakpoints : sm (640px), md (768px), lg (1024px), xl (1280px)
- Tables : responsive avec scroll horizontal sur mobile
- Sidebar : drawer/collapsible sur mobile
- Forms : stack sur mobile, inline sur desktop

**Gestion des erreurs** :

- Pages d'erreur dédiées pour tous les status HTTP
- Page 404 : NotFoundPage (page inexistante)
- Page 401/403 : UnauthorizedPage (accès refusé)
- Page 500 : ServerErrorPage (erreur serveur)
- Page 503 : MaintenancePage (maintenance)
- Page offline : NetworkErrorPage (coupure de connexion)
- Détection automatique perte connexion (navigator.onLine)
- Toast notifications pour erreurs réseau
- Retry automatique pour requêtes échouées (TanStack Query)

**Logos** :

- `public/icon.png` : icone affichée en petit dans les tabs du navigateur
- `public/assets/name.png` : logo du nom seulement
- Fusion entre icon.png et name.png = logo général de l'app (header, login page)

**Internationalisation (i18n)** :

- next-intl pour support anglais/français
- Changement de langue instantané sans latence
- Traductions stockées en JSON (messages/en.json, messages/fr.json)
- Hook useTranslation pour traductions dans composants
- Préférence langue stockée dans localStorage
- Pas de changement de sens des mots/phrases entre langues
- Fallback vers français si traduction manquante

**State Management (Zustand)** :

- Zustand pour gestion globale des states dans toute l'app
- Stores : authStore, uiStore, dataStore
- authStore : session utilisateur, rôle, permissions
- uiStore : sidebar, theme, modals, notifications
- dataStore : données partagées entre composants
- Persist des stores dans localStorage (zustand persist)
- TypeScript strict pour type safety

**Gestion du Cache** :

- TanStack Query pour cache côté client (déjà utilisé)
- Stale time : 5 minutes par défaut
- Cache time : 10 minutes par défaut
- Refetch on window focus : true
- Refetch on reconnect : true
- Supabase gère le cache côté serveur (PostgreSQL query cache)
- Pas besoin de ioredis (Supabase Edge Functions + Postgres suffisent)
- Cache invalidation automatique via TanStack Query keys

**Historique d'utilisateur (Audit Trail)** :

- Historique détaillé de toutes les actions entreprises par chaque utilisateur
- Actions tracées : CRUD (création, lecture, modification, suppression), clics de bouton, connexion, déconnexion, navigation, soumission de formulaires
- Stockage dans table audit_logs (reborn.sql)
- Champs : user_id, action_type, entity_type, entity_id, old_value, new_value, timestamp, ip_address, user_agent
- Consultation dans page SuperAdmin (AdminAuditLogsPage)
- Filtres : par utilisateur, par date, par type d'action, par entité
- Export CSV possible
- Règles RLS : seul superadmin peut consulter
- Tracking automatique via middleware ou hooks React

## ÉTAPE 4 : Configuration Supabase

**Fichier `.env.local`** :

```env
NEXT_PUBLIC_SUPABASE_URL=https://uetkdbpmqxdnnnwkyzzi.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_HIqX82CFsaTkMCfqPtAmMA_YimEH81n
```

**Fichiers utilitaires Supabase** (structure fournie par utilisateur) :

- `src/utils/supabase/server.ts` (Server Components)
- `src/utils/supabase/clients.tsx` (Client Components)
- `src/utils/supabase/middleware.ts` (Middleware)

**Middleware** :

- Créer `src/middleware.ts` pour la gestion des sessions Supabase

## ÉTAPE 4 : Structure du projet

**Patterns de développement communs** :

Pour tous les composants manager/, admin/, partner/, suivre ces patterns :

**Pattern Page avec Liste + Formulaire** :

- Utiliser TanStack Query pour data fetching (useQuery, useMutation)
- État local : loading, error, data, mode (view/edit/create)
- Components : PageContainer, PageHeader, CustomDataTable (shadcn/ui)
- Services : serviceX.getData(), serviceX.createData(), serviceX.updateData(), serviceX.deleteData()
- Validation : Zod schemas
- Notifications : Toast succès/erreur via sonner/toast
- **Responsive** : Mobile-first approach, tables avec scroll horizontal sur mobile

**Pattern Formulaire** :

- Utiliser react-hook-form + Zod validation
- Champs avec shadcn/ui components (Input, Select, Textarea, etc.)
- État : formData, errors, touched, isSubmitting
- Services : serviceX.submitForm()
- Liens : Bouton annuler → retour liste

**Pattern Table avec Actions** :

- Colonnes : données + actions (Voir, Modifier, Supprimer)
- Filtres : période, station, statut
- Pagination : TanStack Table
- Tri : colonnes triables
- Export : Excel/CSV

**Pattern Dashboard** :

- KPI cards avec gradients (inspirés logo)
- Graphiques : courbes, barres, camemberts (recharts)
- Filtres temporels : jour, semaine, mois, année
- Actualisation automatique : useInterval ou Supabase Realtime

**Pattern Modal** :

- Dialog shadcn/ui avec Trigger
- État : isOpen, formData
- Validation inline
- Actions : Annuler, Valider

**Services Supabase** :

- Structure : services/[module]Service.ts
- Fonctions : get, getById, create, update, delete, custom queries
- RLS : Toutes les queries respectent RLS via auth company_id
- Error handling : try/catch avec toast erreur

## Structure détaillée

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Routes authentification
│   ├── (manager)/         # Routes gérant
│   ├── (partner)/         # Routes partenaire
│   ├── (admin)/           # Routes superadmin
│   ├── layout.tsx
│   └── page.tsx
├── components/            # Composants UI
│   ├── ui/                # shadcn/ui
│   ├── auth/              # Composants auth
│   ├── manager/           # Composants gérant
│   ├── partner/           # Composants partenaire
│   └── admin/             # Composants superadmin
├── features/             # Features métier
│   ├── auth/              # Auth & rôles
│   ├── stations/          # Gestion stations
│   ├── stocks/            # Stocks & inventaires
│   ├── operations/        # Opérations achat/vente
│   ├── accounting/        # Comptabilité
│   └── reports/           # Rapports
├── hooks/                 # Custom hooks
│   ├── useAuth.ts
│   ├── useSupabase.ts
│   └── useQuery.ts
├── services/              # Services Supabase
│   ├── supabase.ts        # Client Supabase
│   ├── authService.ts
│   ├── stationService.ts
│   └── ...
├── lib/                   # Utilitaires
│   ├── utils.ts
│   └── constants.ts
├── types/                 # Types TypeScript
│   ├── supabase.ts        # Types générés Supabase
│   └── index.ts
└── contexts/              # React Contexts
    ├── AuthContext.tsx
    └── ...
```

## ÉTAPE 5 : Génération des types Supabase

```bash
npx supabase gen types typescript --project-id uetkdbpmqxdnnnwkyzzi --schema public > src/types/supabase.ts
```

## ÉTAPE 6 : Implémentation Authentification

**Fonctionnalités** (selon guide section 2) :

- Page Sign In (inscription gérant automatique)
- Login (superadmin, gérant, partenaire)
- Gestion des sessions
- Rôles : superadmin, gérant, partenaire officiel/non officiel

**Routes** :

- `/public/login` - Page login
- `/public/signup` - Page inscription gérant
- `/auth/callback` - Callback Supabase

**Composants auth/** (10 items) :

**LoginPage**

- Description : Page de connexion pour superadmin, gérant, partenaire
- Logique métier : Authentification Supabase avec email/password, détection automatique du rôle après login
- Fonctionnalités :
  - Formulaire email/password
  - Validation email format, mot de passe minimum
  - Login via Supabase Auth
  - Redirection selon rôle après login (superadmin→/admin/dashboard, gérant→/manager/stations, partenaire→/partner/dashboard)
  - Gestion erreurs (email invalide, mot de passe incorrect)
- État local : email, password, loading, error
- Hooks : useAuth, useSupabase
- Services : authService.login()
- Liens : /public/signup, mot de passe oublié
- Validation : Zod schema (email, password)
- Notifications : Toast erreur login, toast succès

**SignupPage**

- Description : Page inscription gérant (compte automatique)
- Logique métier : Inscription → création compte gérant automatique dans table comptes
- Fonctionnalités :
  - Formulaire email, password, nom, prénom
  - Validation email unique, mot de passe minimum
  - Création compte Supabase Auth
  - Création enregistrement dans comptes (type: gerant)
  - Redirection vers onboarding après création
- État local : email, password, nom, prénom, loading, error
- Hooks : useAuth, useSupabase
- Services : authService.signup(), compteService.createCompteGerant()
- Liens : /public/login, /onboarding/company
- Validation : Zod schema
- Notifications : Toast succès création, toast erreur

**AuthProvider**

- Description : Context React pour authentification globale
- Logique métier : Gestion session utilisateur, rôle, permissions
- Fonctionnalités :
  - Fournir session utilisateur à toute l'app
  - Fournir rôle utilisateur (superadmin, gerant, partenaire)
  - Fournir fonction login, logout
  - Écouter changements de session Supabase
- État global : user, session, role, loading
- Hooks : useAuth (custom hook)
- Services : authService.getSession()
- Liens : Utilisé dans toutes les pages protégées
- Validation : Vérification session valide
- Notifications : Toast déconnexion

**ProtectedRoute**

- Description : Guard pour routes protégées
- Logique métier : Vérifie authentification et rôle avant accès
- Fonctionnalités :
  - Redirection vers /public/login si non authentifié
  - Vérification rôle requis
  - Affichage loading pendant vérification
- État : aucun (composant de garde)
- Hooks : useAuth
- Services : authService.getSession()
- Liens : /public/login
- Validation : Rôle requis en paramètre
- Notifications : Toast accès refusé

**AuthLayout**

- Description : Layout pour pages auth (login, signup)
- Logique métier : Design simple centré
- Fonctionnalités :
  - Header avec logo SuccessFuel
  - Container centré
  - Footer avec lien support
- État : aucun
- Hooks : aucun
- Services : aucun
- Liens : Aucun
- Validation : Aucun
- Notifications : Aucun

**SessionProvider**

- Description : Provider pour sessions utilisateurs
- Logique métier : Gestion sessions multiples par compte
- Fonctionnalités :
  - Liste sessions utilisateur
  - Création nouvelle session
  - Suppression session
  - Droits par session
- État global : sessions, currentSession
- Hooks : useSessions
- Services : sessionService.getSessions(), sessionService.createSession()
- Liens : ManagerUsersPage
- Validation : Rôles dans session
- Notifications : Toast création/suppression session

**RoleGuard**

- Description : Guard spécifique par rôle
- Logique métier : Vérifie rôle exact requis
- Fonctionnalités :
  - Vérifie role === requiredRole
  - Redirection si rôle incorrect
- État : aucun
- Hooks : useAuth
- Services : authService.getSession()
- Liens : Redirection selon rôle
- Validation : Rôle exact
- Notifications : Toast rôle insuffisant

**PasswordReset**

- Description : Page réinitialisation mot de passe
- Logique métier : Envoi email reset, nouveau mot de passe
- Fonctionnalités :
  - Formulaire email
  - Envoi lien reset
  - Formulaire nouveau mot de passe
  - Validation force mot de passe
- État : email, newPassword, confirmPassword, loading, error
- Hooks : useAuth
- Services : authService.resetPassword()
- Liens : /public/login
- Validation : Zod schema, force mot de passe
- Notifications : Toast email envoyé, toast mot de passe changé

**EmailVerification**

- Description : Page vérification email
- Logique métier : Vérification token email
- Fonctionnalités :
  - Vérification token depuis URL
  - Confirmation email vérifié
- État : token, loading, error, verified
- Hooks : useAuth
- Services : authService.verifyEmail()
- Liens : /public/login
- Validation : Token valide
- Notifications : Toast email vérifié

**AuthForm**

- Description : Formulaire générique auth
- Logique métier : Formulaire réutilisable login/signup
- Fonctionnalités :
  - Champs email, password
  - Validation inline
  - Bouton submit
- État : formData, errors, touched
- Hooks : useForm
- Services : aucun
- Liens : Aucun
- Validation : Zod schema
- Notifications : Aucun

## ÉTAPE 7 : Onboarding Gérant (section 3)

**Étapes** :

1. Inscription → compte gérant automatique
2. Informations entreprise (nom, pays, adresse, NIF, STAT, RCS, téléphone, WhatsApp)
3. Création station (nom, partenaire, adresse, téléphone)
4. Création cuves avec calibrages (1cm à 300cm)
5. Création pistolets
6. Boutique & Services (cocher ce qui existe)
7. Attente validation

**Routes** :

- `/onboarding/company` - Infos entreprise
- `/onboarding/station` - Création station
- `/onboarding/cuves` - Création cuves
- `/onboarding/pistolets` - Création pistolets
- `/onboarding/boutique` - Boutique & services

**Composants onboarding/** (14 items) :

**CompanyCreationForm**

- Description : Formulaire création entreprise (étape 2 onboarding)
- Logique métier : Informations entreprise (nom, pays, adresse, NIF, STAT, RCS, téléphone, WhatsApp)
- Fonctionnalités :
  - Champs : nom, pays, adresse, NIF, STAT, RCS, téléphone, WhatsApp
  - Validation champs obligatoires, format NIF/STAT
  - Sauvegarde entreprise dans table entreprises
  - Lien compte gérant à entreprise
- État local : formData, errors, loading
- Hooks : useAuth, useSupabase
- Services : entrepriseService.createEntreprise()
- Liens : /onboarding/station (suivant), /manager/stations (si entreprise existe déjà)
- Validation : Zod schema, NIF/STAT format
- Notifications : Toast succès création, toast erreur

**CreateCompanyForm**

- Description : Formulaire création compagnie (variante de CompanyCreationForm)
- Logique métier : Même logique que CompanyCreationForm, structure différente
- Fonctionnalités : Idem CompanyCreationForm
- État local : formData, errors, loading
- Hooks : useAuth, useSupabase
- Services : entrepriseService.createEntreprise()
- Liens : /onboarding/station
- Validation : Zod schema
- Notifications : Toast succès

**CreateStationsForm**

- Description : Formulaire création station (étape 3 onboarding)
- Logique métier : Création station (nom, partenaire, adresse, téléphone)
- Fonctionnalités :
  - Champs : nom station, partenaire (select), adresse, téléphone
  - Liste partenaires disponibles (officiels)
  - Création station dans table stations
  - Lien station à entreprise
- État local : formData, errors, loading, partenaires
- Hooks : useAuth, useSupabase
- Services : stationService.createStation(), partenaireService.getPartenaires()
- Liens : /onboarding/cuves (suivant)
- Validation : Zod schema
- Notifications : Toast succès création

**FuelTankCalibrationPage**

- Description : Page calibrage cuves carburant (étape 4 onboarding)
- Logique métier : Création cuves avec calibrages hauteur/volume (1cm à 300cm)
- Fonctionnalités :
  - Saisie nombre de cuves
  - Pour chaque cuve : nom, produit (essence, gasoil, pétrole lampant, lubrifiants, GPL)
  - Calibrage : tableau hauteur (cm) vs volume (litres) de 1cm à 300cm
  - Interpolation automatique entre points
  - Sauvegarde cuves dans table cuves
  - Sauvegarde calibrages dans table calibrages
- État local : cuves, currentCuve, calibrages, loading
- Hooks : useAuth, useSupabase
- Services : cuveService.createCuve(), calibrageService.createCalibrage()
- Liens : /onboarding/pistolets (suivant)
- Validation : Calibrage monotone croissant, min 10 points
- Notifications : Toast succès création cuves

**InitializationForm**

- Description : Formulaire initialisation (variante)
- Logique métier : Formulaire réutilisable initialisation
- Fonctionnalités :
  - Formulaire générique pour données initiales
  - Validation champs
- État local : formData, errors
- Hooks : useForm
- Services : aucun
- Liens : Aucun
- Validation : Zod schema
- Notifications : Aucun

**OnboardingFuelTanksPage**

- Description : Page cuves carburant onboarding (variante de FuelTankCalibrationPage)
- Logique métier : Idem FuelTankCalibrationPage, interface onboarding
- Fonctionnalités : Idem FuelTankCalibrationPage
- État local : cuves, calibrages, loading
- Hooks : useAuth, useSupabase
- Services : cuveService.createCuve(), calibrageService.createCalibrage()
- Liens : /onboarding/pistolets
- Validation : Idem FuelTankCalibrationPage
- Notifications : Toast succès

**OnboardingLayout**

- Description : Layout onboarding (étapes progress)
- Logique métier : Layout avec stepper pour suivre progression onboarding
- Fonctionnalités :
  - Header avec logo
  - Stepper : Entreprise → Station → Cuves → Pistolets → Boutique → Validation
  - Progress bar
  - Navigation précédent/suivant
- État : currentStep, totalSteps
- Hooks : useOnboarding (custom)
- Services : aucun
- Liens : Navigation entre étapes onboarding
- Validation : Aucun
- Notifications : Aucun

**OnboardingPumpsPage**

- Description : Page pistolets onboarding (étape 5)
- Logique métier : Création pistolets pour chaque cuve
- Fonctionnalités :
  - Liste cuves créées
  - Pour chaque cuve : nombre de pistolets
  - Pour chaque pistolet : code, nom, produit (lié à cuve)
  - Sauvegarde pistolets dans table pistolets
- État local : cuves, pistolets, loading
- Hooks : useAuth, useSupabase
- Services : pistoletService.createPistolet(), cuveService.getCuves()
- Liens : /onboarding/boutique (suivant)
- Validation : Code unique par pistolet
- Notifications : Toast succès création pistolets

**OnboardingStationsPage**

- Description : Page stations onboarding (variante de CreateStationsForm)
- Logique métier : Idem CreateStationsForm, interface onboarding
- Fonctionnalités : Idem CreateStationsForm
- État local : formData, partenaires, loading
- Hooks : useAuth, useSupabase
- Services : stationService.createStation(), partenaireService.getPartenaires()
- Liens : /onboarding/cuves
- Validation : Idem CreateStationsForm
- Notifications : Toast succès

**OnboardingTanksPage**

- Description : Page cuves onboarding (variante de FuelTankCalibrationPage)
- Logique métier : Idem FuelTankCalibrationPage, interface simplifiée
- Fonctionnalités : Idem FuelTankCalibrationPage
- État local : cuves, calibrages, loading
- Hooks : useAuth, useSupabase
- Services : cuveService.createCuve(), calibrageService.createCalibrage()
- Liens : /onboarding/pistolets
- Validation : Idem FuelTankCalibrationPage
- Notifications : Toast succès

**PistolsConfigurationPage**

- Description : Page configuration pistolets (variante de OnboardingPumpsPage)
- Logique métier : Idem OnboardingPumpsPage, interface configuration
- Fonctionnalités : Idem OnboardingPumpsPage
- État local : cuves, pistolets, loading
- Hooks : useAuth, useSupabase
- Services : pistoletService.createPistolet(), cuveService.getCuves()
- Liens : /onboarding/boutique
- Validation : Idem OnboardingPumpsPage
- Notifications : Toast succès

**StationCommercialProfilePage**

- Description : Page profil commercial station (étape 6 - boutique & services)
- Logique métier : Sélection boutique & services existants
- Fonctionnalités :
  - Checkboxes : Marchandises générales, Lubrifiants, GPL
  - Checkboxes services : Lavage, Parking, Vulcanisation
  - Sauvegarde profil commercial dans stations
- État local : hasBoutique, hasServices, servicesList, loading
- Hooks : useAuth, useSupabase
- Services : stationService.updateStation()
- Liens : /onboarding/validation (suivant)
- Validation : Au moins une option sélectionnée
- Notifications : Toast succès

**StationsPlaceholder**

- Description : Placeholder stations (aucune station créée)
- Logique métier : Affichage quand aucune station n'existe
- Fonctionnalités :
  - Message "Aucune station"
  - Bouton "Créer première station"
  - Illustration/icone
- État : aucun
- Hooks : aucun
- Services : aucun
- Liens : /onboarding/station
- Validation : Aucun
- Notifications : Aucun

**WaitingValidationPage**

- Description : Page attente validation (étape 7)
- Logique métier : Station créée, attente validation (partenaire ou superadmin)
- Fonctionnalités :
  - Message "Votre station est en attente de validation"
  - Liste stations en attente avec statut
  - Bouton "Actualiser" pour vérifier validation
  - Redirection automatique vers /manager/stations si validée
- État local : stations, loading
- Hooks : useAuth, useSupabase, useInterval (actualisation)
- Services : stationService.getStationsByEntreprise()
- Liens : /manager/stations (si validée)
- Validation : Aucun
- Notifications : Toast station validée

## ÉTAPE 8 : Page Structure (section 4)

**Comptes & Plan comptable** :

- Affichage plan comptable standard
- Personnalisation classes 1-2 (gérant)
- Auto-numérotation sous-comptes

**Tiers** :

- Création fournisseurs (401-xxx)
- Création clients (411-xxx)
- Création employés (421-xxx + 460-xxx auto)

**Articles/Produits** :

- 6 familles figées
- Hiérarchie : Famille → Catégorie → Article
- Prix vente par station
- Code-barres

**Trésorerie** :

- Création comptes (512, 513, 514, 530)
- Auto-numérotation

**Prix carburant** :

- Prix vente (réglementé)
- Marge par litre
- Prix achat calculé auto

**Objectifs & Seuils** :

- Objectifs CA/Volume
- Seuils alerte stock

**Composants manager/structure/** (9 items) :

- `StructureComptesPage` - Page comptes & plan comptable (affichage arborescent, personnalisation classes 1-2, auto-numérotation)
- `StructureTiersPage` - Page tiers (fournisseurs 401-xxx, clients 411-xxx, employés 421-xxx + 460-xxx auto)
- `StructureArticlesPage` - Page articles/produits (6 familles figées, hiérarchie Famille→Catégorie→Article, prix vente par station)
- `StructureCarburantsPage` - Page carburants (comptes 310/320/330, prix vente réglementé, marge par litre)
- `StructureServicesPage` - Page services (lavage 7061, vulcanisation 7062, parking, autres 706x)
- `StructureTresoreriePage` - Page trésorerie (512 Banque, 513 Mobile Money, 514 Note de crédit, 530 Caisse)
- `StructureCamionsPage` - Page camions (capacité, compartiments, volumes pour réception)
- `ManagerObjectifsPage` - Page objectifs CA/Volume par station/produit/période
- `ManagerSettingsPage` - Page seuils alerte stock par article par station

## ÉTAPE 9 : Page Initialisation (section 5)

**Accès** : Gérant uniquement

**Fonctionnalités** :

- Enregistrer (par onglet) : sauvegarde temporaire
- Valider Initialisation (global, irréversible) : A Nouveau + entrées stock + Capital Net

**Onglets** :

- Cuves (jauge réelle → volume → valorisation)
- Index Pistolets (index départ)
- Stock Boutique (quantités + prix → CMUP départ)
- Immobilisations
- Tiers (soldes)
- Trésorerie (soldes)
- Autres dettes

**Composants manager/initialisation/** (4 items) :

- `CompanyInitialisationPage` - Page initialisation globale entreprise (onglets : Cuves, Index Pistolets, Stock Boutique, Immobilisations, Tiers, Trésorerie, Autres dettes; Enregistrer par onglet, Valider Initialisation global irréversible génère A Nouveau + entrées stock + Capital Net)
- `InitialisationCarburantsPage` - Page initialisation cuves carburant (saisie jauge réelle → volume calculé via calibrages → valorisation automatique)
- `ManagerInitializationPage` - Page initialisation menu principal (navigation onglets, statut initialisation, bouton Valider)
- `ManagerPistolesPage` - Page initialisation index pistolets (index départ par pistolet, base premier shift)

## ÉTAPE 10 : Page Traitement (section 6)

### 6.1 Opérations Achat & Vente

**Achat Carburant** (4 onglets) :

- Bon de Commande (BC) : numéro auto, multi-stations, multi-produits
- Paiement : multi-modes, solde global fournisseur
- Réception : camion, compartiments, jauges avant/après
- BL/Facture : récapitulatif + actions

**Composants manager/fuel-purchase/** (6 items) :

- `PurchaseOrdersTab` - Tab BC (bons de commande : numéro auto, multi-stations, multi-produits, quantités indicatives; liste BC avec filtres statut)
- `CreatePurchaseOrderModal` - Modal création BC (sélection fournisseur, stations, produits, quantités; validation multi-stations)
- `PaymentsTab` - Tab paiements (multi-modes : note de crédit, chèque, virement; solde global fournisseur partenaire; liste paiements par BC)
- `AddPaymentModal` - Modal ajout paiement (sélection mode, montant, référence; mise à jour solde fournisseur)
- `DeliveriesTab` - Tab réceptions/livraisons (liste livraisons avec statut; lien vers réception camion)
- `TruckReceptionTab` - Tab réception camion (référence camion, compartiments, jauges avant/après dépotage; quantité nominale = base facturation; validation jauges)

**Vente Carburant (Shift)** :

- Pas d'ouverture, clôture auto ouvre suivant
- Index initial = final shift précédent
- Sélection station, pompiste, pistolet(s), index final
- Volume et CA calculés auto
- Paiements multi-modes
- Écarts → 460-xxx pompiste
- Clôture par supérieur hiérarchique

**Composants manager/fuel-sale/** (3 items) :

- `ManagerFuelSalesPage` - Page shifts carburant (pas d'ouverture, clôture auto ouvre suivant; index initial = final shift précédent; sélection station, pompiste, pistolet(s), index final; volume et CA calculés auto; paiements multi-modes; écarts → 460-xxx pompiste; clôture par supérieur hiérarchique; actions : Voir détails, Modifier, Mouvementer stock, Comptabiliser)
- `TraitementOperationsPage` - Page traitement opérations (menu principal achat/vente carburant)
- (Composants shifts à créer : ShiftForm, ShiftList, ShiftDetails)

**Achat Boutique** :

- Liste achats + Nouvel achat
- Fournisseur partenaire possible (401 commun)
- Autres fournisseurs : facture soldée à 0
- Mouvementer + Comptabiliser

**Composants manager/boutique-purchase/** (3 items) :

- `ManagerShopPurchasePage` - Page achats boutique (liste achats + Nouvel achat; sélection date, station, fournisseur, articles, prix d'achat manuel; fournisseur partenaire possible (401 commun); autres fournisseurs : facture soldée à 0 obligatoirement; actions : Mouvementer stock + Comptabiliser)
- (Composants achats boutique à créer : BoutiquePurchaseForm, BoutiquePurchaseList, BoutiquePurchaseDetails)

**Vente Boutique & POS** :

- Interface POS décentralisée
- Ouverture + clôture par même session
- Stock temps réel
- Paiements temps réel
- Comptabilisation groupée clôture shift
- Services comme catégorie (pas de stock)
- Code-barres intégré

**Composants manager/shop-sales/** (3 items) :

- `ManagerShopSalesPage` - Page POS boutique (interface POS décentralisée; ouverture + clôture par même session; stock temps réel; paiements temps réel; code-barres intégré; recherche produit; panier; validation paiement)
- `ManagerServiceSalesPage` - Page ventes services (services comme catégorie sans stock; sélection service, quantité, prix; facturation)
- `ManagerShopShiftPage` - Page shifts boutique (comptabilisation groupée clôture shift; récapitulatif ventes; validation shift par responsable; écritures comptables groupées)

**Transfert Stock** :

- Entre stations même entreprise
- Valorisation = CMUP origine
- Pas d'écriture comptable

**Composants manager/stock-transfer/** (3 items) :

- `ManagerStockTransferPage` - Page transferts stock (entre stations même entreprise; sélection station origine, station destination, article, quantité; valorisation = CMUP origine; pas d'écriture comptable; sortie stock station A + entrée stock station B; CMUP station B recalculé après réception)
- (Composants transferts à créer : StockTransferForm, StockTransferList, StockTransferDetails)

### 6.2 Inventaire

**Inventaire Carburant** :

- Stock initial = réel dernier inventaire
- Stock théorique = initial + achats - ventes
- Écart = réel - théorique
- Régulariser (ajustement + comptabilisation)
- Écarts : justifié (652→310), excédent (310→752), infondé (460→310)

**Inventaire Boutique** :

- Même principe
- Saisie quantité physique (pas jauge)
- Motif obligatoire (périmé, cassé, perte...)

**Composants manager/inventory/** (3 items) :

- `ManagerFuelInventoryPage` - Page inventaire carburant (stock initial = réel dernier inventaire; stock théorique = initial + achats - ventes; écart = réel - théorique; saisie jauge réelle; régulariser ajustement + comptabilisation; écarts : justifié 652→310, excédent 310→752, infondé 460→310)
- `ManagerShopInventoryPage` - Page inventaire boutique (même principe; saisie quantité physique; motif obligatoire : périmé, cassé, perte; écritures avec comptes 34x/36x/37x)
- `TraitementInventairePage` - Page traitement inventaires (menu principal inventaires)

### 6.3 Opérations Hors Achat & Vente

**Types** :

- Virement Interne
- Encaissement Créances (clients/employés)
- Règlement Dettes
- Charges Courantes
- Salaires (3 étapes)
- Charges Fiscales & Sociales
- Opérations du Gérant
- Immobilisations (acquisition/cession)

**Règle** : Partie double obligatoire (∑ Débits = ∑ Crédits)

**Composants manager/noperations/** (15 items dans sous-dossiers) :

- `ManagerNonSalesOperationsPage` - Page principale opérations hors achat/vente (menu : Virement Interne, Encaissement Créances, Règlement Dettes, Charges Courantes, Salaires, Charges Fiscales & Sociales, Opérations Gérant, Immobilisations; partie double obligatoire ∑ Débits = ∑ Crédits)
- `ChargesCourantesPanel` - Panel charges courantes (date, libellé, station/central analytique, compte 6xxx, fournisseur ou Non défini; 3 modes : cash total, crédit total, mixte; fournisseur Non défini : cash automatique écriture directe 6xxx→Trésorerie; partie crédit → Règlement dettes automatiquement)
- Sous-dossier ChargesCourantes/ - Composants charges courantes (formulaire, validation, écriture comptable)
- Sous-dossier Creances/ - Composants encaissement créances (liste triée échéance croissante; créances clients 411-xxx, créances employés 460-xxx; référence obligatoire; paiement partiel accepté; écriture : Trésorerie→411-xxx ou 460-xxx)
- Sous-dossier Fournisseurs/ - Composants règlement dettes (liste triée échéance croissante; partenaire carburant/lubrifiant : solde global; autres fournisseurs : soldé à 0 obligatoirement; référence obligatoire; écriture : 401-xxx→Trésorerie)
- Sous-dossier Gerant/ - Composants opérations gérant (Capital apport/retrait 101↔Trésorerie; Compte courant apport/retrait 455↔Trésorerie; Dividendes affectation 124→57, distribution 457→Trésorerie)
- Sous-dossier Immobilisations/ - Composants immobilisations (acquisition cash/crédit/mixte : 2xxx→Trésorerie/401-xxx; cession perte : Trésorerie+653→2xxx; cession bénéfice : Trésorerie→2xxx+753; pas d'amortissement)
- Sous-dossier Salaires/ - Composants salaires (étape 1 avance 15 : 421-xxx→Trésorerie; étape 2 constatation fin mois : 641→421-xxx; étape 3 paiement net restant : 421-xxx→Trésorerie; solde 421 = 0)
- Sous-dossier VirementInterne/ - Composants virement interne (Trésorerie entrante→Trésorerie sortante; partie double)
- Sous-dossier shared/ - Composants partagés (8 items : validation partie double, formulaire générique, sélecteur comptes, etc.)

### 6.4 Doléances

**Workflow** :

- Station crée incident (type, description)
- Partenaire "Bien reçu"
- Station "Problème réglé"
- Statuts : Envoyée / Prise en charge / Réglée

**Statistiques** :

- Délai moyen accusé réception
- Délai moyen résolution
- Types incidents fréquents
- Performance Territory Manager

**Composants manager/doleances/** (3 items) :

- `GrievancesPage` - Page doléances (station crée incident : type, description; notification immédiate au partenaire; liste incidents avec statut; statistiques automatiques : délai moyen accusé réception, délai moyen résolution, types incidents fréquents, performance Territory Manager)
- `TraitementDoleancesPage` - Page traitement doléances (workflow Station→Partenaire : Partenaire "Bien reçu" notification retour; Station "Problème réglé" clôture; statuts : Envoyée/Prise en charge/Réglée)
- `ManagerComplaintsPage` - Page plaintes (variante de GrievancesPage)
- Sous-dossier doleances/ - Composants doléances (formulaire création incident, liste incidents, détails incident)

**Autres composants manager/** (13 items) :

- `ManagerCompanyPage` - Page entreprise (informations entreprise : nom, pays, adresse, NIF, STAT, RCS, téléphone, WhatsApp; modification possible)
- `ManagerDashboardPage` - Dashboard gérant (CA journalier courbe; réalisations vs objectifs jauge/barre; situation trésorerie camembert; écarts carburant barre; stocks alerte liste; créances/dettes échéances proches liste)
- `ManagerOperationsPage` - Page opérations (menu principal traitement opérations)
- `ManagerReportsPage` - Page rapports (menu rapports : financiers, commerciaux, stocks, réseau)
- `ManagerStationsPage` - Page stations (liste stations entreprise; création/modification station; validation station)
- `ManagerTraitementPage` - Page traitement (menu principal traitement)
- `ManagerUsersPage` - Page utilisateurs/sessions (liste sessions; création session avec droits granulaires; modification permissions; suppression session)
- `NotificationsPage` - Page notifications (liste notifications utilisateur; marquer comme lues)
- `ReportBugPage` - Page rapport bug (formulaire rapport bug)
- `StationsValidationsPage` - Page validations stations (liste stations en attente validation; validation/rejet)
- `UserPermissionsModal` - Modal permissions utilisateur (configuration droits page par page, fonctionnalité par fonctionnalité)
- `ManagerPurchaseSalesPage` - Page achats/ventes (menu principal achats et ventes)
- Sous-dossier permissions/ - Composants permissions (formulaire permissions, sélecteur droits)
- Sous-dossier traitement/ - Composants traitement (layout traitement)

**Total manager/ : 81+ items**

## ÉTAPE 11 : Rapports (section 7)

**Types présentation** :

- Tableau chiffré
- Tableau comparatif (N vs N-1, Objectif vs Réel)
- Tableau cumulatif
- Fiche détaillée

**Rapports Financiers & Comptables** :

- Grand Livre
- Balance générale
- Bilan
- Compte de résultat
- Tableau trésorerie
- Balance âgée fournisseurs/clients
- Situation 460 par employé

**Rapports Commerciaux & Ventes** :

- CA journalier/mensuel/annuel
- CA par produit/famille/catégorie
- CA par pompiste/vendeuse/shift
- Comparatif N vs N-1
- Réalisations vs objectifs
- Top articles
- Situation créances
- Shifts carburant
- Marge brute

**Rapports Stocks** :

- État stocks valorisés CMUP
- Mouvements stock
- Historique inventaires
- Articles sous seuil
- Articles faible rotation
- Évolution prix achat
- Écarts carburant
- Suivi cuves

**Rapports Réseau (Partenaire)** :

- Vue synthétique réseau
- Comparatif inter-stations
- Statistiques doléances
- Écarts carburant réseau
- Réalisations vs objectifs

**Composants reports/** (23 items) :

- `GenericReportPage` - Page générique rapports (layout générique pour tous les rapports; filtres période, station, produit; export Excel/CSV)
- `GrandLivrePage` - Page Grand Livre (affichage écritures comptables chronologiques; filtres par compte, période, station; export)
- `ReportFilters` - Filtres rapports (composant réutilisable filtres : période, station, produit, statut)
- `ReportLayout` - Layout rapports (layout standard pour pages rapports avec PageContainer, PageHeader, CustomDataTable)
- `ReportTable` - Tableau rapports (composant CustomDataTable avec colonnes configurables)
- `reportDefinitions.ts` - Définitions rapports (configuration métadonnées rapports : colonnes, filtres, SQL queries)
- `reportHubMeta.ts` - Métadonnées hub rapports (configuration hub rapports avec catégories)
- `index.ts` - Export rapports (export centralisé composants rapports)
- Sous-dossier commercial/ (4 items) - Rapports commerciaux (CA journalier/mensuel/annuel; CA par produit/famille/catégorie; CA par pompiste/vendeuse/shift; Comparatif N vs N-1; Réalisations vs objectifs; Top articles; Situation créances; Shifts carburant; Marge brute)
- Sous-dossier financial/ (2 items) - Rapports financiers (Grand Livre; Balance générale; Bilan; Compte de résultat; Tableau trésorerie; Balance âgée fournisseurs/clients; Situation 460 par employé)
- Sous-dossier stock/ (9 items) - Rapports stocks (État stocks valorisés CMUP; Mouvements stock; Historique inventaires; Articles sous seuil; Articles faible rotation; Évolution prix achat; Écarts carburant; Suivi cuves)

## ÉTAPE 12 : Dashboard (section 8)

**Dashboard Gérant** :

- CA journalier (courbe)
- Réalisations vs objectifs (jauge/barre)
- Situation trésorerie (camembert)
- Écarts carburant (barre)
- Stocks alerte (liste)
- Créances/Dettes échéances proches (liste)

**Dashboard Partenaire** :

- Performance réseau
- CA par station (barres)
- Écarts carburant réseau (courbe)
- Doléances en cours (liste + délais)
- Réalisations vs objectifs réseau

**Composants dashboard/** (12 items) :

- (Composants dashboard à créer selon guide section 8 : KPI cards avec gradients, graphiques courbes/barres/camemberts via recharts, filtres temporels jour/semaine/mois/année, actualisation automatique via useInterval ou Supabase Realtime)

**Composants admin/** (17 items) :

- `AdminAlertsList` - Liste alertes admin (alertes système, erreurs, anomalies; filtres par type, statut; actions : Voir détails, Marquer comme résolu)
- `AdminAuditLogsPage` - Page logs audit (historique actions utilisateurs; filtres par utilisateur, date, action; export CSV)
- `AdminBugReportsPage` - Page rapports bugs (liste bugs signalés; statut : Nouveau, En cours, Résolu; filtres; actions : Assigner, Résoudre)
- `AdminExpensesPage` - Page dépenses admin (suivi dépenses platform; liste dépenses; validation; export)
- `AdminKpiCard` - Carte KPI admin (composant réutilisable pour affichage KPI avec gradient)
- `AdminRevenuePage` - Page revenus admin (revenus par partenaire; graphiques revenus; filtres temporels)
- `AdminSettingsPage` - Page paramètres admin (configuration platform globale; paramètres système; sauvegarde)
- `AdminShell` - Shell admin (layout admin avec sidebar, header, content)
- `AdminStationsPage` - Page stations admin (vue globale stations; validation stations; désactivation stations)
- `AdminSubscriptionsPage` - Page abonnements admin (gestion abonnements partenaires; création, modification, suppression; suivi paiements)
- `AdminUsersPage` - Page utilisateurs admin (gestion comptes superadmin; création, modification, suppression)
- `AuditLogsPage` - Page logs audit (variante de AdminAuditLogsPage)
- `ComingSoonPage` - Page à venir (placeholder pour fonctionnalités non implémentées)
- `RevenueByPartnerBars` - Barres revenus par partenaire (composant graphique pour dashboard admin)
- `StatusPill` - Pillule statut (composant réutilisable pour affichage statut avec couleur)
- `SuperAdminDashboardPage` - Dashboard superadmin (KPI globales : revenus, utilisateurs, stations; graphiques tendances; liste alertes)
- `statusPillHelpers.ts` - Helpers pillules statut (fonctions utilitaires pour détermination couleur statut)

**Composants partner/** (4 items) :

- `PartnerDashboardPage` - Dashboard partenaire (performance réseau; CA par station barres; écarts carburant réseau courbe; doléances en cours liste + délais; réalisations vs objectifs réseau)
- `PartnerGrievancesPage` - Page doléances partenaire (liste incidents stations; actions : Bien reçu, Marquer réglé; statistiques : délai moyen accusé réception, délai moyen résolution)
- `PartnerStationValidationsPage` - Page validations stations partenaire (liste stations en attente validation; actions : Valider, Rejeter avec motif; notification station)
- `PartnerStationsPage` - Page stations partenaire (liste stations du partenaire; détails stations; performance par station)

**Composants common/** (13 items) :

- (Composants communs à créer : PageContainer, PageHeader, CustomDataTable, LoadingSpinner, EmptyState, ErrorBoundary, ConfirmDialog, DateRangePicker, SelectStation, SelectProduit, BadgeStatut, Pagination)

**Composants errors/** (5 items) :

- (Composants erreurs à créer : NotFoundPage, UnauthorizedPage, ServerErrorPage, MaintenancePage, NetworkErrorPage)

**Composants layout/** (4 items) :

- (Composants layout à créer : ManagerLayout (layout gérant avec sidebar), AdminLayout (layout admin avec sidebar), PartnerLayout (layout partenaire avec sidebar), PublicLayout (layout pages publiques))

**Composants messaging/** (1 item) :

- (Composant messaging à créer : NotificationCenter pour affichage notifications temps réel via Supabase Realtime)

**Composants pos/** (2 items) :

- (Composants POS à créer : POSInterface (interface principale POS avec scanner code-barres, panier, paiement), POSShift (gestion shifts POS avec ouverture/clôture))

**Composants ui/** (51 items) :

- (Composants shadcn/ui à créer via npx shadcn@latest init : Button, Input, Label, Select, Checkbox, Radio, Switch, Slider, Textarea, Dialog, DropdownMenu, Popover, Tooltip, Alert, Badge, Card, Avatar, Progress, Skeleton, Table, Tabs, Accordion, Command, Form, Calendar, DateRangePicker, ScrollArea, Separator, Sheet, Toast, Sonner, etc.)

**Total estimé pages/composants : 221+ items**

## ÉTAPE 13 : Tests

**Tests unitaires** (Vitest) :

- Logique métier isolée
- Hooks personnalisés
- Services Supabase (mock)

**Tests E2E** (Playwright) :

- Flux utilisateur complets
- Authentification
- Onboarding
- Opérations achat/vente
- Inventaires

**Tests de qualité** :

- ESLint
- TypeScript (tsc --noEmit)
- Build production (npm run build)

## ÉTAPE 14 : Déploiement

**Vercel** :

- Configuration vercel.json
- Variables d'environnement
- Build et déploiement

## ÉTAPE 15 : Documentation

**Fichiers structurants** (selon guide section PROCESSUS) :

- `rules.md` - Règles globales + conventions
- `todo.md` - Tâches à faire
- `actions.md` - Historique actions
- `demandes.md` - Demandes utilisateur

**Processus validation** :

1. Respecter logique Guide Document SuccessFuel.md
2. Documenter dans rules.md
3. Tests automatisés (unitaires, intégration, E2E, mock)
4. Validation manuelle utilisateur
5. Design UI/UX
