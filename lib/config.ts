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

  // Overrides for the server/CA embedded in generated kubeconfigs. Needed
  // when this app runs in-cluster, since the in-cluster API server address
  // (e.g. https://kubernetes.default.svc) isn't reachable from outside the
  // cluster. Falls back to the app's own loaded kubeconfig when unset,
  // which is normally correct for local development.
  K8S_API_SERVER_URL: z.url().optional(),
  K8S_API_SERVER_CA: z.string().trim().optional(), // base64-encoded PEM
});

// Parse + apply defaults
export const Env = EnvSchema.parse(process.env);
