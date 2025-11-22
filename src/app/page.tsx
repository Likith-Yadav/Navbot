"use client";

import { useState } from "react";
import { VoiceAssistant } from "@/components/voice-assistant";
import { Navigation, Map, Mic, Sparkles, ArrowRight, MapPin } from "lucide-react";

export default function Home() {
  const [showAssistant, setShowAssistant] = useState(false);

  if (showAssistant) {
    return <VoiceAssistant />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12">
        {/* Logo/Badge */}
        <div className="mb-8 flex items-center gap-3 rounded-full border border-brand-400/30 bg-brand-500/10 px-6 py-3 backdrop-blur-sm">
          <Sparkles className="h-5 w-5 text-brand-300" />
          <span className="text-sm font-medium text-brand-200">AI-Powered Navigation</span>
        </div>

        {/* Hero heading */}
        <h1 className="mb-6 text-center text-5xl font-bold leading-tight sm:text-6xl md:text-7xl lg:text-8xl">
          <span className="bg-gradient-to-r from-white via-brand-100 to-brand-200 bg-clip-text text-transparent">
            Navigation
          </span>
          <br />
          <span className="text-slate-300">Assistant</span>
        </h1>

        {/* Subtitle */}
        <p className="mb-12 max-w-2xl text-center text-lg text-slate-400 sm:text-xl">
          Your intelligent campus guide powered by voice. Navigate effortlessly with real-time directions and interactive maps.
        </p>

        {/* CTA Button */}
        <button
          onClick={() => setShowAssistant(true)}
          className="group relative mb-16 flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-8 py-5 text-lg font-semibold text-white shadow-2xl shadow-brand-500/50 transition-all duration-300 hover:scale-105 hover:shadow-brand-500/70 active:scale-95"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-brand-400 to-brand-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
          <Mic className="relative z-10 h-6 w-6" />
          <span className="relative z-10">Start Navigation</span>
          <ArrowRight className="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
        </button>

        {/* Features grid */}
        <div className="grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
          {/* Feature 1 */}
          <div className="group rounded-2xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-sm transition-all duration-300 hover:border-brand-400/30 hover:bg-slate-900/70">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-600/20">
              <Mic className="h-6 w-6 text-brand-300" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Voice Control</h3>
            <p className="text-sm text-slate-400">
              Speak naturally to navigate. Our AI understands your destination and guides you there.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="group rounded-2xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-sm transition-all duration-300 hover:border-brand-400/30 hover:bg-slate-900/70">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-600/20">
              <Map className="h-6 w-6 text-brand-300" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Live Maps</h3>
            <p className="text-sm text-slate-400">
              Real-time GPS tracking with interactive campus maps and highlighted routes.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="group rounded-2xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-sm transition-all duration-300 hover:border-brand-400/30 hover:bg-slate-900/70">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-600/20">
              <Navigation className="h-6 w-6 text-brand-300" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Smart Guidance</h3>
            <p className="text-sm text-slate-400">
              Turn-by-turn directions with audio cues as you approach each waypoint.
            </p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-center">
          <div>
            <div className="mb-1 text-3xl font-bold text-brand-300">26+</div>
            <div className="text-sm text-slate-400">Routes Available</div>
          </div>
          <div className="h-12 w-px bg-white/10"></div>
          <div>
            <div className="mb-1 text-3xl font-bold text-brand-300">Real-time</div>
            <div className="text-sm text-slate-400">GPS Tracking</div>
          </div>
          <div className="h-12 w-px bg-white/10"></div>
          <div>
            <div className="mb-1 text-3xl font-bold text-brand-300">AI</div>
            <div className="text-sm text-slate-400">Voice Assistant</div>
          </div>
        </div>

        {/* Footer link */}
        <div className="mt-16 text-center">
          <a
            href="/admin"
            className="text-sm text-slate-500 transition-colors hover:text-brand-300"
          >
            Admin Dashboard →
          </a>
        </div>
      </div>
    </div>
  );
}
