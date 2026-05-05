import { z } from "zod";

/** Schéma du formulaire « premier mot de passe » (partenaire invité). */
export const firstLoginPasswordSchema = z
  .object({
    password: z.string().min(8, "Au moins 8 caractères"),
    confirm: z.string().min(1, "Confirmation requise"),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });

export type FirstLoginPasswordFormValues = z.infer<
  typeof firstLoginPasswordSchema
>;
