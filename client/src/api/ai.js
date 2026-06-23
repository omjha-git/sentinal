import axios from "axios";

const API = "http://localhost:3000";

export const getAISuggestion = async (code) => {
  const res = await axios.post(`${API}/api/ai/suggest`, {
    code,
  });

  return res.data.suggestion;
};