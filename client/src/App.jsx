import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  Code2,
  Eye,
  FilePlus,
  Folder,
  FolderPlus,
  MessageSquare,
  Play,
  Save,
  Trash2,
  Edit3,
} from "lucide-react";
import { getWebContainer } from "./services/webcontainer";
import { fileTreeToWebContainer } from "./utils/fileTreeToWebContainer";
import { SiReact, SiJavascript, SiCss, SiHtml5 } from "react-icons/si";
import { getProjectFiles, saveProjectFiles } from "./api/files";
import { useEditorStore } from "./store/editorStore";
import CodeEditor from "./components/CodeEditor";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  SignOutButton,
  UserButton,
  useUser,
} from "@clerk/clerk-react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

const API = `${import.meta.env.VITE_API_URL}/api`;

// ─── helper ────────────────────────────────────────────────────────────────
function fileIcon(name) {
  if (name.endsWith(".jsx")) return <SiReact />;
  if (name.endsWith(".css")) return <SiCss />;
  if (name.endsWith(".html")) return <SiHtml5 />;
  return <SiJavascript />;
}

// ─── FileNode — must be at module scope for Fast Refresh ───────────────────
// Vite Fast Refresh breaks when a component is defined inside another
// component's render function. FileNode is extracted here so HMR works.
function FileNode({ node, level, activeFile, onOpen, onToggle, onRename, onDelete }) {
  if (node.type === "folder") {
    return (
      <div>
        <div className="tree-node folder-node" style={{ paddingLeft: level * 16 }}>
          <button
            onClick={() => {
              onToggle(node.id);
            }}
          >
            {node.open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Folder size={15} />
            {node.name}
          </button>
          <div className="tree-actions">
            <Edit3 size={13} onClick={() => onRename(node.id)} />
            <Trash2 size={13} onClick={() => onDelete(node.id)} />
          </div>
        </div>
        {node.open &&
          node.children?.map((child) => (
            <FileNode
              key={child.id}
              node={child}
              level={level + 1}
              activeFile={activeFile}
              onOpen={onOpen}
              onToggle={onToggle}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
      </div>
    );
  }

  return (
    <div
      className={
        activeFile === node.name
          ? "tree-node file-node active"
          : "tree-node file-node"
      }
      style={{ paddingLeft: level * 16 }}
    >
      <button onClick={() => onOpen(node)}>
        {fileIcon(node.name)}
        {node.name}
      </button>
      <div className="tree-actions">
        <Edit3 size={13} onClick={() => onRename(node.id)} />
        <Trash2 size={13} onClick={() => onDelete(node.id)} />
      </div>
    </div>
  );
}

// ─── Landing ────────────────────────────────────────────────────────────────
function Landing() {
  return (
    <div className="landing">
      <div className="grid-bg" />
      <nav className="top-nav">
        <div className="brand">
          <span className="brand-mark">✦</span>
          <span>Sentinal</span>
        </div>
        <div className="nav-actions">
          <SignInButton mode="modal">
            <button className="btn ghost">Log in</button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="btn primary">Get started</button>
          </SignUpButton>
        </div>
      </nav>
      <section className="hero">
        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
          AI workspace <br />
          <span>built to ship</span>
        </motion.h1>
        <p>
          Organise projects, chat with AI, manage repos, and build faster in one
          Cursor-style workspace.
        </p>
        <SignUpButton mode="modal">
          <button className="btn primary big">Start building →</button>
        </SignUpButton>
      </section>
    </div>
  );
}

// ─── IDEWorkspace ───────────────────────────────────────────────────────────
function IDEWorkspace({
  activeProject,
  messages,
  message,
  setMessage,
  askAI,
  loading,
  deleteProject,
  historyOpen,
  setHistoryOpen,
  setMessages,
  cancelAIRef,
  chatHistory,
  openChat,
}) {
  const openTabs               = useEditorStore((s) => s.openTabs);
  const setActiveFile          = useEditorStore((s) => s.setActiveFile);
  const closeTabStore          = useEditorStore((s) => s.closeTab);
  const activeFile             = useEditorStore((s) => s.activeFile);
  const openFileStore          = useEditorStore((s) => s.openFile);
  const updateFileContentStore = useEditorStore((s) => s.updateFileContent);
  const setFiles               = useEditorStore((s) => s.setFiles);

  const [fileTree,       setFileTree]       = useState([]);
  const [selectedFolder, setSelectedFolder] = useState("src");
  const [activeTab,      setActiveTab]      = useState("code");
  const [terminalLogs,   setTerminalLogs]   = useState(["Sentinal terminal ready..."]);
  const [showTerminal,   setShowTerminal]   = useState(true);

  useEffect(() => {
    if (!activeProject?._id) return;
    loadFiles();
  }, [activeProject]);

  async function loadFiles() {
    try {
      const files = await getProjectFiles(activeProject._id);
      if (files?.length) {
        setFileTree(files);
        setFiles(files);
      } else {
        setFileTree([{ id: "src", name: "src", type: "folder", open: true, children: [] }]);
      }
    } catch (err) {
      console.error(err);
    }
  }

  function flattenFiles(nodes) {
    let result = [];
    nodes.forEach((node) => {
      if (node.type === "file") result.push(node);
      if (node.children) result = [...result, ...flattenFiles(node.children)];
    });
    return result;
  }

  const files       = flattenFiles(fileTree);
  const currentFile = files.find((f) => f.name === activeFile) || null;

  function updateTree(nodes, callback) {
    return nodes.map((node) => {
      const updated = { ...node };
      if (callback(updated)) return updated;
      if (updated.children) updated.children = updateTree(updated.children, callback);
      return updated;
    });
  }

  function toggleFolder(id) {
    setSelectedFolder(id);
    setFileTree((prev) =>
      updateTree(prev, (node) => {
        if (node.id === id && node.type === "folder") {
          node.open = !node.open;
          return true;
        }
        return false;
      })
    );
  }

  function openFile(file) {
  openFileStore({
    ...file,
    content: file.content || "",
  });
}

  function closeTab(file, e) {
    e.stopPropagation();
    closeTabStore(file);
  }

  function updateFileContent(value) {
    setFileTree((prev) =>
      updateTree(prev, (node) => {
        if (node.type === "file" && node.name === activeFile) {
          node.content = value || "";
          return true;
        }
        return false;
      })
    );
    updateFileContentStore(activeFile, value || "");
  }

  function createFile() {
    const name = prompt("File name, example: Login.jsx");
    if (!name) return;
    const newFile = {
      id: Date.now().toString(),
      name,
      type: "file",
      content: name.endsWith(".css")
        ? `.${name.replace(".css", "")} {\n  color: white;\n}`
        : `export default function ${name.replace(".jsx", "")}() {\n  return <div>${name}</div>;\n}`,
    };
    setFileTree((prev) =>
      updateTree(prev, (node) => {
        if (node.id === selectedFolder && node.type === "folder") {
          node.children = [...(node.children || []), newFile];
          node.open = true;
          return true;
        }
        return false;
      })
    );
    openFileStore(newFile);
    setTerminalLogs((prev) => [`Created ${name} in ${selectedFolder}`, ...prev]);
  }

  function createFolder() {
    const name = prompt("Folder name");
    if (!name) return;
    const newFolder = { id: Date.now().toString(), name, type: "folder", open: true, children: [] };
    setFileTree((prev) =>
      updateTree(prev, (node) => {
        if (node.id === selectedFolder && node.type === "folder") {
          node.children = [...(node.children || []), newFolder];
          node.open = true;
          return true;
        }
        return false;
      })
    );
    setSelectedFolder(newFolder.id);
    setTerminalLogs((prev) => [`Created folder ${name}`, ...prev]);
  }

  function renameNode(id) {
    const newName = prompt("New name");
    if (!newName) return;
    setFileTree((prev) =>
      updateTree(prev, (node) => {
        if (node.id === id) {
          if (node.name === activeFile) setActiveFile(newName);
          node.name = newName;
          return true;
        }
        return false;
      })
    );
  }

  function deleteNode(id) {
    function remove(nodes) {
      return nodes
        .filter((n) => n.id !== id)
        .map((n) => (n.children ? { ...n, children: remove(n.children) } : n));
    }
    setFileTree((prev) => remove(prev));
    setTerminalLogs((prev) => ["Deleted item", ...prev]);
  }

  async function saveFile() {
    try {
      await saveProjectFiles(activeProject._id, fileTree);
      setTerminalLogs((prev) => [`Saved ${activeFile} to MongoDB`, ...prev]);
    } catch (err) {
      console.error(err);
    }
  }

  
  function runCommand() {
    const command = prompt("Enter terminal command");
    if (!command) return;
    setTerminalLogs((prev) => [
      `> ${command}`,
      command.includes("git")
        ? "On branch main. Working tree clean."
        : command.includes("npm")
        ? "Packages checked successfully."
        : "Command executed.",
      ...prev,
    ]);
  }

  function cleanCodeOutput(code) {
    if (!code) return "";
    return code.replace(/```jsx/g, "").replace(/```js/g, "").replace(/```javascript/g, "").replace(/```/g, "").trim();
  }

  function getAllFiles(nodes) {
    let result = [];
    for (const node of nodes) {
      if (node.type === "file") result.push(node);
      if (node.children) result = [...result, ...getAllFiles(node.children)];
    }
    return result;
  }
 const [previewUrl, setPreviewUrl] = useState("");

async function runProject() {
  try {
    const wc = await getWebContainer();

    setActiveTab("preview");

    wc.on("server-ready", (port, url) => {
      setPreviewUrl(url);
      setTerminalLogs((prev) => [
        `Preview running at ${url}`,
        ...prev,
      ]);
    });

    setTerminalLogs((prev) => [
      "Installing dependencies...",
      ...prev,
    ]);

    const installProcess = await wc.spawn("npm", ["install"]);

    installProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          setTerminalLogs((prev) => [data, ...prev]);
        },
      })
    );

    const installExitCode = await installProcess.exit;

    if (installExitCode !== 0) {
      setTerminalLogs((prev) => [
        "npm install failed",
        ...prev,
      ]);
      return;
    }

    setTerminalLogs((prev) => [
      "Starting Vite...",
      ...prev,
    ]);

    const devProcess = await wc.spawn("npm", ["run", "dev"]);

    devProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          setTerminalLogs((prev) => [data, ...prev]);
        },
      })
    );
  } catch (err) {
    console.error(err);
    setTerminalLogs((prev) => [
      `Run Error: ${err.message}`,
      ...prev,
    ]);
  }
}
  async function mountToWebContainer() {
  try {
    setTerminalLogs((prev) => ["Booting WebContainer...", ...prev]);

    const wc = await getWebContainer();
    const files = fileTreeToWebContainer(fileTree);

    await wc.mount(files);

    setTerminalLogs((prev) => [
      "Files mounted to WebContainer successfully",
      ...prev,
    ]);
  } catch (err) {
    console.error(err);
    setTerminalLogs((prev) => [
      `WebContainer error: ${err.message}`,
      ...prev,
    ]);
  }
}

  async function generateFullProject() {
  const promptText = prompt("What app should Sentinal build? Example: Weather app");
  if (!promptText) return;

  setTerminalLogs((prev) => [`AI generating project: ${promptText}`, ...prev]);

  try {
    const res = await fetch(`${API}/ai/generate-project`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: promptText,
      }),
    });

    const data = await res.json();

    if (!data.success) {
      alert("Failed to generate project");
      return;
    }

    setFileTree(data.files);
    setFiles(data.files);

    await saveProjectFiles(activeProject._id, data.files);

    setTerminalLogs((prev) => [
      `AI generated project successfully`,
      ...prev,
    ]);
  } catch (err) {
    console.error(err);
    alert("AI project generation failed");
  }
}

  function findFileByName(fileName) {
    return getAllFiles(fileTree).find((f) => f.name.toLowerCase() === fileName.toLowerCase());
  }

  async function aiCreateFileFromText(userPrompt) {
    if (!userPrompt) return;
    setTerminalLogs((prev) => [`Agent: creating file...`, ...prev]);
    try {
      const res = await fetch(`${API}/ai/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedCode: "",
          instruction: `${userPrompt}\n\nReturn only code.\nNo markdown.\nNo explanation.`,
        }),
      });
      const data = await res.json();
      const cleanCode = cleanCodeOutput(data.editedCode);
      if (!cleanCode) { setTerminalLogs((prev) => [`AI failed: ${data.error || "No code"}`, ...prev]); return; }
      const fileName = userPrompt.match(/[A-Za-z0-9_-]+\.(jsx|js|css|html)/)?.[0] || "Generated.jsx";
      const newFile = { id: Date.now().toString(), name: fileName, type: "file", content: cleanCode };
      const updatedTree = updateTree(fileTree, (node) => {
        if (node.id === selectedFolder && node.type === "folder") {
          node.children = [...(node.children || []), newFile];
          node.open = true;
          return true;
        }
        return false;
      });
      setFileTree(updatedTree);
      openFileStore(newFile);
      await saveProjectFiles(activeProject._id, updatedTree);
      setTerminalLogs((prev) => [`Agent created ${fileName}`, ...prev]);
    } catch (err) {
      setTerminalLogs((prev) => [`AI error: ${err.message}`, ...prev]);
    }
  }

  async function editCurrentFile(instruction) {
    if (!currentFile?.content) { alert("Open a file first"); return; }
    setTerminalLogs((prev) => [`$ AI editing ${activeFile}...`, ...prev]);
    try {
      const res = await fetch(`${API}/ai/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedCode: currentFile.content,
          instruction: `${instruction}\n\nFile: ${activeFile}\n\nReturn ONLY updated code. No markdown. No explanation.`,
        }),
      });
      const data = await res.json();
      const cleanCode = cleanCodeOutput(data.editedCode);
      const updatedTree = updateTree(fileTree, (node) => {
        if (node.type === "file" && node.name === activeFile) { node.content = cleanCode; return true; }
        return false;
      });
      setFileTree(updatedTree);
      updateFileContentStore(activeFile, cleanCode);
      await saveProjectFiles(activeProject._id, updatedTree);
      setTerminalLogs((prev) => [`$ AI updated ${activeFile}`, ...prev]);
    } catch (err) {
      setTerminalLogs((prev) => [`$ AI edit failed`, ...prev]);
    }
  }

  async function handleAgentCommand() {
    const command = prompt("What should Sentinal do? Example: Create Footer.jsx");
    if (!command) return;
    const lower = command.toLowerCase();
    if (lower.includes("create") || lower.includes("make") || lower.includes("generate")) {
      await aiCreateFileFromText(command); return;
    }
    if (lower.includes("add") || lower.includes("import") || lower.includes("use")) {
      const fileNameMatch = command.match(/[A-Za-z0-9_-]+\.(jsx|js|css|html)/);
      if (fileNameMatch) {
        const f = findFileByName(fileNameMatch[0]);
        if (f) await editCurrentFile(`Import and render ${f.name}.\n\nFile code:\n${f.content}`);
        else alert(`${fileNameMatch[0]} not found`);
      }
      return;
    }
    alert("Try: Create Footer.jsx or Add Navbar.jsx");
  }
  async function modifyFullProject() {
  const instruction = prompt("What should Sentinal change? Example: Add dark mode");
  if (!instruction) return;

  setTerminalLogs((prev) => [`AI modifying project: ${instruction}`, ...prev]);

  try {
    const res = await fetch(`${API}/ai/modify-project`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instruction,
        files: fileTree,
      }),
    });

    const data = await res.json();

    if (!data.success) {
      alert("Failed to modify project");
      return;
    }

    setFileTree(data.files);
    setFiles(data.files);

    await saveProjectFiles(activeProject._id, data.files);

    setTerminalLogs((prev) => [
      `AI modified project successfully`,
      ...prev,
    ]);
  } catch (err) {
    console.error(err);
    alert("AI project modification failed");
  }
}

  async function handleSmartSend() {
    const text = message.trim();
    if (!text) return;
    const lower = text.toLowerCase();
    if (lower.includes("create") || lower.includes("make") || lower.includes("generate")) {
      setMessage(""); await aiCreateFileFromText(text); return;
    }
    if (lower.includes("add") || lower.includes("import") || lower.includes("use")) {
      setMessage("");
      const fileNameMatch = text.match(/[A-Za-z0-9_-]+\.(jsx|js|css|html)/);
      if (fileNameMatch) {
        const f = findFileByName(fileNameMatch[0]);
        if (f) await editCurrentFile(`Import and render ${f.name}.\n\nFile code:\n${f.content}`);
      }
      return;
    }
    askAI();
  }

  function explainCode() {
    if (!currentFile?.content) { alert("Open a file first"); return; }
    askAI(`Explain this code:\n\nFile: ${activeFile}\n\n${currentFile.content}`);
  }

  function fixCode() { editCurrentFile("Fix all errors. Return only fixed code."); }
  function refactorCode() { editCurrentFile("Refactor and clean this code. Return only improved code."); }

  return (
    // FIX: height:100vh + overflow:hidden anchors the entire IDE to viewport
    <div className="ide-shell">

      {/* Navbar — flex-shrink:0, never compressed */}
      <div className="ide-navbar">
        <div className="ide-title">
          <Code2 size={20} />
          <div>
            <b>Sentinal IDE</b>
            <span>{activeProject?.title} • Git Connected • AI Online</span>
          </div>
        </div>
        <div className="ide-actions">
          <button onClick={createFile}><FilePlus size={15} /> File</button>
          <button onClick={createFolder}><FolderPlus size={15} /> Folder</button>
          <button onClick={saveFile}><Save size={15} /> Save</button>
          <button className="run-btn" onClick={runProject}><Play size={15} /> Run</button>
        </div>
      </div>

      {/* FIX: ide-panels gets flex:1 min-height:0 so panels share remaining height */}
      <PanelGroup direction="horizontal" className="ide-panels">

        {/* Explorer */}
        <Panel defaultSize={22} minSize={15}>
          {/* FIX: height:100% overflow-y:auto — sidebar scrolls internally */}
          <div className="ide-sidebar">
            <h3><Folder size={16} /> Explorer</h3>
            {fileTree.map((node) => (
              <FileNode
                key={node.id}
                node={node}
                level={0}
                activeFile={activeFile}
                onOpen={openFile}
                onToggle={toggleFolder}
                onRename={renameNode}
                onDelete={deleteNode}
              />
            ))}
          </div>
        </Panel>

        <PanelResizeHandle className="resize-handle" />

        {/* Editor */}
        <Panel defaultSize={48} minSize={30}>
          {/*
            FIX: editor-layout is flex column with height:100% min-height:0
            Without min-height:0 the column grows to content height, pushing
            the terminal below the visible area.
          */}
          <div className="editor-layout">

            {/* File tabs — flex-shrink:0 */}
            <div className="file-tabs">
              {openTabs.map((tab) => (
                <button
                  key={tab}
                  className={activeFile === tab ? "file-tab active" : "file-tab"}
                  onClick={() => setActiveFile(tab)}
                >
                  {tab}
                  <span onClick={(e) => closeTab(tab, e)}>×</span>
                </button>
              ))}
            </div>

            {/* Mode tabs — flex-shrink:0 */}
            <div className="editor-tabs">
              <button className={activeTab === "code" ? "tab active" : "tab"} onClick={() => setActiveTab("code")}>
                <Code2 size={15} /> Code
              </button>
              <button className={activeTab === "preview" ? "tab active" : "tab"} onClick={() => setActiveTab("preview")}>
                <Eye size={15} /> Preview
              </button>
            </div>

            {/*
              FIX: code-area gets flex:1 min-height:0 overflow:hidden
              flex:1       — absorbs all height between tabs and terminal
              min-height:0 — allows shrinking (flexbox default is min-height:auto
                             which prevents shrinking and causes the overflow)
              overflow:hidden — clips the editor; CodeMirror scrolls internally
            */}
            <div className="code-area">
             {activeTab === "code" ? (
  <div className="code-editor-wrap">
    <CodeEditor
  key={activeFile}
  activeFile={activeFile}
  content={currentFile?.content || ""}
  updateFileContent={updateFileContent}
/>
  </div>
) : (
  previewUrl ? (
    <iframe
      src={previewUrl}
      title="preview"
      className="preview-frame"
    />
  ) : (
    <div style={{ padding: "20px", color: "#c4b5fd" }}>
      No Preview Yet. Click Run.
    </div>
  )
)}
            </div>

            {/*
              FIX: terminal-panel has flex-shrink:0 in CSS.
              This is the single most important rule — it tells flexbox
              "never compress the terminal, no matter how tall the editor is".
              Height is inline so the hide/show toggle works.
            */}
            <div
              className="terminal-panel"
              style={{
                height:    showTerminal ? "180px" : "42px",
                minHeight: showTerminal ? "180px" : "42px",
              }}
            >
              <div className="terminal-head">
                <span>PROBLEMS</span>
                <span className="active">TERMINAL</span>
                <span>OUTPUT</span>
                <button onClick={runCommand}>Run Cmd</button>
                <button
                  onClick={() => setShowTerminal(!showTerminal)}
                  style={{
                    marginLeft: "auto",
                    background: "#7c3aed",
                    color: "white",
                    border: "none",
                    padding: "4px 10px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  {showTerminal ? "Hide" : "Show"}
                </button>
              </div>
              <div className="terminal-body">
                {terminalLogs.map((log, i) => (
                  <p key={i}>$ {log}</p>
                ))}
              </div>
            </div>

          </div>
        </Panel>

        <PanelResizeHandle className="resize-handle" />

        {/* AI Panel */}
        <Panel defaultSize={30} minSize={24}>
          <div className="ai-side-panel">
            <div className="chat-head">
              <div className="agent-title">
                <MessageSquare size={16} />
                <span>AI Agent</span>
              </div>
              <span className="status-badge">{loading ? "thinking..." : "online"}</span>
            </div>

            <div className="chat-tools">
              <button
                onClick={() => setHistoryOpen(true)}
                style={{
                  flex: 1, background: "rgba(124,58,237,0.15)",
                  border: "1px solid rgba(168,85,247,0.4)", color: "#e9d5ff",
                  borderRadius: "14px", padding: "12px", fontWeight: "700",
                  fontSize: "14px", cursor: "pointer",
                }}
              >
                📜 History
              </button>
              <button
                onClick={() => setMessages([])}
                style={{
                  flex: 1, background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.35)", color: "#f87171",
                  borderRadius: "14px", padding: "12px", fontWeight: "700",
                  fontSize: "14px", cursor: "pointer",
                }}
              >
                🗑 Clear
              </button>
            </div>

            <div className="ai-actions">
  <button onClick={generateFullProject}>Build App</button>
  <button onClick={handleAgentCommand}>Agent</button>
  <button onClick={() => aiCreateFileFromText(prompt("Create what?") || "")}>Generate</button>
  <button onClick={explainCode}>Explain</button>
  <button onClick={mountToWebContainer}>Mount</button>
  <button onClick={modifyFullProject}>Fix / Modify App</button>
  <button onClick={fixCode}>Fix</button>
  <button onClick={refactorCode}>Refactor</button>
</div>

            <div className="chat-body">
              <div className="bubble ai">
                Hi! I am your Sentinal agent for <b>{activeProject?.title}</b>.
              </div>
              {messages.map((m, i) => (
                <div key={i} className={`bubble ${m.role}`}>
                  {m.content}
                </div>
              ))}
            </div>

            <div className="chat-input-row">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask Sentinal..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSmartSend(); }
                }}
              />
              {loading ? (
                <button onClick={() => { cancelAIRef.current = true; }}>■</button>
              ) : (
                <button onClick={handleSmartSend}>↑</button>
              )}
            </div>

            <button className="danger" onClick={() => deleteProject(activeProject._id)}>
              Delete Project
            </button>
          </div>
        </Panel>

      </PanelGroup>

     {historyOpen && (
  <div className="command-overlay" onClick={() => setHistoryOpen(false)}>
    <div className="command" onClick={(e) => e.stopPropagation()}>
      <h2>Conversation History</h2>

      {chatHistory.length === 0 ? (
        <p>No saved chats yet.</p>
      ) : (
        <div className="history-list">
          {chatHistory.map((chat) => (
            <div
              key={chat._id}
              className="history-card"
              onClick={() => openChat(chat._id)}
              style={{ cursor: "pointer" }}
            >
              <div className="history-role">
                💬 {chat.title || "Untitled Chat"}
              </div>

              <div className="history-content">
                {chat.messages?.[0]?.content?.slice(0, 120) || "No messages"}
              </div>

              <div className="history-time">
                {new Date(chat.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => setHistoryOpen(false)}>Close</button>
    </div>
  </div>
)}
    </div>
  );
}


// ─── Dashboard ──────────────────────────────────────────────────────────────
function Dashboard() {
  const { user } = useUser();

  const [projects,            setProjects]            = useState([]);
  const [activeProject,       setActiveProject]       = useState(null);
  const [view,                setView]                = useState("home");
  const [projectTitle,        setProjectTitle]        = useState("");
  const [projectDescription,  setProjectDescription]  = useState("");
  const [projectSearch,       setProjectSearch]       = useState("");
  const [commandOpen,         setCommandOpen]         = useState(false);
  const [messages,            setMessages]            = useState([]);
  const [message,             setMessage]             = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [loading,             setLoading]             = useState(false);
  const [historyOpen,         setHistoryOpen]         = useState(false);
  const [renameId,            setRenameId]            = useState(null);
  const [renameValue,         setRenameValue]         = useState("");
  const [repoUrl,             setRepoUrl]             = useState("");
  const [activity,            setActivity]            = useState([
    "Opened Sentinal workspace",
    "Dashboard loaded",
  ]);

  const cancelAIRef = useRef(false);

  useEffect(() => {
    if (user?.id) fetchProjects(user.id);
  }, [user]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); setCommandOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault(); document.getElementById("project-name-input")?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const filteredProjects = useMemo(
    () => projects.filter((p) => p.title.toLowerCase().includes(projectSearch.toLowerCase())),
    [projects, projectSearch]
  );

  async function fetchProjects(clerkId) {
    try {
      const res  = await fetch(`${API}/projects/${clerkId}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setProjects(list);
      if (list.length > 0) { setActiveProject(list[0]); fetchProjectChats(list[0]._id); }
    } catch (err) { console.error(err); }
  }

 async function fetchProjectChats(projectId) {
  try {
    const res = await fetch(`${API}/project-chats/${projectId}`);
    const data = await res.json();

    setChatHistory(data);

    if (data.length > 0) {
      setMessages(data[0].messages || []);
    } else {
      setMessages([]);
    }
  } catch (err) {
    console.error(err);
  }
}

async function openChat(chatId) {
  try {
    const res = await fetch(`${API}/chats/${chatId}`);
    const data = await res.json();

    setMessages(data.chat.messages || []);
    setHistoryOpen(false);
  } catch (err) {
    console.error(err);
  }
}

  async function createProject() {
    if (!projectTitle.trim()) return;
    const res  = await fetch(`${API}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: projectTitle, description: projectDescription, clerkId: user.id }),
    });
    const data = await res.json();
    if (data.success) {
      setProjects([data.project, ...projects]);
      setActiveProject(data.project);
      setMessages([]);
      setProjectTitle("");
      setProjectDescription("");
      setActivity([`Created project: ${data.project.title}`, ...activity]);
      setView("project");
    }
  }

  async function deleteProject(id) {
    const ok = confirm("Delete this project?");
    if (!ok) return;
    await fetch(`${API}/projects/${id}`, { method: "DELETE" });
    const updated = projects.filter((p) => p._id !== id);
    setProjects(updated);
    if (updated.length > 0) { setActiveProject(updated[0]); fetchProjectChats(updated[0]._id); }
    else { setActiveProject(null); setMessages([]); setView("home"); }
    setActivity(["Deleted a project", ...activity]);
  }

  async function renameProject(id) {
    if (!renameValue.trim()) return;
    const res  = await fetch(`${API}/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: renameValue }),
    });
    const data = await res.json();
    if (data.success) {
      const updated = projects.map((p) => p._id === id ? { ...p, title: renameValue } : p);
      setProjects(updated);
      if (activeProject?._id === id) setActiveProject({ ...activeProject, title: renameValue });
      setRenameId(null); setRenameValue("");
      setActivity([`Renamed project to ${renameValue}`, ...activity]);
    }
  }

  async function importRepo() {
  if (!repoUrl.trim()) return;

  try {
    const importRes = await fetch(`${API}/github/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        repoUrl,
      }),
    });

    const imported = await importRes.json();

    if (!imported.success) {
      alert(imported.message || "Import failed");
      return;
    }

    const res = await fetch(`${API}/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: imported.title,
        description: `Imported from ${repoUrl}`,
        repoUrl,
        clerkId: user.id,
      }),
    });

    const data = await res.json();

    if (data.success) {
      await saveProjectFiles(data.project._id, imported.files);

      setProjects([data.project, ...projects]);
      setActiveProject(data.project);
      setRepoUrl("");
      setView("project");

      setActivity([`Imported repo: ${imported.title}`, ...activity]);
    }
  } catch (err) {
    console.error(err);
    alert("GitHub import failed");
  }
}

  async function askAI(customMessage) {
  const userText = customMessage || message;

  if (!userText.trim() || !activeProject || loading) return;

  const projectId = activeProject._id;

  setMessage("");
  setLoading(true);
  cancelAIRef.current = false;

  setMessages((prev) => [
    ...prev,
    { role: "user", content: userText },
    { role: "assistant", content: "Thinking..." },
  ]);

  try {
    await fetch(`${API}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userText,
        clerkId: user.id,
        projectId,
      }),
    });

    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;

      if (cancelAIRef.current) {
        clearInterval(interval);
        setLoading(false);

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "Generation stopped.",
          };
          return updated;
        });

        return;
      }

      try {
        const res = await fetch(`${API}/project-chats/${projectId}`);
        const chats = await res.json();

        const latestChat = chats[0];

        if (
          latestChat &&
          latestChat.messages &&
          latestChat.messages.length > 1
        ) {
          clearInterval(interval);

          const aiReply =
            latestChat.messages[latestChat.messages.length - 1]?.content ||
            "No response";

          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: aiReply,
            };
            return updated;
          });

          setChatHistory(chats);
          setActivity([`Asked AI in ${activeProject.title}`, ...activity]);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
      }

      if (attempts > 25) {
        clearInterval(interval);
        setLoading(false);

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "AI is still processing. Refresh in a few seconds.",
          };
          return updated;
        });
      }
    }, 1500);
  } catch (err) {
    setLoading(false);
  }
}

