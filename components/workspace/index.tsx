import ImageProcessor from "./ImageProcessor";
import { BG1 } from "@/components/shared/BGs";

export default function WorkspaceComponent() {
  return (
    <div className="min-h-screen relative">
      <BG1 />
      <div className="relative z-10">
        <ImageProcessor />
      </div>
    </div>
  );
}