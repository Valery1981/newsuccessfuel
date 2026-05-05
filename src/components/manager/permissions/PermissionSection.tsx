"use client";

import { PermissionToggle } from "./PermissionToggle";
import { permissionsBySection } from "@/lib/permissions";
import type { PermissionSection, PermissionsRecord } from "@/lib/permissions";

interface PermissionSectionProps {
  section: PermissionSection;
  droits: PermissionsRecord;
  onChange: (key: string, value: boolean) => void;
  disabled?: boolean;
}

export function PermissionSection({
  section,
  droits,
  onChange,
  disabled = false,
}: PermissionSectionProps) {
  const keys = permissionsBySection(section);

  if (keys.length === 0) return null;

  return (
    <div className="space-y-0">
      {keys.map((key) => (
        <PermissionToggle
          key={key}
          permKey={key}
          checked={droits[key] === true}
          onChange={(val) => onChange(key, val)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
