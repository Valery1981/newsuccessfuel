import { describe, expect, it } from "vitest";
import { STANDARD_ACCOUNT_NUMEROS, STANDARD_REGISTRY } from "@/lib/comptabilite/compteMetadata/registryStandard";
import { findParentNumero } from "@/lib/comptabilite/compteMetadata/inheritance";
import { resolveCompte } from "@/lib/comptabilite/compteMetadata/resolver";
import {
  assertCompteUsage,
  listComptesInitialisationDetteHorsTiers,
  resolveTiersCompteCreance,
  resolveTiersCompteDette,
  resolveTiersCompteDetteEmploye,
  CompteMetadataError,
} from "@/lib/comptabilite/compteMetadata/usages";

describe("STANDARD_REGISTRY", () => {
  it("contient exactement 78 comptes", () => {
    expect(STANDARD_REGISTRY.size).toBe(78);
    expect(STANDARD_ACCOUNT_NUMEROS.length).toBe(78);
  });

  it("120 n'est pas éligible à l'initialisation", () => {
    const c120 = STANDARD_REGISTRY.get("120")!;
    expect(c120.comportement.initialisation.creance).toBe(false);
    expect(c120.comportement.initialisation.dette).toBe(false);
    expect(c120.categorie).toBe("RESULTAT_EXERCICE");
  });
});

describe("findParentNumero", () => {
  it.each([
    ["215-001", "215"],
    ["401-001", "401"],
    ["411-042", "411"],
    ["421-003", "421"],
    ["460-007", "460"],
    ["455-001", "455"],
    ["457-001", "457"],
    ["6031", "603"],
    ["7074", "707"],
  ])("%s → parent %s", (numero, parent) => {
    expect(findParentNumero(numero)).toBe(parent);
  });
});

describe("resolveCompte", () => {
  it("hérite le comportement du parent pour un sous-compte tiret", () => {
    const meta = resolveCompte("411-099");
    expect(meta.heriteDe).toBe("411");
    expect(meta.comportement.initialisation.creance).toBe(true);
    expect(meta.nature).toBe("ACTIF");
  });

  it("421-001 est une dette salariale, pas une créance", () => {
    const meta = resolveCompte("421-001");
    expect(meta.heriteDe).toBe("421");
    expect(meta.comportement.initialisation.dette).toBe(true);
    expect(meta.comportement.initialisation.creance).toBe(false);
  });

  it("455 hérite dette associé (pas fournisseur)", () => {
    const meta = resolveCompte("455-002");
    expect(meta.categorie).toBe("DETTE_ASSOCIE");
    expect(meta.comportement.operations.lieTiersFournisseur).toBe(false);
    expect(meta.comportement.initialisation.dette).toBe(true);
  });

  it("lance si compte inconnu sans parent", () => {
    expect(() => resolveCompte("999-001")).toThrow(CompteMetadataError);
    expect(() => resolveCompte("999")).toThrow(CompteMetadataError);
  });
});

describe("resolveTiersCompteCreance", () => {
  it("client → compte_principal (411)", () => {
    expect(
      resolveTiersCompteCreance({
        type: "client",
        compte_principal: "411-001",
      }),
    ).toBe("411-001");
  });

  it("employé → compte_responsabilite (460), pas 421", () => {
    expect(
      resolveTiersCompteCreance({
        type: "employe",
        compte_principal: "421-001",
        compte_responsabilite: "460-001",
      }),
    ).toBe("460-001");
  });
});

describe("listComptesInitialisationDetteHorsTiers", () => {
  it("inclut 431, 161, 455, 457 mais pas 401 ni 421 central", () => {
    const numeros = listComptesInitialisationDetteHorsTiers().map((d) => d.numero);
    expect(numeros).not.toContain("421");
    expect(numeros).toContain("431");
    expect(numeros).toContain("161");
    expect(numeros).toContain("455");
    expect(numeros).toContain("457");
    expect(numeros).not.toContain("401");
  });
});

describe("resolveTiersCompteDette", () => {
  it("employé → compte_principal 421-xxx", () => {
    expect(
      resolveTiersCompteDetteEmploye({
        type: "employe",
        compte_principal: "421-002",
      }),
    ).toBe("421-002");
    expect(
      resolveTiersCompteDette({
        type: "employe",
        compte_principal: "421-002",
        compte_responsabilite: "460-002",
      }),
    ).toBe("421-002");
  });
});

describe("assertCompteUsage", () => {
  it("460-001 autorisé en INITIALISATION_CREANCE", () => {
    expect(() =>
      assertCompteUsage("460-001", "INITIALISATION_CREANCE"),
    ).not.toThrow();
  });

  it("421-001 refusé en INITIALISATION_CREANCE", () => {
    expect(() =>
      assertCompteUsage("421-001", "INITIALISATION_CREANCE"),
    ).toThrow(CompteMetadataError);
  });

  it("421-001 autorisé en INITIALISATION_DETTE", () => {
    expect(() =>
      assertCompteUsage("421-001", "INITIALISATION_DETTE"),
    ).not.toThrow();
  });

  it("120 refusé en initialisation", () => {
    expect(() =>
      assertCompteUsage("120", "INITIALISATION_DETTE"),
    ).toThrow(CompteMetadataError);
  });
});
