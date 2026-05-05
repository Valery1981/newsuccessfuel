/**
 * Script de création du compte Superadmin SuccessFuel
 *
 * Prérequis :
 *   1. Renseigner SUPABASE_SERVICE_ROLE_KEY dans .env.local
 *   2. Exécuter : node scripts/create-superadmin.mjs
 *
 * Ce script :
 *   - Crée l'utilisateur dans Supabase Auth (auth.users)
 *   - Insère l'entrée correspondante dans la table `comptes`
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Chargement manuel du .env.local (pas de dotenv requis)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

const envContent = readFileSync(envPath, "utf-8");
const env = Object.fromEntries(
  envContent
    .split("\n")
    .filter((line) => line.trim() && !line.startsWith("#"))
    .map((line) => {
      const [key, ...rest] = line.split("=");
      return [key.trim(), rest.join("=").trim()];
    })
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || SERVICE_ROLE_KEY === "REMPLACER_PAR_VOTRE_SERVICE_ROLE_KEY") {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY non configurée dans .env.local");
  console.error(
    "   → Allez dans votre dashboard Supabase : Settings → API → service_role key"
  );
  process.exit(1);
}

// ─── Configuration superadmin ────────────────────────────────────────────────
// Modifiez ces valeurs avant d'exécuter le script
const SUPERADMIN = {
  email: "admin@successfuel.mg",
  password: "SuccessFuel@2026!", // À changer après la première connexion
  nom: "SuccessFuel Admin",
  telephone: null,
  whatsapp: null,
};
// ─────────────────────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createSuperadmin() {
  console.log("🚀 Création du compte superadmin SuccessFuel...\n");

  // 1. Vérifier si le compte existe déjà dans la table comptes
  const { data: existing } = await supabase
    .from("comptes")
    .select("id, email, type")
    .eq("email", SUPERADMIN.email)
    .single();

  if (existing) {
    if (existing.type !== "superadmin") {
      console.error(
        `❌ Un compte avec l'email ${SUPERADMIN.email} existe déjà mais n'est PAS superadmin (type: ${existing.type})`
      );
      process.exit(1);
    }
    console.log(
      `⚠️  Un compte superadmin existe déjà pour ${SUPERADMIN.email} (id: ${existing.id})`
    );
    console.log("   Aucune modification effectuée.");
    process.exit(0);
  }

  // 2. Créer l'utilisateur dans Supabase Auth
  console.log(`📧 Création de l'utilisateur Auth : ${SUPERADMIN.email}`);
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: SUPERADMIN.email,
      password: SUPERADMIN.password,
      email_confirm: true, // Email confirmé d'emblée (superadmin)
      user_metadata: {
        role: "superadmin",
        nom: SUPERADMIN.nom,
      },
    });

  if (authError) {
    // Si l'utilisateur existe déjà dans auth, on récupère son ID
    if (authError.message?.includes("already registered") || authError.code === "email_exists") {
      console.log("   Utilisateur Auth déjà existant, récupération de l'ID...");
      const { data: users } = await supabase.auth.admin.listUsers();
      const existingUser = users?.users?.find((u) => u.email === SUPERADMIN.email);
      if (!existingUser) {
        console.error("❌ Impossible de récupérer l'utilisateur Auth existant");
        process.exit(1);
      }
      await insertCompte(existingUser.id);
    } else {
      console.error("❌ Erreur création Auth :", authError.message);
      process.exit(1);
    }
  } else {
    console.log(`   ✅ Utilisateur Auth créé (id: ${authData.user.id})`);
    await insertCompte(authData.user.id);
  }
}

async function insertCompte(supabaseUserId) {
  console.log(`📋 Insertion dans la table comptes...`);

  const { data, error } = await supabase
    .from("comptes")
    .insert({
      supabase_user_id: supabaseUserId,
      type: "superadmin",
      nom: SUPERADMIN.nom,
      email: SUPERADMIN.email,
      telephone: SUPERADMIN.telephone,
      whatsapp: SUPERADMIN.whatsapp,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("❌ Erreur insertion comptes :", error.message);
    process.exit(1);
  }

  console.log(`   ✅ Compte superadmin créé (id: ${data.id})`);
  console.log("\n═══════════════════════════════════════════════");
  console.log("✅ Superadmin SuccessFuel créé avec succès !");
  console.log("═══════════════════════════════════════════════");
  console.log(`   Email    : ${SUPERADMIN.email}`);
  console.log(`   Mot de passe : ${SUPERADMIN.password}`);
  console.log(`   ID compte : ${data.id}`);
  console.log("\n⚠️  Changez le mot de passe après votre première connexion !");
}

createSuperadmin().catch((err) => {
  console.error("❌ Erreur inattendue :", err);
  process.exit(1);
});
