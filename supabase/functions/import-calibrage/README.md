# Edge Function: `import-calibrage`

APEX-OCR — Extraction des points de calibrage de cuves depuis fichiers (CSV, TXT, PDF, JPG, PNG).

## Contexte

§5.4 + §6.6 rules.md : permettre au gérant d'importer le tableau de calibrage fourni par le constructeur de cuve sans saisie manuelle ligne par ligne.

## Endpoint

```
POST /functions/v1/import-calibrage
Content-Type: multipart/form-data
Authorization: Bearer <user-jwt>

Body (FormData):
  file: <File>  // CSV, TXT, TSV, PDF, JPG, PNG, WEBP
```

## Réponse

```json
{
  "success": true,
  "points": [
    { "hauteur_cm": 0, "volume_litres": 0 },
    { "hauteur_cm": 10, "volume_litres": 150, "source_line": 2 },
    { "hauteur_cm": 20, "volume_litres": 320 }
  ],
  "meta": {
    "file_type": "pdf",
    "raw_text_length": 1247,
    "points_count": 3,
    "errors_count": 0,
    "ocr_used": true
  },
  "warnings": []
}
```

## Variables d'environnement

| Var | Requis | Description |
|---|---|---|
| `OCR_SPACE_API_KEY` | Optionnel | Clé OCR.space (free tier 25k req/mois). Sans, seuls CSV/TXT supportés. |

Configurer via :
```bash
supabase secrets set OCR_SPACE_API_KEY=<your_key>
```

Obtenir une clé : https://ocr.space/ocrapi/freekey

## Déploiement

```bash
supabase functions deploy import-calibrage --no-verify-jwt=false
```

ou via le MCP `mcp7_deploy_edge_function`.

## Validation §6.6

Chaque point retourné a un champ `errors[]` si :
- Hauteur ou volume invalides (NaN, négatifs)
- Volume non strictement croissant
- Hauteur ou volume en doublon

Le frontend (composant `CalibrageImporter`) affiche ces erreurs sans bloquer l'import partiel.

## Limitation

Le moteur OCR.space free tier a des limites de précision sur les tableaux scannés à basse résolution. Pour des stations équipées de tableaux papier dégradés, recommandation : envoyer un PDF généré ou un JPG nette à 300 DPI minimum.

## Évolutions futures

- Migration vers Google Vision API ou AWS Textract pour précision tableau supérieure
- OCR client-side via Tesseract.js WASM (offline)
- Détection automatique unités (cm vs mm, L vs hL)
