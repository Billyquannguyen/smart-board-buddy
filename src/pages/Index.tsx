import { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { Plus, Search, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useTasks } from "@/hooks/useTasks";
import { COLUMNS, type ColumnKey, type Task } from "@/types/kanban";
import { Column } from "@/components/kanban/Column";
import { TaskCard } from "@/components/kanban/TaskCard";
import { TaskDialog } from "@/components/kanban/TaskDialog";
import { AIChat } from "@/components/kanban/AIChat";

export default function Index() {
  const { tasks, loading, createTask, updateTask, deleteTask, moveTask } = useTasks();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [defaultCol, setDefaultCol] = useState<ColumnKey>("todo");
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.assignee.toLowerCase().includes(q)
    );
  }, [tasks, search]);

  const byColumn = useMemo(() => {
    const map: Record<ColumnKey, Task[]> = { todo: [], in_progress: [], review: [], done: [] };
    for (const t of filtered) map[t.column_key as ColumnKey]?.push(t);
    for (const k of Object.keys(map) as ColumnKey[]) map[k].sort((a, b) => a.position - b.position);
    return map;
  }, [filtered]);

  const handleAdd = (col: ColumnKey) => {
    setEditing(null);
    setDefaultCol(col);
    setDialogOpen(true);
  };
  const handleEdit = (t: Task) => {
    setEditing(t);
    setDialogOpen(true);
  };
  const handleDelete = async (t: Task) => {
    try {
      await deleteTask(t.id);
      toast.success("Task deleted");
    } catch {
      toast.error("Could not delete task");
    }
  };

  const handleSubmit = async (data: Parameters<typeof createTask>[0] & { column_key: ColumnKey }) => {
    try {
      if (editing) {
        await updateTask(editing.id, data);
        toast.success("Task updated");
      } else {
        await createTask(data);
        toast.success("Task created");
      }
    } catch {
      toast.error("Save failed");
    }
  };

  const onDragStart = (e: DragStartEvent) => {
    const t = tasks.find((x) => x.id === e.active.id);
    if (t) setActiveTask(t);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;
    const activeTaskRow = tasks.find((t) => t.id === active.id);
    if (!activeTaskRow) return;

    let targetCol: ColumnKey;
    let overTask: Task | undefined;
    const overId = String(over.id);
    if (overId.startsWith("col-")) {
      targetCol = overId.slice(4) as ColumnKey;
    } else {
      overTask = tasks.find((t) => t.id === over.id);
      if (!overTask) return;
      targetCol = overTask.column_key as ColumnKey;
    }

    const colTasks = tasks
      .filter((t) => t.column_key === targetCol && t.id !== active.id)
      .sort((a, b) => a.position - b.position);

    let newPos: number;
    if (!overTask) {
      const last = colTasks[colTasks.length - 1];
      newPos = (last?.position ?? 0) + 1;
    } else {
      const idx = colTasks.findIndex((t) => t.id === overTask!.id);
      const before = colTasks[idx - 1];
      const after = colTasks[idx];
      if (!before) newPos = (after?.position ?? 1) - 1;
      else if (!after) newPos = before.position + 1;
      else newPos = (before.position + after.position) / 2;
    }

    moveTask(activeTaskRow.id, targetCol, newPos);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="glass border-b border-border/60 sticky top-0 z-30">
        <div className="max-w-[1500px] mx-auto px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md"
              style={{ background: "var(--gradient-primary)" }}
            >
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Flowboard</h1>
              <p className="text-[11px] text-muted-foreground -mt-0.5">Kanban · with AI</p>
            </div>
          </div>

          <div className="flex-1 max-w-md mx-auto relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks, people, descriptions…"
              className="pl-9 bg-secondary border-transparent focus-visible:bg-card"
            />
          </div>

          <Button
            onClick={() => handleAdd("todo")}
            className="rounded-full shadow-md"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Plus className="w-4 h-4 mr-1" /> New task
          </Button>
        </div>
      </header>

      <main className="flex-1 px-6 py-6 max-w-[1500px] w-full mx-auto">
        {loading ? (
          <div className="text-center text-muted-foreground py-20">Loading board…</div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <div className="flex gap-5 overflow-x-auto pb-6 scrollbar-thin">
              {COLUMNS.map((c) => (
                <Column
                  key={c.key}
                  columnKey={c.key}
                  tasks={byColumn[c.key]}
                  onAdd={handleAdd}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
            <DragOverlay>
              {activeTask ? (
                <div className="rotate-3">
                  <TaskCard task={activeTask} onEdit={() => {}} onDelete={() => {}} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </main>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        defaultColumn={defaultCol}
        onSubmit={handleSubmit}
      />

      <AIChat tasks={tasks} onCreateTask={createTask} />
    </div>
  );
}
