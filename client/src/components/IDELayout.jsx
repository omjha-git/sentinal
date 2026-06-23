import Editor from "@monaco-editor/react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { Save, Play, Folder, Code2, Eye } from "lucide-react";

export default function IDELayout({ projectId }) {
  return (
    <div className="h-screen w-screen bg-[#0b1020] text-white flex flex-col">
      <nav className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-[#0f172a]">
        <div className="flex items-center gap-3">
          <Code2 size={22} className="text-blue-400" />
          <div>
            <h1 className="font-semibold">Sentinal IDE</h1>
            <p className="text-xs text-gray-400">Project: {projectId}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 flex gap-2 items-center">
            <Save size={16} /> Save
          </button>
          <button className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 flex gap-2 items-center">
            <Play size={16} /> Run
          </button>
        </div>
      </nav>

      <PanelGroup direction="horizontal" className="flex-1">
        <Panel defaultSize={20} minSize={15}>
          <div className="h-full bg-[#020617] border-r border-white/10 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold mb-4">
              <Folder size={16} /> Files
            </div>

            <div className="space-y-2 text-sm text-gray-300">
              <p>📄 App.jsx</p>
              <p>📄 index.css</p>
              <p>📁 components</p>
              <p className="pl-4">📄 IDELayout.jsx</p>
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="w-1 bg-white/10 hover:bg-blue-500" />

        <Panel defaultSize={50} minSize={30}>
          <div className="h-full bg-[#0b1020]">
            <div className="h-10 border-b border-white/10 px-4 flex items-center gap-2 text-sm">
              <Code2 size={16} /> App.jsx
            </div>

            <Editor
              height="calc(100% - 40px)"
              defaultLanguage="javascript"
              theme="vs-dark"
              defaultValue={`function App() {
  return <h1>Hello Sentinal</h1>;
}

export default App;`}
            />
          </div>
        </Panel>

        <PanelResizeHandle className="w-1 bg-white/10 hover:bg-blue-500" />

        <Panel defaultSize={30} minSize={20}>
          <div className="h-full bg-white text-black">
            <div className="h-10 border-b px-4 flex items-center gap-2 text-sm bg-gray-100">
              <Eye size={16} /> Preview
            </div>

            <iframe
              title="preview"
              className="w-full h-[calc(100%-40px)]"
              srcDoc={`<html><body><h1>Hello Sentinal Preview</h1></body></html>`}
            />
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}