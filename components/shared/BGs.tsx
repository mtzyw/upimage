export function BG1() {
  return (
    <div className="fixed inset-0 z-[-1] h-full w-full bg-gradient-to-br from-purple-900 via-slate-900 to-slate-800">
      {/* Subtle gradient overlays for depth */}
      <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_800px_at_20%_30%,rgba(147,51,234,0.1),transparent)]"></div>
      <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_600px_at_80%_70%,rgba(79,70,229,0.08),transparent)]"></div>
    </div>
  );
}
