"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { provisionNamespace, type ProvisionedNamespace } from "@/lib/k8s";
import { getNamespaceName } from "@/lib/namespace";

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(40, "Name must be 40 characters or fewer")
  .regex(
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
    "Use lowercase letters, numbers, and hyphens only",
  );

export interface CreateNamespaceState {
  error: string | null;
  data: ProvisionedNamespace | null;
}

export async function createNamespace(
  _: CreateNamespaceState | null,
  chosenName: string,
): Promise<CreateNamespaceState> {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized", data: null };

  const parsed = nameSchema.safeParse(chosenName);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, data: null };
  }

  try {
    const name = getNamespaceName(session.user.preferredUsername, parsed.data);
    const data = await provisionNamespace(name, session.user.preferredUsername);
    return { error: null, data };
  } catch (error: unknown) {
    console.error("Error provisioning namespace:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return { error: message, data: null };
  }
}
