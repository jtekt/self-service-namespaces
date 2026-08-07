import "server-only";
import { z } from "zod";

const boolSchema = z
  .preprocess((val) => {
    if (typeof val === "string") {
      const lower = val.toLowerCase();
      if (lower === "true") return true;
      if (lower === "false") return false;
    }
    return val;
  }, z.boolean())
  .default(true);

export const EnvSchema = z.object({
  // Prefix for namespaces created by this app. Final name becomes
  // <prefix>-<preferredUsername>-<userChosenName>, each segment optional
  // below (ownership is enforced via annotation, not the name itself).
  NAMESPACE_PREFIX: z
    .string()
    .trim()
    .default("self-service-ns")
    .transform((value) => (value.endsWith("-") ? value.slice(0, -1) : value)),

  // Whether NAMESPACE_PREFIX is prepended to created namespace names
  ENFORCE_NAMESPACE_PREFIX: boolSchema,

  // Whether the caller's username is prepended to created namespace names
  ENFORCE_USERNAME_PREFIX: boolSchema,

  // Name embedded in the generated kubeconfig's cluster/context entries
  CLUSTER_NAME: z.string().trim().min(1).default("self-service-cluster"),
});

// Parse + apply defaults
export const Env = EnvSchema.parse(process.env);
