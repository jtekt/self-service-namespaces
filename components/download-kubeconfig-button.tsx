"use client";

import { startTransition, useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getKubeconfig } from "@/lib/actions/namespaces";
import { downloadKubeconfig } from "@/lib/blob-download";

export function DownloadKubeconfigButton({ namespace }: { namespace: string }) {
  const [state, action, pending] = useActionState(getKubeconfig, null);

  useEffect(() => {
    if (state?.data) downloadKubeconfig(namespace, state.data.kubeconfig);
    if (state?.error) toast.error(state.error);
  }, [state, namespace]);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => action(namespace))}
    >
      {pending ? <Spinner /> : "Download kubeconfig"}
    </Button>
  );
}
