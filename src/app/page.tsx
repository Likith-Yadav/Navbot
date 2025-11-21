import { VoiceAssistant } from "@/components/voice-assistant";

// ... existing imports

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <VoiceAssistant />
      <div className="mx-auto flex max-w-6xl flex-col gap-20 px-6 pb-20 pt-24 md:pb-32 lg:px-12">
        {/* ... existing content ... */}
      </div>
    </div>
  );
}
