import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CreateNamespaceForm } from "@/components/create-namespace-form";
import { buttonVariants } from "@/components/ui/button";
import { getNamespacePrefix } from "@/lib/namespace";

export const dynamic = "force-dynamic";

export default async function NewNamespacePage() {
  const session = await auth();

  if (!session) redirect("/api/auth/signin");

  return (
    <div className="mx-auto max-w-lg space-y-6 py-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Create a Kubernetes namespace</h1>
        <p className="mt-3 text-muted-foreground">
          Get your own namespace with an admin kubeconfig, ready to use.
        </p>
      </div>
      <CreateNamespaceForm
        namespacePrefix={getNamespacePrefix(session.user.preferredUsername)}
      />
      <div className="text-center">
        <Link href="/namespaces" className={buttonVariants({ variant: "ghost" })}>
          View your namespaces
        </Link>
      </div>
    </div>
  );
}
