import { format, isPast, isToday } from "date-fns";
import { Calendar, MoreHorizontal, Trash2, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/kanban";
import { PRIORITY_STYLES } from "@/types/kanban";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function TaskCard({ task, onEdit, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const due = task.due_date ? new Date(task.due_date) : null;
  const overdue = due && !isToday(due) && isPast(due) && task.column_key !== "done";

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "group bg-card rounded-2xl p-4 border border-border/60 cursor-grab active:cursor-grabbing",
        "shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow"
      )}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // ignore click that initiated a drag
        if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-[15px] font-semibold leading-snug text-foreground line-clamp-2 flex-1">
          {task.title}
        </h4>
        <div data-no-drag onPointerDown={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition">
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Pencil className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(task)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
          {task.description}
        </p>
      )}

      <div className="flex items-center flex-wrap gap-1.5 mb-3">
        <span
          className={cn(
            "text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border",
            PRIORITY_STYLES[task.priority]
          )}
        >
          {task.priority}
        </span>
        {task.assignee && (
          <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {task.assignee}
          </span>
        )}
      </div>

      {due && (
        <div
          className={cn(
            "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md",
            overdue
              ? "bg-rose-100 text-rose-700"
              : "bg-secondary text-secondary-foreground"
          )}
        >
          <Calendar className="w-3 h-3" />
          {format(due, "MMM d")}
        </div>
      )}
    </motion.div>
  );
}
