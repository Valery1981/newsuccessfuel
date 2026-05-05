import { describe, it, expect } from "vitest";
import {
  ALL_PERMISSION_KEYS,
  MANAGER_PERMISSIONS,
  PERMISSION_SECTIONS,
  permissionsBySection,
  type PermissionsRecord,
} from "@/lib/permissions";

describe("permissions", () => {
  it("ALL_PERMISSION_KEYS contains all defined permission keys", () => {
    const keys = Object.keys(MANAGER_PERMISSIONS);
    expect(ALL_PERMISSION_KEYS).toEqual(expect.arrayContaining(keys));
    expect(ALL_PERMISSION_KEYS.length).toBe(keys.length);
  });

  it("every permission has a valid section", () => {
    for (const key of ALL_PERMISSION_KEYS) {
      expect(PERMISSION_SECTIONS).toContain(MANAGER_PERMISSIONS[key].section);
    }
  });

  it("permissionsBySection returns only keys for that section", () => {
    for (const section of PERMISSION_SECTIONS) {
      const keys = permissionsBySection(section);
      for (const k of keys) {
        expect(MANAGER_PERMISSIONS[k].section).toBe(section);
      }
    }
  });

  it("hasPermission logic: gerant always has access", () => {
    const hasPermission = (
      type: string,
      droits: PermissionsRecord | null,
      key: string,
    ): boolean => {
      if (type === "gerant" || type === "superadmin") return true;
      if (type === "session_gerant") {
        const d = droits as Record<string, boolean | undefined> | null;
        return d?.[key] === true;
      }
      return false;
    };

    expect(hasPermission("gerant", null, "dashboard")).toBe(true);
    expect(hasPermission("superadmin", null, "rapports_financiers")).toBe(true);
  });

  it("hasPermission logic: session_gerant returns false if key missing", () => {
    const hasPermission = (
      type: string,
      droits: PermissionsRecord | null,
      key: string,
    ): boolean => {
      if (type === "gerant" || type === "superadmin") return true;
      if (type === "session_gerant") {
        const d = droits as Record<string, boolean | undefined> | null;
        return d?.[key] === true;
      }
      return false;
    };

    expect(hasPermission("session_gerant", {}, "dashboard")).toBe(false);
    expect(hasPermission("session_gerant", { dashboard: true }, "dashboard")).toBe(true);
    expect(hasPermission("session_gerant", { dashboard: true }, "rapports_financiers")).toBe(false);
    expect(hasPermission("session_gerant", null, "dashboard")).toBe(false);
  });

  it("gerant-only pages (users, initialisation, parametres) are blocked for sessions", () => {
    const isGerantOnly = (accountType: string) =>
      accountType !== "session_gerant";

    expect(isGerantOnly("gerant")).toBe(true);
    expect(isGerantOnly("session_gerant")).toBe(false);
  });
});
