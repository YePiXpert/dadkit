import { cn } from "@/lib/utils";

type FeedbackProps = {
  message: string;
  ok?: boolean;
};

export function Feedback({ message, ok }: FeedbackProps) {
  if (!message) return null;

  return (
    <p
      aria-live="polite"
      className={cn(
        "rounded-xl px-3 py-2 text-sm",
        ok === false
          ? "bg-destructive/10 text-destructive"
          : "bg-secondary text-primary",
      )}
      role={ok === false ? "alert" : "status"}
    >
      {message}
    </p>
  );
}
