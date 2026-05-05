"use client";

import { Switch } from "@/components/ui/switch";
import { MANAGER_PERMISSIONS } from "@/lib/permissions";
import type { PermissionKey } from "@/lib/permissions";

interface PermissionToggleProps {
  permKey: PermissionKey;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function PermissionToggle({
  permKey,
  checked,
  onChange,
  disabled = false,
}: PermissionToggleProps) {
  const perm = MANAGER_PERMISSIONS[permKey];
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-medium leading-none">{perm.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{perm.description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={(val) => onChange(val)}
        disabled={disabled}
        size="sm"
      />
    </div>
  );
}
