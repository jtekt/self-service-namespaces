"use client";

import { startTransition, useActionState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { createNamespace } from "@/lib/actions/namespaces";

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(40, "Please keep it under 40 characters.")
    .regex(
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
      "Use lowercase letters, numbers, and hyphens only",
    ),
});

function downloadKubeconfig(namespace: string, kubeconfig: string) {
  const blob = new Blob([kubeconfig], { type: "text/yaml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${namespace}.kubeconfig.yaml`;
  link.click();
  URL.revokeObjectURL(url);
}

export function CreateNamespaceForm({
  namespacePrefix,
}: {
  namespacePrefix: string;
}) {
  const [state, action, pending] = useActionState(createNamespace, null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "" },
  });

  function onSubmit({ name }: z.infer<typeof formSchema>) {
    startTransition(() => action(name));
  }

  useEffect(() => {
    if (state?.data) {
      toast.success(`Namespace "${state.data.namespace}" is ready.`);
    }
  }, [state]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Create a namespace</CardTitle>
        </CardHeader>

        <CardContent>
          <form id="create-namespace" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="name">Namespace name</FieldLabel>

                    <InputGroup>
                      <InputGroupAddon>
                        <InputGroupText>{namespacePrefix}</InputGroupText>
                      </InputGroupAddon>

                      <InputGroupInput
                        id="name"
                        {...field}
                        placeholder="my-project"
                        disabled={pending}
                        autoFocus
                      />
                    </InputGroup>

                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
          </form>
        </CardContent>

        <div className="p-4 pt-0">
          <Button
            type="submit"
            form="create-namespace"
            disabled={pending}
            className="w-full"
          >
            {pending ? (
              <span className="flex items-center gap-2">
                <Spinner data-icon="inline-start" />
                Creating namespace…
              </span>
            ) : (
              "Create namespace"
            )}
          </Button>
        </div>
      </Card>

      {!pending && state?.error && (
        <Alert variant="destructive">
          <AlertTitle>Unable to create namespace</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {!pending && state?.data && (
        <Alert>
          <AlertTitle>Namespace ready</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              Namespace <strong>{state.data.namespace}</strong> was created,
              with an admin service account scoped to it. Download the
              kubeconfig below to access it with kubectl.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                downloadKubeconfig(state.data!.namespace, state.data!.kubeconfig)
              }
            >
              Download kubeconfig
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
