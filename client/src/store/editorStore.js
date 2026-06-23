import { create } from "zustand";

export const useEditorStore = create((set) => ({
  files: [],
  activeFile: null,
  openTabs: [],

  setFiles: (files) => set({ files }),

  openFile: (file) =>
    set((state) => ({
      activeFile: file.name,
      openTabs: state.openTabs.includes(file.name)
        ? state.openTabs
        : [...state.openTabs, file.name],
    })),

  setActiveFile: (fileName) =>
    set({
      activeFile: fileName,
    }),

  closeTab: (fileName) =>
    set((state) => {
      const updatedTabs = state.openTabs.filter((tab) => tab !== fileName);

      return {
        openTabs: updatedTabs,
        activeFile:
          state.activeFile === fileName
            ? updatedTabs[0] || null
            : state.activeFile,
      };
    }),

  updateFileContent: (fileName, content) =>
    set((state) => ({
      files: state.files.map((file) =>
        file.name === fileName
          ? { ...file, content }
          : file
      ),
    })),
}));