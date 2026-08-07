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

The app runs at http://localhost:3000. It talks to Kubernetes via `@kubernetes/client-node`'s default config resolution — it will use `KUBECONFIG` / `~/.kube/config` locally, or the in-cluster service account when deployed. The kubeconfig it generates for download reuses that same cluster's server address and CA certificate, so it must be reachable from wherever the downloaded kubeconfig will be used.

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
