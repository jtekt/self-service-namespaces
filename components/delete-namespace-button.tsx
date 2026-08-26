"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { deleteNamespace } from "@/lib/actions/namespaces";

export function DeleteNamespaceButton({ namespace }: { namespace: string }) {
  const [state, action, pending] = useActionState(deleteNamespace, null);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function onConfirm() {
    startTransition(() => action(namespace));
  }

  useEffect(() => {
    if (state?.data) {
      toast.success(`Namespace "${namespace}" was deleted.`);
      router.push("/namespaces");
      router.refresh();
    }
  }, [state, router, namespace]);

  return (
    <Dialog open={open && !state?.data} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" size="sm" />}>
        <Trash2Icon data-icon="inline-start" />
        Delete
      </DialogTrigger>

      <DialogContent className="space-y-2">
        <DialogHeader>
          <DialogTitle>Delete namespace</DialogTitle>
          <DialogDescription>
            You are about to permanently delete the following namespace
          </DialogDescription>
        </DialogHeader>

        <div className="rounded bg-accent p-2 font-mono">{namespace}</div>

        <p className="text-destructive">
          Everything inside this namespace will be deleted. This action cannot
          be undone.
        </p>

        {state?.error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {state.error}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>

          <Button variant="destructive" onClick={onConfirm} disabled={pending}>
            {pending ? (
              <span className="flex items-center gap-2">
                <Spinner data-icon="inline-start" />
                Deleting…
              </span>
            ) : (
              "Delete namespace"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
