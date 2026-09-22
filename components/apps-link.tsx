import Link from "next/link";
import { LayoutGrid } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AppsLink() {
  const appsUrl = process.env.NEXT_PUBLIC_APPS_URL;
  if (!appsUrl) return null;

  return (
    <Link href={appsUrl} target="_blank" rel="noreferrer">
      <Button variant="outline" size="icon">
        <LayoutGrid />
        <span className="sr-only">Apps</span>
      </Button>
    </Link>
  );
}
