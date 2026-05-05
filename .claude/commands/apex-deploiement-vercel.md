---
description: APEX — Configurer et déployer l'application sur Vercel (vercel.json, variables d'environnement, build production)
argument-hint: <aucun — lancer directement>
---

<objective>
L'application n'est pas encore déployée sur Vercel (ÉTAPE 14 dans todo.md).
Configurer vercel.json, les variables d'environnement et effectuer le déploiement initial.
Hébergement : Vercel plan gratuit (selon §3 Guide Document).
L'URL Supabase est https://uetkdbpmqxdnnnwkyzzi.supabase.co (visible dans plan-execution.md).
Le build npm run build doit réussir AVANT tout déploiement.
</objective>

<context>
Fichiers à analyser IMPÉRATIVEMENT :
- guide/Guide_Document_SuccessFuel.md §3 "STACK TECHNIQUE — Hébergement : Vercel plan gratuit"
- next.config.ts (configuration Next.js actuelle)
- package.json (scripts, dépendances)
- .env.local (variables d'environnement locales — NE PAS inclure dans le repo)
- .gitignore (vérifier que .env.local est ignoré)
- README.md (à mettre à jour avec instructions déploiement)

Variables d'environnement nécessaires :
- NEXT_PUBLIC_SUPABASE_URL (public)
- NEXT_PUBLIC_SUPABASE_ANON_KEY (public — anon key uniquement)
- SUPABASE_SERVICE_ROLE_KEY (privée — server-side uniquement, jamais exposée)
- NEXTAUTH_SECRET ou autre secret d'app si nécessaire

Contraintes Vercel plan gratuit :
- Build time < 45 minutes
- Serverless functions < 10 secondes timeout
- Edge functions si plus rapide pour middleware
- 100 GB bandwidth/mois
</context>

<process>
## ÉTAPE 1 — ANALYZE
1. Exécuter npm run build localement — vérifier 0 erreur, lister les warnings
2. Vérifier next.config.ts pour les rewrites, headers et config image
3. Vérifier src/proxy.ts pour comprendre le proxy Supabase
4. Identifier les variables d'environnement utilisées dans le code (NEXT_PUBLIC_*)
5. Vérifier si .env.local existe et quelles clés il contient
6. Vérifier .gitignore pour s'assurer que .env.local est ignoré

## ÉTAPE 2 — PLAN
Fichiers à créer :
```
vercel.json              # Configuration Vercel (rewrites, headers, regions)
.env.example             # Template variables d'environnement (sans valeurs)
```

Fichiers à modifier :
- next.config.ts — vérifier compatibilité Vercel (output, images, etc.)
- README.md — ajouter section déploiement Vercel

## ÉTAPE 3 — EXECUTE
Étape 3.1 — Vérifier et corriger le build :
```bash
npm run build
# Corriger TOUTES les erreurs TypeScript et ESLint avant de continuer
```

Étape 3.2 — Créer vercel.json :
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "devCommand": "npm run dev",
  "regions": ["cdg1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

Étape 3.3 — Créer .env.example :
```env
# Supabase (requis)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Supabase Service Role (server-side uniquement — ne jamais exposer côté client)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Tests E2E (optionnel)
TEST_GERANT_EMAIL=
TEST_GERANT_PASSWORD=
TEST_PARTENAIRE_EMAIL=
TEST_PARTENAIRE_PASSWORD=
TEST_ADMIN_EMAIL=
TEST_ADMIN_PASSWORD=
```

Étape 3.4 — Vérifier next.config.ts pour Vercel :
```typescript
// Vérifier que images.remotePatterns inclut Supabase storage
// Vérifier que pas de require() CommonJS incompatible avec Vercel Edge
```

Étape 3.5 — Configurer les variables d'environnement Vercel :
Via Vercel Dashboard → Project Settings → Environment Variables :
- NEXT_PUBLIC_SUPABASE_URL → Production + Preview + Development
- NEXT_PUBLIC_SUPABASE_ANON_KEY → Production + Preview + Development
- SUPABASE_SERVICE_ROLE_KEY → Production seulement (pas Preview)

Étape 3.6 — Premier déploiement :
```bash
npx vercel --prod
# ou via GitHub integration (recommandé)
```

Étape 3.7 — Post-déploiement :
- Configurer dans Supabase : Auth → URL Configuration → Site URL = https://[projet].vercel.app
- Ajouter Redirect URLs : https://[projet].vercel.app/auth/callback
- Tester le flow auth complet sur l'URL de production

## ÉTAPE 4 — VALIDATE
- [ ] npm run build → 0 erreur TypeScript, 0 erreur ESLint
- [ ] npm run lint → 0 erreur
- [ ] vercel.json créé et valide
- [ ] .env.example créé avec toutes les variables nécessaires
- [ ] .env.local dans .gitignore (pas dans le repo)
- [ ] Déploiement Vercel réussit (build log sans erreur)
- [ ] URL de production accessible (login visible)
- [ ] Auth Supabase fonctionne sur l'URL de production (site URL configuré)
- [ ] Headers de sécurité présents (vérifier avec curl -I)
- [ ] README.md mis à jour avec instructions déploiement
</process>

<rules>
- Ne JAMAIS commit la SUPABASE_SERVICE_ROLE_KEY dans le code ou un fichier versionné
- Ne JAMAIS commit .env.local
- La SUPABASE_SERVICE_ROLE_KEY va UNIQUEMENT dans les Variables Vercel côté Production (pas côté client)
- Corriger 100% des erreurs de build avant de déployer
- Configurer Supabase Auth URL avant de tester le login sur la production
- Région Vercel recommandée : cdg1 (Paris) — proche de l'Afrique francophone
</rules>
