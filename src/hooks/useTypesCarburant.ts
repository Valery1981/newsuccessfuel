"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  typesCarburantService,
  type CreateTypeCarburantInput,
  type UpdateTypeCarburantInput,
} from "@/services/typesCarburantService";

const KEY = ["types_carburant"] as const;
const KEY_ACTIVE = ["types_carburant", "active"] as const;

/** Liste complète (utilisée par la page admin). */
export function useTypesCarburant() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => typesCarburantService.list(),
    staleTime: 60_000,
  });
}

/** Liste filtrée actif=true (utilisée par les selects métier). */
export function useTypesCarburantActifs() {
  return useQuery({
    queryKey: KEY_ACTIVE,
    queryFn: () => typesCarburantService.listActive(),
    staleTime: 60_000,
  });
}

export function useCreateTypeCarburant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTypeCarburantInput) =>
      typesCarburantService.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: KEY_ACTIVE });
    },
  });
}

export function useUpdateTypeCarburant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; input: UpdateTypeCarburantInput }) =>
      typesCarburantService.update(params.id, params.input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: KEY_ACTIVE });
    },
  });
}

export function useToggleTypeCarburantActif() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; actif: boolean }) =>
      typesCarburantService.setActif(params.id, params.actif),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: KEY_ACTIVE });
    },
  });
}

export function useDeleteTypeCarburant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => typesCarburantService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: KEY_ACTIVE });
    },
  });
}
