import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";

export function BackToNamespacesLink() {
  return (
    <Link
      href="/namespaces"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ChevronLeftIcon className="size-4" />
      Back to namespaces
    </Link>
  );
}
