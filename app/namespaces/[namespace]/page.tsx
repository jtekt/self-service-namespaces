import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { DeleteNamespaceButton } from "@/components/delete-namespace-button";
import { DownloadKubeconfigButton } from "@/components/download-kubeconfig-button";
import { buttonVariants } from "@/components/ui/button";
import { getNamespace, isOwner } from "@/lib/k8s";

export const dynamic = "force-dynamic";

export default async function NamespacePage({
  params,
}: {
  params: Promise<{ namespace: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/api/auth/signin");

  const { namespace } = await params;
  const ns = await getNamespace(namespace);

  if (!ns || !isOwner(ns, session.user.preferredUsername)) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 py-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="truncate text-2xl font-bold">{namespace}</h1>
        <DeleteNamespaceButton namespace={namespace} />
      </div>

      <div className="flex items-center justify-between gap-4">
        {ns.metadata?.creationTimestamp && (
          <p className="text-sm text-muted-foreground">
            Created {new Date(ns.metadata.creationTimestamp).toLocaleString()}
          </p>
        )}
        <DownloadKubeconfigButton namespace={namespace} />
      </div>

      <div className="text-center">
        <Link href="/namespaces" className={buttonVariants({ variant: "ghost" })}>
          Back to your namespaces
        </Link>
      </div>
    </div>
  );
}
