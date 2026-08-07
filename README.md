# Self-service namespaces

A small Next.js app that lets authenticated users provision their own Kubernetes namespace, without needing direct cluster access.

Users sign in via Keycloak SSO. They pick a name, and the app creates a namespace (prefixed with `self-service-ns-<username>-` by default), a `ServiceAccount` bound to the namespace via the built-in `admin` `ClusterRole` (scoped to that namespace only, not cluster-wide), and returns a ready-to-use kubeconfig authenticated as that service account for download.

## Features

- SSO login via Keycloak (Auth.js / next-auth v5)
- Self-service namespace creation, scoped per user by name prefix
- Namespace-scoped admin `ServiceAccount` provisioned automatically
- Downloadable kubeconfig, authenticated with a non-expiring service account token

## Tech stack

- Next.js 16 (App Router, Server Actions), React 19
- Auth.js / next-auth v5 with Keycloak
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
| `AUTH_KEYCLOAK_ID` | Keycloak client ID |
| `AUTH_KEYCLOAK_SECRET` | Keycloak client secret |
| `AUTH_KEYCLOAK_ISSUER` | Keycloak realm issuer URL |
| `AUTH_SECRET` | Secret used by Auth.js to sign session tokens |
| `NAMESPACE_PREFIX` | Prefix for created namespaces (default `self-service-ns`) |
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

## Deployment

Built as a standalone Next.js Docker image and deployed to Kubernetes. The app's own service account needs permission to create/read `Namespaces`, `ServiceAccounts`, `Secrets`, and `RoleBindings` (namespaced) plus read access to `ClusterRoles`, at minimum for namespaces it manages.

## Development references

- Authentication: https://authjs.dev
- Server functions: https://nextjs.org/docs/app/getting-started/error-handling#server-functions
- Kubernetes client: https://github.com/kubernetes-client/javascript
