# UIGen Architecture Diagram

## System Overview

```mermaid
graph TB
    subgraph Client["🖥️ Browser (React 19)"]
        UI["MainContent<br/>(Resizable Panels)"]
        Chat["ChatInterface"]
        Preview["PreviewFrame<br/>(sandboxed iframe)"]
        Editor["CodeEditor + FileTree"]
        Header["HeaderActions<br/>(Auth / Projects)"]

        UI --> Chat
        UI --> Preview
        UI --> Editor
        UI --> Header
    end

    subgraph Contexts["📦 Client State (React Context)"]
        ChatCtx["ChatProvider<br/>useChat (Vercel AI SDK)"]
        FSCtx["FileSystemProvider<br/>VirtualFileSystem"]

        ChatCtx -->|onToolCall| FSCtx
        Chat --> ChatCtx
        Preview --> FSCtx
        Editor --> FSCtx
    end

    subgraph Server["⚙️ Next.js 15 Server"]
        API["POST /api/chat"]
        Actions["Server Actions<br/>signUp · signIn · signOut<br/>createProject · getProject · getProjects"]
        MW["Middleware<br/>(JWT auth check)"]
        Prompt["System Prompt<br/>(generation.tsx)"]
    end

    subgraph AI["🤖 AI Layer"]
        Provider{"getLanguageModel()"}
        Claude["Anthropic Claude<br/>(claude-haiku-4-5)"]
        Mock["MockLanguageModel<br/>(no API key fallback)"]
        Provider -->|API key exists| Claude
        Provider -->|no API key| Mock
    end

    subgraph Tools["🔧 AI Tools (Server-side)"]
        StrReplace["str_replace_editor<br/>view · create · str_replace · insert"]
        FileMgr["file_manager<br/>rename · delete"]
    end

    subgraph DB["💾 Database"]
        Prisma["Prisma ORM"]
        SQLite["SQLite (dev.db)"]
        Prisma --> SQLite
    end

    subgraph Models["📊 Data Models"]
        User["User<br/>id · email · password"]
        Project["Project<br/>id · name · userId?<br/>messages (JSON) · data (JSON)"]
        User -->|1:N| Project
    end

    %% Client → Server flows
    ChatCtx -->|"POST /api/chat<br/>{messages, files, projectId}"| API
    Header -->|Server Actions| Actions
    MW -->|protects routes| API

    %% Server → AI flows
    API --> Provider
    API --> StrReplace
    API --> FileMgr
    StrReplace --> VFS_Server["VirtualFileSystem<br/>(server instance)"]
    FileMgr --> VFS_Server

    %% Server → DB flows
    API -->|save messages + files| Prisma
    Actions --> Prisma
    Prisma --> Models

    %% AI response back
    API -->|"streamText() response"| ChatCtx

    %% Auth
    subgraph Auth["🔐 Auth (JWT + Cookies)"]
        AuthLib["lib/auth.ts<br/>createSession · getSession<br/>verifySession · deleteSession"]
        AuthUI["AuthDialog<br/>SignInForm · SignUpForm"]
    end
    Header --> AuthUI
    AuthUI -->|Server Actions| Actions
    Actions --> AuthLib
    MW --> AuthLib
```

## Request Flow: User Sends a Chat Message

```mermaid
sequenceDiagram
    participant U as User
    participant CI as ChatInterface
    participant CC as ChatProvider
    participant API as POST /api/chat
    participant LLM as Claude / Mock
    participant T as Tools (str_replace_editor, file_manager)
    participant VFS_S as VirtualFileSystem (Server)
    participant VFS_C as VirtualFileSystem (Client)
    participant DB as SQLite
    participant PF as PreviewFrame

    U->>CI: Types message & submits
    CI->>CC: handleSubmit()
    CC->>API: POST {messages, files, projectId}
    API->>API: Reconstruct VFS from files
    API->>LLM: streamText(messages, tools)

    loop Multi-step tool use (up to 40 steps)
        LLM-->>API: text-delta / tool-call
        API-->>CC: Stream response
        alt Tool Call
            LLM->>T: tool call (create/str_replace/insert/rename/delete)
            T->>VFS_S: Modify files on server VFS
            T-->>LLM: Tool result
            CC->>VFS_C: onToolCall → mirror changes on client VFS
            VFS_C->>PF: refreshTrigger → re-render preview
        end
    end

    LLM-->>API: finish (stop)
    API->>DB: Save messages + file data (if authenticated)
    API-->>CC: Final stream response
    CC-->>CI: Update messages display
```

## File System & Preview Pipeline

```mermaid
flowchart LR
    subgraph VFS["VirtualFileSystem"]
        Files["In-memory file tree<br/>(Map&lt;path, FileNode&gt;)"]
    end

    subgraph Transform["JSX Transformer"]
        Babel["@babel/standalone<br/>JSX → JS"]
        ImportMap["createImportMap()<br/>blob URLs"]
    end

    subgraph Iframe["Sandboxed iframe"]
        HTML["Generated HTML<br/>+ import map<br/>+ Tailwind CDN<br/>+ React CDN"]
    end

    Files -->|getAllFiles()| Transform
    Transform -->|createPreviewHTML()| Iframe
```

## Directory Structure

```
uigen/
├── prisma/                  # Database schema & migrations
│   ├── schema.prisma        # User + Project models
│   └── dev.db               # SQLite database
├── src/
│   ├── actions/             # Server Actions (auth + CRUD)
│   ├── app/
│   │   ├── api/chat/        # AI chat endpoint (streaming)
│   │   ├── [projectId]/     # Project page (authenticated)
│   │   ├── page.tsx         # Home (anon or redirect)
│   │   ├── main-content.tsx # Main UI layout
│   │   └── layout.tsx       # Root layout
│   ├── components/
│   │   ├── auth/            # SignIn/SignUp dialogs
│   │   ├── chat/            # Chat UI (messages, input, markdown)
│   │   ├── editor/          # Code editor + file tree
│   │   ├── preview/         # Live preview iframe
│   │   └── ui/              # shadcn/ui primitives
│   ├── hooks/               # useAuth hook
│   ├── lib/
│   │   ├── contexts/        # ChatProvider, FileSystemProvider
│   │   ├── prompts/         # System prompt for AI
│   │   ├── tools/           # AI tool definitions
│   │   ├── transform/       # JSX → browser-ready JS
│   │   ├── auth.ts          # JWT session management
│   │   ├── file-system.ts   # VirtualFileSystem class
│   │   ├── prisma.ts        # Prisma client singleton
│   │   └── provider.ts      # LLM provider (Claude or Mock)
│   └── middleware.ts         # Route protection
└── package.json
```
