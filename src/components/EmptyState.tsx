import { SearchX } from "lucide-react";

type EmptyStateProps = {
  title: string;
  message: string;
  action?: React.ReactNode;
};

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <SearchX size={34} aria-hidden="true" />
      <h2>{title}</h2>
      <p>{message}</p>
      {action}
    </div>
  );
}