function openProject(p) {
  setActiveProject(p);
  setView("project");
  setCommandOpen(false);
  fetchProjectChats(p._id);
}
  return (
    <div className="app">
      <div className="grid-bg" />

      <aside className="sidebar">
        <div>
          <div className="brand side-brand">
            <span className="brand-mark">✦</span>
            <span>Sentinal</span>
          </div>
          <nav className="side-nav">
            <button className={view === "home"    ? "side-link active" : "side-link"} onClick={() => setView("home")}>⬡ Home</button>
            <button className="side-link" onClick={() => { setView("home"); setTimeout(() => document.getElementById("project-search")?.focus(), 100); }}>◎ Projects</button>
            <button className={view === "project" ? "side-link active" : "side-link"} onClick={() => activeProject && openProject(activeProject)}>⚡ IDE</button>
            <button className={view === "settings"? "side-link active" : "side-link"} onClick={() => setView("settings")}>⌘ Settings</button>
          </nav>
          <div className="side-section">
            <p>Recent</p>
            {projects.slice(0, 5).map((p) => (
              <button
                key={p._id}
                className={activeProject?._id === p._id ? "recent-project active" : "recent-project"}
                onClick={() => openProject(p)}
              >
                <span className="dot" />{p.title}
              </button>
            ))}
          </div>
        </div>
        <div className="side-user">
          <div className="user-row"><UserButton /><span>{user?.firstName || "om"}</span></div>
          <SignOutButton><button className="signout">Sign out</button></SignOutButton>
        </div>
      </aside>

      <main className="main">
        <AnimatePresence mode="wait">

          {view === "home" && (
            <motion.div className="content" key="home" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <header className="page-head">
                <div>
                  <h1>Good day, {user?.firstName || "om"} 👋</h1>
                  <p>What are we building today?</p>
                </div>
              </header>

              <section className="top-grid">
                <div className="panel highlight">
                  <div className="panel-top"><span>✧</span><kbd>⌘J</kbd></div>
                  <h2>New project</h2>
                  <p>Create an isolated AI workspace</p>
                  <input id="project-name-input" placeholder="Project name" value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} />
                  <textarea placeholder="Description optional" value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} />
                  <button className="btn primary" onClick={createProject}>Create →</button>
                </div>

                <div className="panel">
                  <div className="panel-top"><span>⌘</span><kbd>⌘I</kbd></div>
                  <h2>Import Repo</h2>
                  <p>Connect an existing GitHub repository</p>
                  <input placeholder="https://github.com/user/repo" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} />
                  <button className="btn outline" onClick={importRepo}>Import →</button>
                </div>

                <div className="panel">
                  <h2>Overview</h2>
                  <div className="stats">
                    <div><span>Projects</span><b>{projects.length}</b></div>
                    <div><span>Active</span><b className="green">{activeProject ? 1 : 0}</b></div>
                    <div><span>Chats</span><b className="green">{messages.length}</b></div>
                  </div>
                </div>
              </section>

              <section className="project-section">
                <div className="section-head">
                  <h3>All Projects</h3>
                  <input id="project-search" className="search" placeholder="Search projects..." value={projectSearch} onChange={(e) => setProjectSearch(e.target.value)} />
                  <button className="cmd-btn" onClick={() => setCommandOpen(true)}>⌘K</button>
                </div>

                {filteredProjects.length === 0 ? (
                  <div className="empty">
                    <h2>No projects yet</h2>
                    <p>Create your first AI workspace to start building.</p>
                  </div>
                ) : (
                  <div className="project-grid">
                    {filteredProjects.map((p) => (
                      <motion.div key={p._id} className="project-card" whileHover={{ y: -6 }}>
                        <div className="project-card-top">
                          <span className="glow-dot" />
                          <button className="delete" onClick={() => deleteProject(p._id)}>×</button>
                        </div>
                        {renameId === p._id ? (
                          <input
                            value={renameValue}
                            autoFocus
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => renameProject(p._id)}
                            onKeyDown={(e) => { if (e.key === "Enter") renameProject(p._id); }}
                          />
                        ) : (
                          <h2
                            onDoubleClick={() => { setRenameId(p._id); setRenameValue(p.title); }}
                            onClick={() => openProject(p)}
                          >
                            {p.title}
                          </h2>
                        )}
                        <p>{p.description || "No description"}</p>
                        <button className="open-project" onClick={() => openProject(p)}>Open IDE →</button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </section>

              <section className="activity">
                <h3>Recent Activity</h3>
                {activity.slice(0, 6).map((a, i) => <p key={i}>• {a}</p>)}
              </section>
            </motion.div>
          )}

          {view === "project" && (
            <motion.div className="content ide-content" key="project" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <button className="back" onClick={() => setView("home")}>← Back</button>
              <IDEWorkspace
  activeProject={activeProject}
  messages={messages}
  message={message}
  setMessage={setMessage}
  askAI={askAI}
  loading={loading}
  deleteProject={deleteProject}
  historyOpen={historyOpen}
  setHistoryOpen={setHistoryOpen}
  setMessages={setMessages}
  cancelAIRef={cancelAIRef}
  chatHistory={chatHistory}
  openChat={openChat}
/>
            </motion.div>
          )}

          {view === "settings" && (
            <motion.div className="content" key="settings" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <h1>Settings</h1>
              <p>Manage profile, appearance, API keys, and billing.</p>
              <div className="settings-grid">
                {["Profile", "Appearance", "API Keys", "Billing"].map((x) => (
                  <div className="panel" key={x}><h2>{x}</h2><p>Coming soon</p></div>
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {commandOpen && (
        <div className="command-overlay" onClick={() => setCommandOpen(false)}>
          <motion.div className="command" onClick={(e) => e.stopPropagation()} initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}>
            <input autoFocus placeholder="Search projects or commands..." value={projectSearch} onChange={(e) => setProjectSearch(e.target.value)} />
            <button onClick={() => setView("home")}>Create Project</button>
            <button onClick={() => setView("settings")}>Open Settings</button>
            {filteredProjects.map((p) => (
              <button key={p._id} onClick={() => openProject(p)}>Open {p.title}</button>
            ))}
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ─── App root — named default export (required for Fast Refresh) ────────────
function App() {
  return (
    <>
      <SignedOut><Landing /></SignedOut>
      <SignedIn><Dashboard /></SignedIn>
    </>
  );
}

export default App;
