# Kanban Board with AI Assistant

A gorgeous, interactive single-board Kanban app with persistent storage and an integrated AI chatbot.

## Layout

```text
┌──────────┬─────────────────────────────────────────────────┐
│          │  Header: Board title · Search · + Create task   │
│ Sidebar  ├─────────────────────────────────────────────────┤
│ (logo,   │  ┌─To Do─┐ ┌─In Progress─┐ ┌─Review─┐ ┌─Done─┐  │
│  nav)    │  │ card  │ │   card      │ │  card  │ │ card │  │
│          │  │ card  │ │   card      │ │  card  │ │      │  │
│          │  │  +    │ │     +       │ │   +    │ │  +   │  │
│          │  └───────┘ └─────────────┘ └────────┘ └──────┘  │
│          │                                                 │
└──────────┴─────────────────────────────────────────────────┘
                                          ╭─ AI chat bubble ─╮
                                          ╰─ (floating btn)  ─╯
```

## Features

**Board (4 fixed columns)**: To Do, In Progress, Review, Done. Each column shows a task counter and a "+ add card" button at the bottom.

**Task cards** display:
- Title and description
- Due date badge (color-coded by column, like reference image 1)
- Priority chip: low (green) / medium (amber) / high (red)
- Assignee/team text label
- "..." menu to edit or delete

**Interactions**:
- Drag-and-drop between columns and reorder within a column
- Click card → opens an edit dialog (title, description, due date picker, priority, assignee)
- "+ Create task" opens the same dialog with a column selector
- Search bar filters cards live by title/description/assignee
- Smooth motion on drag, hover lift, soft shadows

**AI chatbot** (floating button bottom-right, opens a chat panel):
- "Summarize my board" — sends current board state to the AI and streams back a summary (overdue, what's in progress, blockers, suggestions)
- "Suggest tasks" — user types a goal ("plan a product launch"), AI proposes 3–5 tasks; each suggestion has an "Add to To Do" button that creates the card
- Free-form Q&A about the board also supported
- Markdown-rendered responses, streamed token-by-token

**Persistence**: Single shared board stored in the database — anyone visiting sees the same up-to-date board. Changes save automatically.

## Design

Inspired by the references: clean white surfaces on a soft tinted background, rounded cards with subtle shadows, color-accented column headers and date badges, friendly sans-serif typography. Fully responsive; columns scroll horizontally on narrow screens. Light theme by default with a polished, modern feel.

## Technical notes

- **Storage**: Lovable Cloud — tables `tasks` (id, title, description, column, position, priority, due_date, assignee, created_at, updated_at). Public read/write RLS since there's no login.
- **Realtime**: Supabase realtime subscription so the board updates live across tabs.
- **Drag & drop**: `@dnd-kit/core` + `@dnd-kit/sortable`.
- **AI**: Edge function `chat` calling Lovable AI Gateway (`google/gemini-3-flash-preview`) with streaming SSE. The function receives the current board JSON as context plus the chat history. Tool-calling used for "suggest tasks" so the client can render add-to-board buttons. Handles 402/429 with toasts.
- **Markdown**: `react-markdown` for AI responses.
- **Routes**: Single `/` route hosting the board; AI chat is a slide-over panel.
