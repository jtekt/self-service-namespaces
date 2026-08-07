import "server-only";
import { Env } from "./config";

const DNS_LABEL_MAX_LENGTH = 63;

function toDnsLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Builds the standardized namespace prefix for a user.
 *
 * Format: <NAMESPACE_PREFIX>-<preferredUsername>-
 */
export function getNamespacePrefix(preferredUsername: string): string {
  return `${Env.NAMESPACE_PREFIX}-${toDnsLabel(preferredUsername)}-`;
}

/**
 * Builds the full namespace name for a user-owned namespace.
 *
 * chosenName is expected to already be validated as a DNS-1123 label
 * (see the zod schema in lib/actions/namespaces.ts) so it is not
 * re-sanitized here.
 */
export function getNamespaceName(
  preferredUsername: string,
  chosenName: string,
): string {
  const name = `${getNamespacePrefix(preferredUsername)}${chosenName}`;

  if (name.length > DNS_LABEL_MAX_LENGTH) {
    throw new Error(
      `Namespace name too long: must be ${DNS_LABEL_MAX_LENGTH} characters or fewer once prefixed (got ${name.length})`,
    );
  }

  return name;
}
