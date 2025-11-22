"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Mic, Send, Loader2 } from "lucide-react";
import { speak, startListening } from "@/lib/voice-utils";
import { processVoiceCommand } from "@/app/actions/gemini";
import type { MapDTO } from "@/types/maps";

type AssistantState =
    | "IDLE"
    | "GREETING"
    | "LISTENING_NAME"
    | "CONFIRMING_NAME"
    | "ASKING_DESTINATION"
    | "LISTENING_DESTINATION"
    | "REDIRECTING";

type DestinationSelection = {
    destinationText: string;
    mapId?: string;
    routeId?: string;
};

function extractNameLocally(text: string) {
    const cleaned = text.replace(/[^a-zA-Z\s]/g, " ").trim();
    const match = cleaned.match(/(?:i am|i'm|my name is|this is)\s+([a-zA-Z]+)/i);
    if (match) return match[1];
    const firstWord = cleaned.split(/\s+/)[0];
    return firstWord || cleaned;
}

export function VoiceAssistant() {
    const router = useRouter();
    const [state, setState] = useState<AssistantState>("IDLE");
    const [transcript, setTranscript] = useState("");
    const [userName, setUserName] = useState("");
    const [maps, setMaps] = useState<MapDTO[]>([]);
    const [selectedMap, setSelectedMap] = useState<MapDTO | null>(null);
    const [inputText, setInputText] = useState("");
    const [isListening, setIsListening] = useState(false);
    const hasStarted = useRef(false);
    const recognitionRef = useRef<any>(null);

    const stopListening = useCallback(() => {
        recognitionRef.current?.abort();
        recognitionRef.current = null;
    }, []);

    const resolveDestination = useCallback(
        (raw: string): DestinationSelection => {
            const text = raw.trim();
            if (!selectedMap) {
                return { destinationText: text };
            }

            // All places / tour request
            if (/all|tour|whole|entire/i.test(text)) {
                const tourRoute =
                    selectedMap.routes.find((r) => /tour/i.test(r.name)) ??
                    selectedMap.routes
                        .slice()
                        .sort((a, b) => (b.waypoints?.length ?? 0) - (a.waypoints?.length ?? 0))[0] ??
                    selectedMap.routes.find((r) => r.isDefault) ??
                    selectedMap.routes[0];
                return {
                    destinationText: tourRoute?.name ?? "Full campus tour",
                    mapId: selectedMap.id,
                    routeId: tourRoute?.id,
                };
            }

            // Try match route by name
            const routeMatch = selectedMap.routes.find((route) =>
                route.name.toLowerCase().includes(text.toLowerCase()),
            );
            if (routeMatch) {
                return { destinationText: routeMatch.name, mapId: selectedMap.id, routeId: routeMatch.id };
            }

            // Try match pins
            const pinMatch = selectedMap.locationPins.find((pin) =>
                pin.name.toLowerCase().includes(text.toLowerCase()),
            );
            if (pinMatch) {
                return { destinationText: pinMatch.name, mapId: selectedMap.id };
            }

            return { destinationText: text, mapId: selectedMap.id };
        },
        [selectedMap],
    );

    useEffect(() => {
        return () => {
            stopListening();
        };
    }, [stopListening]);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/maps?include=full", { cache: "no-store" });
                const body = await res.json();
                setMaps(body.data ?? []);
                setSelectedMap(body.data?.[0] ?? null);
            } catch (error) {
                console.error("Unable to load maps for assistant", error);
            }
        })();
    }, []);


    const startFlow = () => {
        if (hasStarted.current) return;
        hasStarted.current = true;
        // Pre-load stored name if present
        const storedName = typeof window !== "undefined" ? localStorage.getItem("navUserName") : null;
        if (storedName) setUserName(storedName);
        setState("GREETING");
    };

    const handleManualSubmit = async () => {
        if (!inputText.trim()) return;
        stopListening();
        setIsListening(false);

        if (state === "LISTENING_NAME" || state === "GREETING") {
            setTranscript(`You: ${inputText}`);
            const name = await processVoiceCommand(inputText, "NAME");
            if (name && typeof window !== "undefined") localStorage.setItem("navUserName", name);
            setUserName(name);
            setInputText("");
            setState("CONFIRMING_NAME");
        } else if (state === "LISTENING_DESTINATION" || state === "CONFIRMING_NAME" || state === "ASKING_DESTINATION") {
            setTranscript(`You: ${inputText}`);
            const destination = await processVoiceCommand(inputText, "DESTINATION");
            const selection = resolveDestination(destination);
            setInputText("");
            setState("REDIRECTING");
            setTimeout(() => {
                const params = new URLSearchParams();
                params.set("destination", selection.destinationText);
                if (selection.mapId) params.set("mapId", selection.mapId);
                if (selection.routeId) params.set("routeId", selection.routeId);
                if (userName) params.set("user", userName);
                router.push(`/navigate?${params.toString()}`);
            }, 1200);
        }
    };

    useEffect(() => {
        if (state !== "LISTENING_NAME" && state !== "LISTENING_DESTINATION") {
            stopListening();
        }

        if (state === "GREETING") {
            const routeSnippet =
                selectedMap?.routes?.length
                    ? `I can guide you through ${selectedMap.routes.length} routes on ${selectedMap.name}.`
                    : "I can help you navigate the campus.";

            if (userName) {
                const greeting = `Welcome back, ${userName}. ${routeSnippet} Tell me where you want to go or say "campus tour" for the full route.`;
                setTranscript(`Assistant: ${greeting}`);
                speak(greeting, () => setState("LISTENING_DESTINATION"));
            } else {
                const greeting = `Hi there! Welcome to ${selectedMap?.name ?? "campus"}. ${routeSnippet} What's your name?`;
                setTranscript(`Assistant: ${greeting}`);
                speak(greeting, () => {
                    setState("LISTENING_NAME");
                });
            }
        } else if (state === "LISTENING_NAME") {
            setIsListening(true);
            (async () => {
                try {
                    if (navigator.mediaDevices?.getUserMedia) {
                        await navigator.mediaDevices.getUserMedia({ audio: true });
                    }
                    recognitionRef.current = startListening(
                        async (text) => {
                            setIsListening(false);
                            stopListening();
                            setTranscript(`You: ${text}`);
                            const parsed = await processVoiceCommand(text, "NAME");
                            const cleaned = parsed && parsed !== "UNKNOWN" ? extractNameLocally(parsed) : extractNameLocally(text);
                            const name = cleaned;
                            if (name && typeof window !== "undefined") localStorage.setItem("navUserName", name);
                            setUserName(name);
                            setState("CONFIRMING_NAME");
                        },
                        (err) => {
                            setIsListening(false);
                            stopListening();
                            setTranscript(`I couldn't catch that. Please type your response or tap the mic again. (${err})`);
                        },
                        { keepAlive: true }
                    );
                } catch (error) {
                    setIsListening(false);
                    stopListening();
                    setTranscript("Microphone blocked. Please allow mic access and tap the mic again.");
                }
            })();
        } else if (state === "CONFIRMING_NAME") {
            setIsListening(false);
            const routeHint =
                selectedMap?.routes?.length
                    ? `You can say a building name, or pick a fixed route like ${selectedMap.routes
                          .slice(0, 2)
                          .map((r) => r.name)
                          .join(" or ")}. Say "campus tour" to visit all and return to the main gate.`
                    : "Tell me your destination.";
            const confirmation = `Nice to meet you, ${userName}. ${routeHint}`;
            setTranscript(`Assistant: ${confirmation}`);
            speak(confirmation, () => {
                setState("LISTENING_DESTINATION");
            });
        } else if (state === "LISTENING_DESTINATION") {
            setIsListening(true);
            (async () => {
                try {
                    if (navigator.mediaDevices?.getUserMedia) {
                        await navigator.mediaDevices.getUserMedia({ audio: true });
                    }
                    recognitionRef.current = startListening(
                        async (text) => {
                            setIsListening(false);
                            stopListening();
                            setTranscript(`You: ${text}`);
                            const destination = await processVoiceCommand(text, "DESTINATION");
                            const selection = resolveDestination(destination);
                            setState("REDIRECTING");
                            const redirect = `Okay, taking you to ${selection.destinationText}.`;
                            setTranscript(`Assistant: ${redirect}`);
                            speak(redirect, () => {
                                const params = new URLSearchParams();
                                params.set("destination", selection.destinationText);
                                if (selection.mapId) params.set("mapId", selection.mapId);
                                if (selection.routeId) params.set("routeId", selection.routeId);
                                if (userName) params.set("user", userName);
                                router.push(`/navigate?${params.toString()}`);
                            });
                        },
                        (err) => {
                            setIsListening(false);
                            stopListening();
                            setTranscript(`I couldn't hear that. Please type your destination or tap the mic again. (${err})`);
                        },
                        { keepAlive: true }
                    );
                } catch (error) {
                    setIsListening(false);
                    stopListening();
                    setTranscript("Microphone blocked. Please allow mic access and tap the mic again.");
                }
            })();
        }
    }, [state, userName, router, stopListening, selectedMap, resolveDestination]);

    if (state === "IDLE") {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
                <div className="text-center">
                    <h1 className="mb-8 text-5xl font-bold text-white">
                        MVJ Navigation Assistant
                    </h1>
                    <p className="mb-12 text-xl text-slate-300">
                        Your AI-powered campus guide
                    </p>
                    <button
                        onClick={startFlow}
                        className="group relative flex h-32 w-32 mx-auto items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-2xl shadow-brand-500/50 transition-all duration-300 hover:scale-110 hover:shadow-brand-500/70"
                    >
                        <div className="absolute inset-0 rounded-full bg-brand-400 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-50"></div>
                        <Mic className="h-16 w-16 relative z-10" />
                    </button>
                    <p className="mt-8 text-sm text-slate-400">Click to start</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
            <div className="w-full max-w-2xl">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h2 className="text-3xl font-bold text-white mb-2">
                        MVJ Navigation Assistant
                    </h2>
                    <p className="text-slate-400">
                        {state === "GREETING" && "Initializing..."}
                        {state === "LISTENING_NAME" && "Listening for your name..."}
                        {state === "CONFIRMING_NAME" && `Welcome, ${userName}!`}
                        {state === "LISTENING_DESTINATION" && "Where would you like to go?"}
                        {state === "REDIRECTING" && "Navigating..."}
                    </p>
                </div>

                {/* Microphone Animation */}
                <div className="mb-8 flex justify-center">
                    <div className="relative">
                        {/* Outer pulse rings */}
                        {isListening && (
                            <>
                                <div className="absolute inset-0 -m-8 animate-ping rounded-full bg-brand-400 opacity-20"></div>
                                <div className="absolute inset-0 -m-4 animate-pulse rounded-full bg-brand-400 opacity-30"></div>
                            </>
                        )}

                        {/* Main microphone button */}
                        <div className={`relative flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 shadow-2xl transition-all duration-300 ${isListening ? "shadow-brand-500/70 scale-110" : "shadow-brand-500/50"
                            }`}>
                            <div className="absolute inset-0 rounded-full bg-brand-400 opacity-50 blur-2xl"></div>
                            {state === "REDIRECTING" ? (
                                <Loader2 className="h-20 w-20 animate-spin text-white relative z-10" />
                            ) : (
                                <Mic className={`h-20 w-20 text-white relative z-10 ${isListening ? "animate-pulse" : ""}`} />
                            )}
                        </div>
                    </div>
                </div>

                {/* Transcript Display */}
                <div className="mb-6 rounded-2xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-sm">
                    <p className="text-sm font-medium text-brand-300 mb-3">Transcript</p>
                    <div className="min-h-[80px] max-h-[200px] overflow-y-auto">
                        {transcript ? (
                            <p className="text-lg leading-relaxed text-white font-light">
                                {transcript}
                            </p>
                        ) : (
                            <p className="text-slate-500 italic">
                                Waiting for response...
                            </p>
                        )}
                    </div>
                </div>

                {/* Text Input */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 backdrop-blur-sm">
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                            placeholder={
                                state === "LISTENING_NAME"
                                    ? "Type your name..."
                                    : "Type your destination..."
                            }
                            className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                            disabled={state === "REDIRECTING" || state === "GREETING"}
                        />
                        <button
                            onClick={handleManualSubmit}
                            disabled={!inputText.trim() || state === "REDIRECTING" || state === "GREETING"}
                            className="bg-gradient-to-br from-brand-400 to-brand-600 p-3 rounded-xl hover:from-brand-500 hover:to-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
                        >
                            <Send className="h-6 w-6 text-white" />
                        </button>
                    </div>
                    <p className="mt-3 text-xs text-slate-500 text-center">
                        Speak or type your response
                    </p>
                </div>
            </div>
        </div>
    );
}
