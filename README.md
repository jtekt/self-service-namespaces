# Self-service namespaces

A small Next.js app that lets authenticated users provision their own Kubernetes namespace, without needing direct cluster access.

Users sign in via any OIDC-compliant SSO provider. They pick a name, and the app creates a namespace (prefixed with `self-service-ns-<username>-` by default), a `ServiceAccount` bound to the namespace via the built-in `admin` `ClusterRole` (scoped to that namespace only, not cluster-wide), and returns a ready-to-use kubeconfig authenticated as that service account for download.

## Features

- SSO login via any OIDC provider (Auth.js / next-auth v5)
- Self-service namespace creation, scoped per user by name prefix
- Namespace-scoped admin `ServiceAccount` provisioned automatically
- Downloadable kubeconfig, authenticated with a non-expiring service account token
- List and delete the namespaces you own

## Tech stack

- Next.js 16 (App Router, Server Actions), React 19
- Auth.js / next-auth v5 with a generic OIDC provider
- `@kubernetes/client-node`
- shadcn/ui, Tailwind CSS v4
- react-hook-form + zod

## Getting started

```bash
npm install
npm run dev
```

The app runs at http://localhost:3000. It talks to Kubernetes via `@kubernetes/client-node`'s default config resolution — it will use `KUBECONFIG` / `~/.kube/config` locally, or the in-cluster service account when deployed. By default, the kubeconfig it generates for download reuses that same cluster's server address and CA certificate — but when deployed in-cluster, that address (e.g. `https://kubernetes.default.svc`) isn't reachable from outside the cluster. Set `K8S_API_SERVER_URL` (and `K8S_API_SERVER_CA` if the cluster's CA isn't otherwise trusted) to an externally-reachable address to fix this.

### Environment variables

| Variable | Description |
| --- | --- |
| `AUTH_OIDC_ID` | OIDC client ID |
| `AUTH_OIDC_SECRET` | OIDC client secret |
| `AUTH_OIDC_ISSUER` | OIDC issuer URL (must serve `/.well-known/openid-configuration`) |
| `AUTH_OIDC_NAME` | Display name for the sign-in button (default `SSO`) |
| `AUTH_SECRET` | Secret used by Auth.js to sign session tokens |
| `NAMESPACE_PREFIX` | Prefix for created namespaces (default `self-service-ns`) |
| `ENFORCE_NAMESPACE_PREFIX` | Whether `NAMESPACE_PREFIX` is prepended to created namespace names (default `true`) |
| `ENFORCE_USERNAME_PREFIX` | Whether the caller's username is prepended to created namespace names (default `true`) |
| `CLUSTER_NAME` | Name used for the cluster/context entries in generated kubeconfigs (default `self-service-cluster`) |
| `KUBECONFIG` | Optional path to a kubeconfig file, for local development |
| `K8S_API_SERVER_URL` | Overrides the server address embedded in generated kubeconfigs. Required in-cluster; leave unset locally |
| `K8S_API_SERVER_CA` | Base64-encoded PEM CA cert to embed in generated kubeconfigs. Optional even when `K8S_API_SERVER_URL` is set — the CA is inferred from the loaded kubeconfig / in-cluster CA file by default, which is normally correct since the API server's cert is usually signed by that same CA regardless of address. Only set this if the external endpoint terminates TLS with a different certificate |

## Building & running

```bash
npm run build
npm run start
```

## Linting

```bash
npm run lint
npm run typecheck
```

## Ownership

Every namespace this app creates is annotated with `self-service-namespaces/owner`, holding a comma-separated list of usernames (the OIDC provider's `preferred_username`). Anyone listed has equal, full access to that namespace through the app — viewing it, downloading its kubeconfig, and deleting it.

The app only ever writes a single username to this annotation on creation. To add a co-owner, edit the annotation directly:

```bash
kubectl annotate namespace <name> \
  self-service-namespaces/owner=alice,bob --overwrite
```

There's no in-app UI for managing co-owners yet.

## Deployment

Built as a standalone Next.js Docker image (`Dockerfile`, `output: "standalone"` in `next.config.ts`) and deployed to Kubernetes. See RBAC below for the permissions its own service account needs.

## RBAC

The app manages resources across arbitrary namespaces it creates, not one fixed namespace, so it needs a `ClusterRole` rather than a namespace-scoped `Role`. The rules below are the minimum required, derived directly from the Kubernetes API calls in `lib/k8s.ts`:

- `namespaces`: `create`, `get`, `list`, `delete`
- `serviceaccounts`: `create` (one per namespace it provisions)
- `secrets`: `create`, `get` (the service account's token secret)
- `rolebindings`: `create` (binds the provisioned service account to the namespace)
- `clusterroles`, resource name `admin`: `bind` — required because Kubernetes' RBAC escalation check normally forbids granting permissions (via a RoleBinding) that the granter doesn't itself hold; the `bind` verb on this specific `ClusterRole` is what allows this app's service account to hand out `admin` rights in namespaces it creates without holding cluster-wide admin itself.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: self-service-namespaces
  namespace: <namespace this app is deployed into>

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: self-service-namespaces
rules:
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["create", "get", "list", "delete"]

  - apiGroups: [""]
    resources: ["serviceaccounts"]
    verbs: ["create"]

  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["create", "get"]

  - apiGroups: ["rbac.authorization.k8s.io"]
    resources: ["rolebindings"]
    verbs: ["create"]

  - apiGroups: ["rbac.authorization.k8s.io"]
    resources: ["clusterroles"]
    resourceNames: ["admin"]
    verbs: ["bind"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: self-service-namespaces
subjects:
  - kind: ServiceAccount
    name: self-service-namespaces
    namespace: <namespace this app is deployed into>
roleRef:
  kind: ClusterRole
  name: self-service-namespaces
  apiGroup: rbac.authorization.k8s.io
```

Set `serviceAccountName: self-service-namespaces` on the app's own pod spec so `@kubernetes/client-node`'s in-cluster config resolution picks it up.

## Development references

- Authentication: https://authjs.dev
- Server functions: https://nextjs.org/docs/app/getting-started/error-handling#server-functions
- Kubernetes client: https://github.com/kubernetes-client/javascript
