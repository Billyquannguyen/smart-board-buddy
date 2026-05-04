import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/kanban";
import { COLUMNS, type ColumnKey } from "@/types/kanban";
import { TaskCard } from "./TaskCard";

interface Props {
  columnKey: ColumnKey;
  tasks: Task[];
  onAdd: (col: ColumnKey) => void;
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
}

export function Column({ columnKey, tasks, onAdd, onEdit, onDelete }: Props) {
  const meta = COLUMNS.find((c) => c.key === columnKey)!;
  const { setNodeRef, isOver } = useDroppable({ id: `col-${columnKey}` });

  return (
    <div className="flex flex-col w-[300px] shrink-0">
      <div className="flex items-center justify-between px-2 mb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: meta.accent }}
          />
          <h3 className="font-semibold text-sm tracking-wide text-foreground">
            {meta.label}
          </h3>
          <span className={cn("text-xs font-semibold rounded-full px-2 py-0.5", meta.badge)}>
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAdd(columnKey)}
          className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"
          aria-label="Add task"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 rounded-2xl p-2 space-y-2 transition-colors min-h-[120px]",
          isOver ? "bg-primary/5 ring-2 ring-primary/30" : "bg-muted/40"
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence>
            {tasks.map((t) => (
              <TaskCard key={t.id} task={t} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </AnimatePresence>
        </SortableContext>

        <button
          onClick={() => onAdd(columnKey)}
          className="w-full text-xs text-muted-foreground hover:text-foreground py-2 rounded-lg border border-dashed border-border hover:bg-card transition flex items-center justify-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Add task
        </button>
      </div>
    </div>
  );
}
