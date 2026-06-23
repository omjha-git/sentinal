import { useParams } from "react-router-dom";
import IDELayout from "../components/IDELayout";

export default function ProjectIDE() {
  const { projectId } = useParams();

  return <IDELayout projectId={projectId} />;
}