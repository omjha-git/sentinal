import { useEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { oneDark } from "@codemirror/theme-one-dark";
import { getAISuggestion, editSelectedCode } from "../api/files";

function getLanguage(file) {
  if (file?.endsWith(".css")) return [css()];
  if (file?.endsWith(".html")) return [html()];
  return [javascript()];
}

export default function CodeEditor({
  activeFile,
  content,
  updateFileContent,
}) {
  const editorRef = useRef(null);

  const [suggestion, setSuggestion] = useState("");
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [selectedCode, setSelectedCode] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!content) {
        setSuggestion("");
        return;
      }

      const result = await getAISuggestion(content);
      setSuggestion(result || "");
    }, 500);

    return () => clearTimeout(timer);
  }, [content]);

  function acceptSuggestion() {
    if (!suggestion) return;
    updateFileContent((content || "") + suggestion);
    setSuggestion("");
  }

  function openQuickEdit() {
    const view = editorRef.current;
    if (!view) return;

    const selection = view.state.selection.main;
    const selected = view.state.doc.sliceString(selection.from, selection.to);

    if (!selected.trim()) {
      alert("Select some code first, then press Ctrl + K");
      return;
    }

    setSelectedCode(selected);
    setInstruction("");
    setQuickEditOpen(true);
  }

  async function applyQuickEdit() {
    if (!instruction.trim()) return;

    const view = editorRef.current;
    if (!view) return;

    setEditing(true);

    try {
      const selection = view.state.selection.main;

      const editedCode = await editSelectedCode(
        selectedCode,
        instruction
      );

      view.dispatch({
        changes: {
          from: selection.from,
          to: selection.to,
          insert: editedCode,
        },
      });

      const newCode = view.state.doc.toString();
      updateFileContent(newCode);

      setQuickEditOpen(false);
      setInstruction("");
      setSelectedCode("");
    } catch (err) {
      console.log(err);
      alert("AI edit failed");
    }

    setEditing(false);
  }

  return (
    <div className="code-editor-wrap">
      <CodeMirror
        value={content || ""}
        height="100%"
        theme={oneDark}
        extensions={getLanguage(activeFile)}
        onCreateEditor={(view) => {
          editorRef.current = view;
        }}
        onChange={(value) => updateFileContent(value)}
        onKeyDown={(e) => {
          if (e.key === "Tab" && suggestion) {
            e.preventDefault();
            acceptSuggestion();
          }

          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
            e.preventDefault();
            e.stopPropagation();
            openQuickEdit();
          }
        }}
      />

      {suggestion && (
        <div
          style={{
            position: "absolute",
            bottom: "14px",
            right: "20px",
            background: "rgba(20,20,20,0.9)",
            border: "1px solid #333",
            color: "#999",
            padding: "8px 12px",
            borderRadius: "8px",
            fontSize: "13px",
            zIndex: 20,
          }}
        >
          Ghost suggestion: <span style={{ color: "#fff" }}>{suggestion}</span>{" "}
          <b>Tab</b>
        </div>
      )}

      {quickEditOpen && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: "420px",
              background: "#0b0614",
              border: "1px solid #7c3aed",
              borderRadius: "16px",
              padding: "18px",
              boxShadow: "0 0 40px rgba(124,58,237,0.45)",
            }}
          >
            <h3 style={{ marginBottom: "10px", color: "white" }}>
              Sentinal Quick Edit
            </h3>

            <pre
              style={{
                maxHeight: "120px",
                overflow: "auto",
                background: "#05020a",
                color: "#bda8ff",
                padding: "10px",
                borderRadius: "10px",
                fontSize: "12px",
              }}
            >
              {selectedCode}
            </pre>

            <input
              autoFocus
              placeholder="Example: make uppercase / add comment / wrap in console"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyQuickEdit();
                if (e.key === "Escape") setQuickEditOpen(false);
              }}
              style={{
                width: "100%",
                marginTop: "12px",
                padding: "12px",
                borderRadius: "10px",
                border: "1px solid #3b245f",
                background: "#12091f",
                color: "white",
                outline: "none",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "14px",
              }}
            >
              <button onClick={() => setQuickEditOpen(false)}>
                Cancel
              </button>

              <button onClick={applyQuickEdit} disabled={editing}>
                {editing ? "Editing..." : "Apply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}