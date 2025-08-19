import ImageProcessor from "./ImageProcessor";
import { BG1 } from "@/components/shared/BGs";

interface WorkspaceComponentProps {
  defaultTab?: string;
}

export default function WorkspaceComponent({ defaultTab }: WorkspaceComponentProps) {
  return (
    <div className="w-full h-[calc(100vh-72px)] max-h-[calc(100vh-72px)] overflow-hidden relative">
      <BG1 />
      <div className="relative z-10 h-full">
        <ImageProcessor defaultTab={defaultTab} />
      </div>
    </div>
  );
}