import "server-only";
import fs from "node:fs";
import * as k8s from "@kubernetes/client-node";
import { Env } from "./config";

export const OWNER_ANNOTATION = "self-service-namespaces/owner";
const SERVICE_ACCOUNT_NAME = "admin";
const TOKEN_SECRET_SUFFIX = "-admin-token";
const ADMIN_CLUSTER_ROLE = "admin"; // built-in Kubernetes ClusterRole

const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const coreApi = kc.makeApiClient(k8s.CoreV1Api);
const rbacApi = kc.makeApiClient(k8s.RbacAuthorizationV1Api);

function isApiException(error: unknown, code: number): boolean {
  return typeof error === "object" && error !== null && "code" in error
    ? (error as { code: unknown }).code === code
    : false;
}

/** The owner annotation holds a comma-separated list of usernames. */
function getOwners(ns: k8s.V1Namespace): string[] {
  const value = ns.metadata?.annotations?.[OWNER_ANNOTATION];
  if (!value) return [];
  return value
    .split(",")
    .map((owner) => owner.trim())
    .filter(Boolean);
}

export function isOwner(ns: k8s.V1Namespace, owner: string): boolean {
  return getOwners(ns).includes(owner);
}

export async function getNamespace(
  name: string,
): Promise<k8s.V1Namespace | undefined> {
  try {
    return await coreApi.readNamespace({ name });
  } catch (error) {
    if (isApiException(error, 404)) return undefined;
    throw error;
  }
}

async function createNamespace(
  name: string,
  owner: string,
): Promise<k8s.V1Namespace> {
  const namespace: k8s.V1Namespace = {
    apiVersion: "v1",
    kind: "Namespace",
    metadata: {
      name,
      annotations: {
        [OWNER_ANNOTATION]: owner,
      },
    },
  };

  return coreApi.createNamespace({ body: namespace });
}

async function ensureServiceAccount(namespace: string): Promise<void> {
  const serviceAccount: k8s.V1ServiceAccount = {
    apiVersion: "v1",
    kind: "ServiceAccount",
    metadata: {
      name: SERVICE_ACCOUNT_NAME,
      namespace,
    },
  };

  try {
    await coreApi.createNamespacedServiceAccount({ namespace, body: serviceAccount });
  } catch (error) {
    if (!isApiException(error, 409)) throw error;
  }
}

async function ensureRoleBinding(namespace: string): Promise<void> {
  const roleBindingName = `${SERVICE_ACCOUNT_NAME}-binding`;

  const roleBinding: k8s.V1RoleBinding = {
    apiVersion: "rbac.authorization.k8s.io/v1",
    kind: "RoleBinding",
    metadata: {
      name: roleBindingName,
      namespace,
    },
    subjects: [
      {
        kind: "ServiceAccount",
        name: SERVICE_ACCOUNT_NAME,
        namespace,
      },
    ],
    roleRef: {
      apiGroup: "rbac.authorization.k8s.io",
      kind: "ClusterRole",
      name: ADMIN_CLUSTER_ROLE,
    },
  };

  try {
    await rbacApi.createNamespacedRoleBinding({ namespace, body: roleBinding });
  } catch (error) {
    if (!isApiException(error, 409)) throw error;
  }
}

/** Creates (or reuses) a non-expiring legacy service-account-token Secret. */
async function ensureTokenSecret(namespace: string): Promise<string> {
  const secretName = `${SERVICE_ACCOUNT_NAME}${TOKEN_SECRET_SUFFIX}`;

  const secret: k8s.V1Secret = {
    apiVersion: "v1",
    kind: "Secret",
    type: "kubernetes.io/service-account-token",
    metadata: {
      name: secretName,
      namespace,
      annotations: {
        "kubernetes.io/service-account.name": SERVICE_ACCOUNT_NAME,
      },
    },
  };

  try {
    await coreApi.createNamespacedSecret({ namespace, body: secret });
  } catch (error) {
    if (!isApiException(error, 409)) throw error;
  }

  return secretName;
}

