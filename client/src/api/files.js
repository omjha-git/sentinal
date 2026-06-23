import axios from "axios";

const API = "http://localhost:3000";

export const getProjectFiles = async (projectId) => {
  const res = await axios.get(`${API}/api/projects/${projectId}/files`);
  return res.data.files;
};

export const saveProjectFiles = async (projectId, files) => {
  const res = await axios.patch(`${API}/api/projects/${projectId}/files`, {
    files,
  });

  return res.data;
};

export const getAISuggestion = async (code) => {
  const res = await axios.post(`${API}/api/ai/suggest`, {
    code,
  });

  return res.data.suggestion;
};

export const editSelectedCode = async (selectedCode, instruction) => {
  const res = await axios.post(`${API}/api/ai/edit`, {
    selectedCode,
    instruction,
  });

  return res.data.editedCode;
};