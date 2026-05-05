import { describe, it, expect } from "vitest";
import { getDashboardPath, getPostLoginPath } from "@/lib/authPaths";

describe("authPaths", () => {
  it("getDashboardPath renvoie les routes par rôle", () => {
    expect(getDashboardPath("superadmin")).toBe("/admin/dashboard");
    expect(getDashboardPath("gerant")).toBe("/manager/dashboard");
    expect(getDashboardPath("partenaire")).toBe("/partner/dashboard");
  });

  it("getPostLoginPath envoie vers first-login si must_change_password", () => {
    expect(
      getPostLoginPath({
        type: "partenaire",
        must_change_password: true,
      })
    ).toBe("/public/first-login");
  });

  it("getPostLoginPath envoie vers le dashboard si mot de passe déjà validé", () => {
    expect(
      getPostLoginPath({
        type: "partenaire",
        must_change_password: false,
      })
    ).toBe("/partner/dashboard");
  });

  it("getPostLoginPath traite must_change_password absent ou non true comme terminé", () => {
    expect(getPostLoginPath({ type: "gerant" })).toBe("/manager/dashboard");
    expect(
      getPostLoginPath({
        type: "partenaire",
        must_change_password: false,
      })
    ).toBe("/partner/dashboard");
  });

  it("getPostLoginPath sans compte → no-account", () => {
    expect(getPostLoginPath(null)).toBe("/auth/no-account");
  });
});
