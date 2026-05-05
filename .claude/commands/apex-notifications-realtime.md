---
description: APEX — Implémenter le NotificationCenter via Supabase Realtime (alertes stocks, échéances, doléances, shifts)
argument-hint: <aucun — lancer directement>
---

<objective>
Le dossier src/components/messaging/ est VIDE.
La page /manager/notifications existe (NotificationsPage.tsx 5.6k) mais elle est probablement en liste statique.
Selon §11 Dashboard et §10.9 Doléances du Guide Document, les notifications temps réel via Supabase Realtime sont obligatoires pour :
- Doléances : notification immédiate au Territory Manager quand station crée un incident
- Notification retour station quand TM clique "Bien reçu"
- Alertes stocks sous seuil (dashboard gérant)
- Échéances proches J-3/J-7 (dashboard gérant)
RÈGLE GUIDE §18 : Supabase Realtime UNIQUEMENT pour ventes live et mises à jour critiques — ne pas surcharger.
</objective>

<context>
Fichiers à analyser IMPÉRATIVEMENT :
- guide/Guide_Document_SuccessFuel.md §10.9 "DOLÉANCES" (workflow notification)
- guide/Guide_Document_SuccessFuel.md §11 "DASHBOARD GÉRANT — Alertes"
- guide/Guide_Document_SuccessFuel.md §18 "NOTES IMPORTANTES" (Realtime — ne pas surcharger)
- src/components/manager/NotificationsPage.tsx (page notifications existante)
- src/components/manager/doleances/DoleancesPage.tsx (doléances existantes — intégrer Realtime)
- src/components/partner/PartnerGrievancesPage.tsx (côté partenaire)
- src/app/(manager)/manager/notifications/ (route existante)
- src/types/supabase.ts (tables : notifications, doleances)
- src/utils/supabase/client.ts (client Supabase pour subscriptions)

Cas d'usage Realtime (limités selon §18) :
1. Doléances : nouvelle doléance créée → notification au partenaire (TM)
2. Doléances : TM clique "Bien reçu" → notification retour à la station
3. Doléances : station clique "Problème réglé" → notification au TM (clôture)
4. Stocks : alerte si stock ≤ seuil (polling toutes les 5 min — pas Realtime)
5. Échéances : alerte J-3/J-7 (calcul à chaque connexion — pas Realtime)

NE PAS mettre en Realtime (surcharge) :
- Ventes carburant (volume trop élevé)
- Mouvements stock boutique
- Écritures comptables
</context>

<process>
## ÉTAPE 1 — ANALYZE
1. Lire NotificationsPage.tsx pour comprendre la structure actuelle (liste statique ou Realtime ?)
2. Lire DoleancesPage.tsx pour identifier où insérer les subscriptions Realtime
3. Lire PartnerGrievancesPage.tsx pour le côté partenaire
4. Vérifier dans supabase.ts si une table notifications existe
5. Vérifier src/utils/supabase/client.ts pour la config Realtime
6. Analyser le hook useAuth et le store pour accéder à compte_id et role

## ÉTAPE 2 — PLAN
Fichiers à créer :
```
src/components/messaging/
├── NotificationCenter.tsx     # Composant cloche notifications (header)
└── NotificationToast.tsx      # Toast pour notifications temps réel

src/hooks/
└── useRealtimeNotifications.ts  # Hook custom Supabase Realtime

src/services/
└── notificationService.ts       # CRUD notifications
```

Fichiers à modifier :
- src/components/manager/NotificationsPage.tsx — brancher sur les vraies données
- src/components/manager/doleances/DoleancesPage.tsx — ajouter subscription Realtime
- src/components/partner/PartnerGrievancesPage.tsx — ajouter subscription Realtime
- Layout manager et layout partenaire — ajouter NotificationCenter dans le header

Structure DB attendue (table notifications) :
```sql
notifications (
  id uuid,
  destinataire_id uuid REFERENCES comptes(id),
  type varchar, -- 'doleance_nouvelle', 'doleance_bien_recu', 'doleance_reglee', 'stock_alerte'
  titre varchar,
  message text,
  lien varchar,  -- URL vers la page concernée
  lu boolean DEFAULT false,
  created_at timestamptz
)
```

## ÉTAPE 3 — EXECUTE
Ordre d'implémentation :

1. Créer notificationService.ts (getNotifications, markAsRead, createNotification)

2. Créer useRealtimeNotifications.ts :
```typescript
export function useRealtimeNotifications() {
  const { compte } = useAuthStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!compte?.id) return

    const channel = supabase
      .channel(`notifications-${compte.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `destinataire_id=eq.${compte.id}`
      }, (payload) => {
        // Invalider le cache des notifications
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
        // Afficher un toast
        toast(payload.new.titre, { description: payload.new.message })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [compte?.id])
}
```

3. Créer NotificationCenter.tsx :
   - Icône cloche avec badge nombre non lus
   - Popover avec liste des dernières notifications
   - Clic sur notification → navigate vers lien + marquer comme lu
   - "Tout marquer comme lu"

4. Modifier DoleancesPage.tsx :
   - Quand station crée doléance → appeler createNotification vers partenaire TM
   - Quand TM clique "Bien reçu" → createNotification vers station
   - Quand station clique "Problème réglé" → createNotification vers TM

5. Brancher NotificationsPage.tsx sur les vraies données (useQuery notifications)

6. Ajouter NotificationCenter dans les layouts

## ÉTAPE 4 — VALIDATE
- [ ] Subscription Realtime ne crée pas de memory leak (cleanup dans useEffect)
- [ ] Badge cloche se met à jour en temps réel (sans refresh)
- [ ] Toast s'affiche à la réception d'une notification
- [ ] Marquer comme lu fonctionne
- [ ] Doléance créée → notification reçue côté partenaire en <2 secondes
- [ ] "Bien reçu" → notification reçue côté station en <2 secondes
- [ ] Pas de subscription Realtime pour les ventes (respecter §18 guide)
- [ ] Cleanup correct (pas de fuites mémoire)
- [ ] TypeScript strict 0 erreur
</process>

<rules>
- Supabase Realtime UNIQUEMENT pour doléances (3 événements) — PAS pour les ventes ni les stocks
- Les alertes stocks et échéances = polling ou calcul à connexion (pas Realtime)
- Toujours cleanup les subscriptions dans le return de useEffect
- Un seul channel par utilisateur connecté (pas un channel par table)
- RLS sur la table notifications : chaque compte ne voit que ses notifications
- Toast non intrusif (position bottom-right, durée 5 secondes)
- La notification garde trace du lien pour naviguer vers le bon écran
</rules>
