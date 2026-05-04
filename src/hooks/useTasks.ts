import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Task, ColumnKey, Priority } from "@/types/kanban";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .order("position", { ascending: true });
      if (mounted && data) setTasks(data as Task[]);
      setLoading(false);
    })();

    const channel = supabase
      .channel("tasks-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload) => {
          setTasks((prev) => {
            if (payload.eventType === "INSERT") {
              const t = payload.new as Task;
              if (prev.find((p) => p.id === t.id)) return prev;
              return [...prev, t].sort((a, b) => a.position - b.position);
            }
            if (payload.eventType === "UPDATE") {
              const t = payload.new as Task;
              return prev
                .map((p) => (p.id === t.id ? t : p))
                .sort((a, b) => a.position - b.position);
            }
            if (payload.eventType === "DELETE") {
              return prev.filter((p) => p.id !== (payload.old as Task).id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const createTask = useCallback(
    async (input: {
      title: string;
      description?: string;
      column_key?: ColumnKey;
      priority?: Priority;
      due_date?: string | null;
      assignee?: string;
    }) => {
      const column_key = input.column_key ?? "todo";
      const colTasks = tasks.filter((t) => t.column_key === column_key);
      const maxPos = colTasks.reduce((m, t) => Math.max(m, t.position), 0);
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          title: input.title,
          description: input.description ?? "",
          column_key,
          priority: input.priority ?? "medium",
          due_date: input.due_date ?? null,
          assignee: input.assignee ?? "",
          position: maxPos + 1,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Task;
    },
    [tasks]
  );

  const updateTask = useCallback(async (id: string, patch: Partial<Task>) => {
    const { error } = await supabase.from("tasks").update(patch).eq("id", id);
    if (error) throw error;
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) throw error;
  }, []);

  const moveTask = useCallback(
    async (id: string, column_key: ColumnKey, position: number) => {
      // optimistic update
      setTasks((prev) =>
        prev
          .map((t) => (t.id === id ? { ...t, column_key, position } : t))
          .sort((a, b) => a.position - b.position)
      );
      await supabase.from("tasks").update({ column_key, position }).eq("id", id);
    },
    []
  );

  return { tasks, loading, createTask, updateTask, deleteTask, moveTask };
}
