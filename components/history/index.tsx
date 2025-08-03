import HistoryViewer from "./HistoryViewer";
import { BG1 } from "@/components/shared/BGs";

export default function HistoryComponent() {
  return (
    <div className="w-full h-[calc(100vh-72px)] max-h-[calc(100vh-72px)] overflow-hidden relative">
      <BG1 />
      <div className="relative z-10 h-full">
        <HistoryViewer />
      </div>
    </div>
  );
}