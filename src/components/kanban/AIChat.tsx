import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, X, Plus, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Task, ColumnKey, Priority } from "@/types/kanban";

interface Suggestion {
  title: string;
  description: string;
  priority: Priority;
}
interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  suggestions?: Suggestion[];
}

interface Props {
  tasks: Task[];
  onCreateTask: (input: {
    title: string;
    description?: string;
    column_key?: ColumnKey;
    priority?: Priority;
  }) => Promise<unknown>;
}

export function AIChat({ tasks, onCreateTask }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "Hi! 👋 I can **summarize your board** or **suggest tasks**. Try _“Summarize my board”_ or _“Suggest 4 tasks to launch a new website.”_",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const send = async (text: string) => {
    if (!text.trim() || streaming) return;
    setInput("");
    const userMsg: ChatMsg = { role: "user", content: text };
    setMessages((p) => [...p, userMsg, { role: "assistant", content: "" }]);
    setStreaming(true);

    let assistantText = "";
    const toolArgsByIndex: Record<number, string> = {};
    const toolNames: Record<number, string> = {};

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            board: tasks.map((t) => ({
              title: t.title,
              description: t.description,
              column: t.column_key,
              priority: t.priority,
              due_date: t.due_date,
              assignee: t.assignee,
            })),
            messages: [...messages, userMsg].map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        }
      );

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error("Rate limit hit — slow down a sec.");
        else if (resp.status === 402) toast.error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
        else toast.error("AI request failed");
        setMessages((p) => p.slice(0, -1));
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) {
              assistantText += delta.content;
              setMessages((p) =>
                p.map((m, i) =>
                  i === p.length - 1 ? { ...m, content: assistantText } : m
                )
              );
            }
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const i = tc.index ?? 0;
                if (tc.function?.name) toolNames[i] = tc.function.name;
                if (tc.function?.arguments) {
                  toolArgsByIndex[i] = (toolArgsByIndex[i] ?? "") + tc.function.arguments;
                }
              }
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }

      // Process tool calls
      for (const i of Object.keys(toolArgsByIndex)) {
        if (toolNames[+i] === "suggest_tasks") {
          try {
            const args = JSON.parse(toolArgsByIndex[+i]);
            const suggestions: Suggestion[] = args.tasks ?? [];
            setMessages((p) =>
              p.map((m, idx) =>
                idx === p.length - 1
                  ? {
                      ...m,
                      content: m.content || "Here are some task ideas:",
                      suggestions,
                    }
                  : m
              )
            );
          } catch (e) {
            console.error("tool args parse", e);
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Something went wrong");
    } finally {
      setStreaming(false);
    }
  };

  const addSuggestion = async (s: Suggestion) => {
    try {
      await onCreateTask({
        title: s.title,
        description: s.description,
        priority: s.priority,
        column_key: "todo",
      });
      toast.success(`Added “${s.title}” to To Do`);
    } catch {
      toast.error("Could not add task");
    }
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "fixed bottom-6 right-6 z-40 rounded-full p-4 text-white",
          "shadow-[var(--shadow-elegant)]"
        )}
        style={{ background: "var(--gradient-accent)" }}
        aria-label="Open AI assistant"
      >
        <Sparkles className="w-5 h-5" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.aside
              initial={{ x: 420 }}
              animate={{ x: 0 }}
              exit={{ x: 420 }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-0 bottom-0 w-full sm:w-[420px] bg-card border-l border-border flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                    style={{ background: "var(--gradient-accent)" }}
                  >
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">AI Assistant</div>
                    <div className="text-xs text-muted-foreground">Knows your board</div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="px-4 py-2 flex flex-wrap gap-2 border-b border-border">
                <button
                  onClick={() => send("Summarize my board")}
                  className="text-xs bg-secondary hover:bg-muted px-3 py-1.5 rounded-full transition"
                >
                  ✨ Summarize my board
                </button>
                <button
                  onClick={() => send("Suggest 4 tasks I should add")}
                  className="text-xs bg-secondary hover:bg-muted px-3 py-1.5 rounded-full transition"
                >
                  💡 Suggest tasks
                </button>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      "max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm",
                      m.role === "user"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1">
                        <ReactMarkdown>{m.content || (streaming && i === messages.length - 1 ? "…" : "")}</ReactMarkdown>
                      </div>
                    ) : (
                      <div>{m.content}</div>
                    )}
                    {m.suggestions && m.suggestions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {m.suggestions.map((s, k) => (
                          <div
                            key={k}
                            className="bg-card border border-border rounded-xl p-3 text-foreground"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="font-semibold text-[13px]">{s.title}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {s.description}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addSuggestion(s)}
                                className="shrink-0"
                              >
                                <Plus className="w-3 h-3 mr-1" /> Add
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {streaming && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" /> thinking…
                  </div>
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="p-3 border-t border-border flex gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything about your board…"
                  className="flex-1 bg-secondary rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  disabled={streaming}
                />
                <Button type="submit" size="icon" className="rounded-full" disabled={streaming || !input.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
