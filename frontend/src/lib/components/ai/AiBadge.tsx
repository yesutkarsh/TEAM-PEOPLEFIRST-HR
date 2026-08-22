/** Small plain gray badge marking AI-generated content or surfaces. */
import { Badge } from "@/lib/components/ui";

export function AiBadge({ className }: { className?: string }) {
  return (
    <Badge variant="default" className={className}>
      AI
    </Badge>
  );
}
