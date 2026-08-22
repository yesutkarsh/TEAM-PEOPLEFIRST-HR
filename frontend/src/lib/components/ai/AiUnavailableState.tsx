/** Neutral fallback shown when the AI service is unavailable. */
import { Link } from "@tanstack/react-router";
import { Alert } from "@/lib/components/ui";

export function AiUnavailableState() {
  return (
    <Alert variant="warning" title="AI assistant is temporarily unavailable">
      <p>Please try again shortly. In the meantime you can:</p>
      <div className="mt-2 flex flex-col gap-1">
        <Link to="/announcements" className="underline underline-offset-2">
          Check announcements
        </Link>
        <Link to="/helpdesk/new" className="underline underline-offset-2">
          Raise a helpdesk ticket
        </Link>
      </div>
    </Alert>
  );
}
