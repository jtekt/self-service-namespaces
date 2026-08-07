import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { listNamespacesForOwner } from "@/lib/k8s"

export const dynamic = "force-dynamic"

export default async function NamespacesPage() {
  const session = await auth()
  if (!session) redirect("/api/auth/signin")

  const namespaces = await listNamespacesForOwner(
    session.user.preferredUsername
  )

  return (
    <div className="mx-auto max-w-lg space-y-6 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your namespaces</h1>
        <Link
          href="/namespaces/new"
          className={buttonVariants({ variant: "default" })}
        >
          New namespace
        </Link>
      </div>

      {namespaces.length === 0 ? (
        <p className="text-muted-foreground">
          You haven&apos;t created any namespaces yet.
        </p>
      ) : (
        <div className="space-y-3">
          {namespaces.map((ns) => (
            <Link
              key={ns.metadata!.name}
              href={`/namespaces/${ns.metadata!.name}`}
              className="block"
            >
              <Card className="transition-colors hover:bg-accent/50">
                <CardContent className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{ns.metadata!.name}</p>
                    {ns.metadata?.creationTimestamp && (
                      <p className="text-sm text-muted-foreground">
                        Created{" "}
                        {new Date(
                          ns.metadata.creationTimestamp
                        ).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <ChevronRightIcon className="size-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
