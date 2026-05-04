export type ColumnKey = "todo" | "in_progress" | "review" | "done";
export type Priority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  description: string;
  column_key: ColumnKey;
  position: number;
  priority: Priority;
  due_date: string | null;
  assignee: string;
  created_at: string;
  updated_at: string;
}

export const COLUMNS: { key: ColumnKey; label: string; accent: string; badge: string }[] = [
  { key: "todo",        label: "To Do",       accent: "hsl(var(--col-todo))",    badge: "bg-emerald-100 text-emerald-700" },
  { key: "in_progress", label: "In Progress", accent: "hsl(var(--col-progress))", badge: "bg-amber-100 text-amber-700" },
  { key: "review",      label: "Review",      accent: "hsl(var(--col-review))",   badge: "bg-orange-100 text-orange-700" },
  { key: "done",        label: "Done",        accent: "hsl(var(--col-done))",     badge: "bg-blue-100 text-blue-700" },
];

export const PRIORITY_STYLES: Record<Priority, string> = {
  low:    "bg-emerald-100 text-emerald-700 border-emerald-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  high:   "bg-rose-100 text-rose-700 border-rose-200",
};
