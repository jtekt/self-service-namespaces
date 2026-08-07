import "server-only";
import { z } from "zod";

export const EnvSchema = z.object({
  // Prefix for namespaces created by this app. Final name becomes
  // <prefix>-<preferredUsername>-<userChosenName>
  NAMESPACE_PREFIX: z
    .string()
    .trim()
    .default("self-service-ns")
    .transform((value) => (value.endsWith("-") ? value.slice(0, -1) : value)),

  // Name embedded in the generated kubeconfig's cluster/context entries
  CLUSTER_NAME: z.string().trim().min(1).default("self-service-cluster"),
});

// Parse + apply defaults
export const Env = EnvSchema.parse(process.env);
