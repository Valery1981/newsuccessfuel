import fs from "fs";
import pg from "pg";

const INIT_ID = "d814a47e-87a3-4832-8a75-04beeac95a61";
const ENTREPRISE_ID = "678a1b7f-e77a-4153-a423-97d23437db10";
const DATE_OUVERTURE = "2026-05-16";

const envText = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const dbUrl = envText
  .split("\n")
  .map((l) => l.trim())
  .find((l) => l.startsWith("DATABASE_URL_POOLER="))
  ?.slice("DATABASE_URL_POOLER=".length)
  ?? envText
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith("DATABASE_URL=") && !l.includes("POOLER"))
    ?.slice("DATABASE_URL=".length);

const client = new pg.Client({ connectionString: dbUrl });
await client.connect();

const auditBefore = await client.query(
  `SELECT le.id, le.numero_compte, le.libelle_compte, le.debit, le.credit,
          ec.libelle AS ecriture_libelle, ec.reference_numero
   FROM public.lignes_ecriture le
   JOIN public.ecritures_comptables ec ON ec.id = le.ecriture_id
   WHERE ec.type_operation = 'initialisation_a_nouveau'
     AND ec.reference_numero LIKE $1
     AND split_part(le.numero_compte, '-', 1) = '101'
   ORDER BY ec.reference_numero`,
  [`INIT:${INIT_ID}:%`],
);
console.log("AVANT — lignes 101 INIT:", auditBefore.rowCount);
console.table(auditBefore.rows);

const rebuild = await client.query(
  `SELECT public.rebuild_initialisation_ouverture_globale($1::uuid, $2::uuid, $3::date, NULL) AS lignes_bilan`,
  [INIT_ID, ENTREPRISE_ID, DATE_OUVERTURE],
);
console.log("Rebuild:", rebuild.rows[0]);

const auditAfter = await client.query(
  `SELECT * FROM public.audit_init_lignes_101($1::uuid)`,
  [INIT_ID],
);
console.log("AUDIT après rebuild:", auditAfter.rows[0]);

const lignes101 = await client.query(
  `SELECT le.id, le.numero_compte, le.libelle_compte, le.debit, le.credit,
          ec.libelle AS ecriture_libelle, ec.reference_numero
   FROM public.lignes_ecriture le
   JOIN public.ecritures_comptables ec ON ec.id = le.ecriture_id
   WHERE ec.type_operation = 'initialisation_a_nouveau'
     AND ec.reference_numero LIKE $1
     AND split_part(le.numero_compte, '-', 1) = '101'`,
  [`INIT:${INIT_ID}:%`],
);
console.log("APRÈS — lignes 101 INIT:", lignes101.rowCount);
console.table(lignes101.rows);

const ecritures = await client.query(
  `SELECT id, reference_numero, libelle, module_initialisation
   FROM public.ecritures_comptables
   WHERE type_operation = 'initialisation_a_nouveau'
     AND reference_numero LIKE $1`,
  [`INIT:${INIT_ID}:%`],
);
console.log("Écritures INIT restantes:", ecritures.rowCount);
console.table(ecritures.rows);

await client.end();

if (!auditAfter.rows[0]?.ok) {
  process.exit(1);
}
