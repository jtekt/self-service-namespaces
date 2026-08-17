import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BackToNamespacesLink } from "@/components/back-to-namespaces-link";
import { CreateNamespaceForm } from "@/components/create-namespace-form";
import { getNamespacePrefix } from "@/lib/namespace";

export const dynamic = "force-dynamic";

export default async function NewNamespacePage() {
  const session = await auth();

  if (!session) redirect("/api/auth/signin");

  return (
    <div className="mx-auto max-w-lg space-y-6 py-6">
      <BackToNamespacesLink />

      <h1 className="text-2xl font-bold">Create a namespace</h1>

      <CreateNamespaceForm
        namespacePrefix={getNamespacePrefix(session.user.preferredUsername)}
      />
    </div>
  );
}
