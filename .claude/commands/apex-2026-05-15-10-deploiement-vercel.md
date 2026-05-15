---
description: APEX 2026-05-15-10 — Configuration Vercel + variables env + déploiement production
argument-hint: <aucun — lancer directement>
priority: 🟡 BASSE
---

<objective>
Pas de `vercel.json` à la racine. Pas de doc déploiement.
Objectif : préparer le déploiement Vercel avec config conforme Next.js 16 + Supabase.
</objective>

<context>
Stack : Next.js 16 App Router, Supabase, next-pwa, next-intl.
Variables nécessaires :
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY (ou publishable key sb_publishable_...)
- SUPABASE_SERVICE_ROLE_KEY (server only)
- NEXT_PUBLIC_SITE_URL
</context>

<process>
## ÉTAPE 1 — ANALYZE
1. Lire `next.config.ts` pour PWA + i18n
2. Vérifier `package.json` build script
3. Identifier les routes serverless (API routes)

## ÉTAPE 2 — PLAN
1. Créer `vercel.json` :
   ```json
   {
     "buildCommand": "npm run build",
     "framework": "nextjs",
     "regions": ["cdg1"]
   }
   ```
2. Documenter env vars dans `README.md`
3. Vérifier `.env.example`
4. Préparer GitHub Action pour preview/prod

## ÉTAPE 3 — EXECUTE
1. Créer vercel.json
2. Créer .env.example si absent
3. Mettre à jour README.md section déploiement
4. Test local `npm run build` puis `vercel --prod` (manuel)

## ÉTAPE 4 — VALIDATE
- [ ] Build production réussit
- [ ] Variables d'env documentées
- [ ] vercel.json présent
- [ ] Déploiement preview réussi
- [ ] PWA service worker fonctionnel
</process>

<rules>
- SUPABASE_SERVICE_ROLE_KEY jamais dans le client
- Région `cdg1` (Paris) pour latence Madagascar/Afrique francophone
- Caching headers respectent Next.js defaults
</rules>
