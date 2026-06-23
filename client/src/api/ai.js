import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export const getAISuggestion = async (code) => {
  const res = await axios.post(`${API}/api/ai/suggest`, {
    code,
  });

  return res.data.suggestion;
};