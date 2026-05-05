/**
 * Edge Function : import-calibrage (APEX-OCR — §5.4 + §6.6 rules.md).
 *
 * Reçoit un fichier (PDF, JPG, PNG, CSV, TXT) et retourne les points de calibrage
 * extraits sous forme de paires { hauteur_cm, volume_litres }.
 *
 * Pipeline :
 *  1. Détection du type de fichier (header magic bytes ou content-type)
 *  2. CSV/TXT → parse direct (réutilise la même logique que CalibrageImporter côté client)
 *  3. PDF/Image → OCR via OCR.space API (clé en env var `OCR_SPACE_API_KEY`)
 *  4. Validation §6.6 : volumes strictement croissants, pas de doublons
 *  5. Réponse JSON normalisée
 *
 * Auth : JWT requis (verify_jwt: true)
 *
 * Variables d'environnement attendues :
 *  - `OCR_SPACE_API_KEY` (optionnel) : clé API OCR.space (free tier 25k req/mois)
 *
 * Si la clé OCR n'est pas fournie, seuls les fichiers texte sont supportés.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface CalibragePoint {
  hauteur_cm: number;
  volume_litres: number;
  source_line?: number;
  errors?: string[];
}

interface ApiResponse {
  success: boolean;
  points: CalibragePoint[];
  meta: {
    file_type: string;
    raw_text_length: number;
    points_count: number;
    errors_count: number;
    ocr_used: boolean;
  };
  warnings?: string[];
  error?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Parser identique à `parseCalibrageText` côté client (§6.6). */
function parseCalibrageText(raw: string): CalibragePoint[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l, i) => ({ raw: l.trim(), idx: i + 1 }))
    .filter((l) => l.raw.length > 0 && !/^[#-]/.test(l.raw));

  const points: CalibragePoint[] = [];
  for (const { raw: line, idx } of lines) {
    const hasStrongSep = /[;\t]/.test(line);
    const splitter = hasStrongSep ? /[\t;]/ : /[,\s]+/;
    const parts = line
      .split(splitter)
      .map((p) => {
        const cleaned = p.replace(/[^0-9.,-]/g, "");
        return hasStrongSep ? cleaned.replace(",", ".") : cleaned;
      })
      .filter((p) => p.length > 0);

    if (parts.length < 2) {
      points.push({
        hauteur_cm: 0,
        volume_litres: 0,
        source_line: idx,
        errors: ["Ligne illisible"],
      });
      continue;
    }

    const hauteur = Number.parseFloat(parts[0]);
    const volume = Number.parseFloat(parts[1]);
    const errs: string[] = [];
    if (!Number.isFinite(hauteur) || hauteur < 0) errs.push("Hauteur invalide");
    if (!Number.isFinite(volume) || volume < 0) errs.push("Volume invalide");

    points.push({
      hauteur_cm: hauteur,
      volume_litres: volume,
      source_line: idx,
      errors: errs.length > 0 ? errs : undefined,
    });
  }

  // Validation §6.6 : croissance monotone + pas de doublons
  const seenH = new Set<number>();
  const seenV = new Set<number>();
  let lastVol = -Infinity;
  for (const p of points) {
    if (p.errors && p.errors.length > 0) continue;
    const errs: string[] = [];
    if (seenH.has(p.hauteur_cm))
      errs.push(`Hauteur ${p.hauteur_cm} en doublon`);
    if (seenV.has(p.volume_litres))
      errs.push(`Volume ${p.volume_litres} en doublon`);
    if (p.volume_litres <= lastVol)
      errs.push(`Volume non strictement croissant`);
    seenH.add(p.hauteur_cm);
    seenV.add(p.volume_litres);
    lastVol = p.volume_litres;
    if (errs.length > 0) p.errors = [...(p.errors ?? []), ...errs];
  }

  return points;
}

/** OCR via OCR.space (free tier). Renvoie le texte extrait ou une exception. */
async function ocrViaOcrSpace(file: Blob, language = "fre"): Promise<string> {
  const apiKey = Deno.env.get("OCR_SPACE_API_KEY");
  if (!apiKey) {
    throw new Error(
      "OCR_SPACE_API_KEY non configuré — seuls les fichiers texte (CSV/TXT) sont supportés.",
    );
  }

  const fd = new FormData();
  fd.append("file", file, "calibrage.pdf");
  fd.append("language", language);
  fd.append("OCREngine", "2"); // moteur 2 plus précis pour tableaux
  fd.append("isTable", "true");
  fd.append("scale", "true");

  const res = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: { apikey: apiKey },
    body: fd,
  });

  if (!res.ok) {
    throw new Error(`OCR API error: HTTP ${res.status}`);
  }

  const data = await res.json();
  if (data?.IsErroredOnProcessing) {
    throw new Error(
      `OCR échoué: ${data?.ErrorMessage?.join?.("; ") ?? "raison inconnue"}`,
    );
  }

  const parsed = (data?.ParsedResults ?? [])
    .map((r: { ParsedText?: string }) => r.ParsedText ?? "")
    .join("\n");

  return parsed;
}

function detectFileType(filename: string, contentType: string): string {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  if (["csv", "txt", "tsv"].includes(ext)) return "text";
  if (["pdf"].includes(ext)) return "pdf";
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return "image";
  if (contentType.startsWith("text/")) return "text";
  if (contentType === "application/pdf") return "pdf";
  if (contentType.startsWith("image/")) return "image";
  return "unknown";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        points: [],
        meta: {
          file_type: "n/a",
          raw_text_length: 0,
          points_count: 0,
          errors_count: 0,
          ocr_used: false,
        },
        error: "Méthode non autorisée — POST attendu",
      },
      405,
    );
  }

  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return jsonResponse(
        buildError("Fichier manquant — clé `file` requise dans FormData"),
        400,
      );
    }

    const fileType = detectFileType(file.name, file.type);
    let rawText = "";
    let ocrUsed = false;

    if (fileType === "text") {
      rawText = await file.text();
    } else if (fileType === "pdf" || fileType === "image") {
      rawText = await ocrViaOcrSpace(file, "fre");
      ocrUsed = true;
    } else {
      return jsonResponse(
        buildError(
          `Type de fichier non supporté (${fileType}). Formats acceptés : CSV, TXT, TSV, PDF, JPG, PNG, WEBP.`,
        ),
        415,
      );
    }

    const points = parseCalibrageText(rawText);
    const errorsCount = points.filter(
      (p) => p.errors && p.errors.length > 0,
    ).length;

    const response: ApiResponse = {
      success: true,
      points,
      meta: {
        file_type: fileType,
        raw_text_length: rawText.length,
        points_count: points.length,
        errors_count: errorsCount,
        ocr_used: ocrUsed,
      },
      warnings:
        errorsCount > 0
          ? [
              `${errorsCount} point(s) avec erreur — vérifier manuellement avant import.`,
            ]
          : undefined,
    };

    return jsonResponse(response, 200);
  } catch (err) {
    return jsonResponse(buildError((err as Error).message), 500);
  }
});

function buildError(message: string): ApiResponse {
  return {
    success: false,
    points: [],
    meta: {
      file_type: "unknown",
      raw_text_length: 0,
      points_count: 0,
      errors_count: 0,
      ocr_used: false,
    },
    error: message,
  };
}

function jsonResponse(body: ApiResponse, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