/** Polls the token Secret until the token controller has populated it. */
async function waitForToken(namespace: string, secretName: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const secret = await coreApi.readNamespacedSecret({ name: secretName, namespace });
    const token = secret.data?.token;
    if (token) return Buffer.from(token, "base64").toString("utf-8");
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for service account token in ${namespace}`);
}

function getClusterConnectionInfo(): { server: string; caData?: string } {
  const cluster = kc.getCurrentCluster();

  // The API server's certificate is normally signed by the same CA
  // regardless of which address it's reached through, so infer it from the
  // loaded kubeconfig (or in-cluster CA file) even when the server address
  // itself is overridden. Only fall back further when there's no loaded
  // cluster at all to infer from (e.g. K8S_API_SERVER_URL set without any
  // local kubeconfig or in-cluster config present).
  const caData = Env.K8S_API_SERVER_CA ?? cluster?.caData ?? (cluster?.caFile
    ? fs.readFileSync(cluster.caFile).toString("base64")
    : undefined);

  if (Env.K8S_API_SERVER_URL) {
    return { server: Env.K8S_API_SERVER_URL, caData };
  }

  if (!cluster) throw new Error("No current cluster in the loaded kubeconfig");
  return { server: cluster.server, caData };
}

function buildKubeconfig(namespace: string, token: string): string {
  const { server, caData } = getClusterConnectionInfo();
  const clusterName = Env.CLUSTER_NAME;
  const contextName = `${clusterName}-${namespace}`;

  const kubeconfig = new k8s.KubeConfig();
  kubeconfig.loadFromClusterAndUser(
    { name: clusterName, server, caData, skipTLSVerify: false },
    { name: SERVICE_ACCOUNT_NAME, token },
  );
  kubeconfig.contexts = [
    { name: contextName, cluster: clusterName, user: SERVICE_ACCOUNT_NAME, namespace },
  ];
  kubeconfig.setCurrentContext(contextName);

  return kubeconfig.exportConfig();
}

export interface ProvisionedNamespace {
  namespace: string;
  kubeconfig: string;
}

export async function listNamespacesForOwner(
  owner: string,
): Promise<k8s.V1Namespace[]> {
  const { items } = await coreApi.listNamespace();
  return items
    .filter((ns) => isOwner(ns, owner))
    .sort((a, b) => {
      const aTime = a.metadata?.creationTimestamp?.getTime() ?? 0;
      const bTime = b.metadata?.creationTimestamp?.getTime() ?? 0;
      return bTime - aTime;
    });
}

/** Rebuilds a kubeconfig for a namespace the caller already owns. */
export async function getKubeconfigForNamespace(
  namespace: string,
  owner: string,
): Promise<string> {
  const existing = await getNamespace(namespace);
  if (!existing || !isOwner(existing, owner)) {
    throw new Error("Namespace not found");
  }

  // The namespace may have been created outside this app (or before this
  // app provisioned the ServiceAccount/RoleBinding/Secret), so ensure the
  // RBAC scaffolding exists rather than assuming it does.
  await ensureServiceAccount(namespace);
  await ensureRoleBinding(namespace);
  const secretName = await ensureTokenSecret(namespace);
  const token = await waitForToken(namespace, secretName);
  return buildKubeconfig(namespace, token);
}

/** Deletes a namespace the caller already owns. */
export async function deleteNamespaceForOwner(
  namespace: string,
  owner: string,
): Promise<void> {
  const existing = await getNamespace(namespace);
  if (!existing || !isOwner(existing, owner)) {
    throw new Error("Namespace not found");
  }

  await coreApi.deleteNamespace({ name: namespace });
}

/**
 * Creates (or reuses, if already owned by the same user) a namespace along
 * with a ServiceAccount that has namespace-scoped admin rights, and returns
 * a ready-to-use kubeconfig authenticated as that ServiceAccount.
 */
export async function provisionNamespace(
  name: string,
  owner: string,
): Promise<ProvisionedNamespace> {
  const existing = await getNamespace(name);
  if (existing) {
    if (!isOwner(existing, owner)) {
      throw new Error("Namespace name already taken");
    }
  } else {
    await createNamespace(name, owner);
  }

  await ensureServiceAccount(name);
  await ensureRoleBinding(name);
  const secretName = await ensureTokenSecret(name);
  const token = await waitForToken(name, secretName);

  return { namespace: name, kubeconfig: buildKubeconfig(name, token) };
}
