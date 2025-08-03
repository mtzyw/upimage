import ImageProcessor from "./ImageProcessor";
import { BG1 } from "@/components/shared/BGs";

export default function WorkspaceComponent() {
  return (
    <div className="w-full h-screen max-h-screen overflow-hidden relative">
      <BG1 />
      <div className="relative z-10 h-full">
        <ImageProcessor />
      </div>
    </div>
  );
}