import Link from "next/link";
import { HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export function HelpLink() {
  const helpUrl = process.env.NEXT_PUBLIC_HELP_URL;
  if (!helpUrl) return null;

  return (
    <Link href={helpUrl} target="_blank" rel="noreferrer">
      <Button variant="outline" size="icon">
        <HelpCircle />
        <span className="sr-only">Help</span>
      </Button>
    </Link>
  );
}
