"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { speak, startListening } from "@/lib/voice-utils";
import { processVoiceCommand } from "@/app/actions/gemini";

type AssistantState =
    | "IDLE"
    | "GREETING"
    | "LISTENING_NAME"
    | "CONFIRMING_NAME"
    | "ASKING_DESTINATION"
    | "LISTENING_DESTINATION"
    | "REDIRECTING";

export function VoiceAssistant() {
    const router = useRouter();
    const [state, setState] = useState<AssistantState>("IDLE");
    const [transcript, setTranscript] = useState("");
    const [userName, setUserName] = useState("");
    const hasStarted = useRef(false);

    const startFlow = () => {
        if (hasStarted.current) return;
        hasStarted.current = true;
        setState("GREETING");
    };

    useEffect(() => {
        if (state === "GREETING") {
            speak("Hi there! Welcome to Central Innovation Campus. I’m your navigation assistant. What’s your name?", () => {
                setState("LISTENING_NAME");
            });
        } else if (state === "LISTENING_NAME") {
            startListening(
                async (text) => {
                    setTranscript(text);
                    const name = await processVoiceCommand(text, "NAME");
                    setUserName(name);
                    setState("CONFIRMING_NAME");
                },
                () => {
                    // On error or no speech, maybe prompt again or just wait
                    // For now, let's just stay in listening state or reset
                }
            );
        } else if (state === "CONFIRMING_NAME") {
            speak(`Nice to meet you, ${userName}. Where would you like to go?`, () => {
                setState("LISTENING_DESTINATION");
            });
        } else if (state === "LISTENING_DESTINATION") {
            setTranscript("");
            startListening(
                async (text) => {
                    setTranscript(text);
                    const destination = await processVoiceCommand(text, "DESTINATION");
                    setTranscript(destination); // Update transcript to show refined destination
                    setState("REDIRECTING");
                },
                () => {
                    // On error
                }
            );
        } else if (state === "REDIRECTING") {
            speak(`Okay, taking you to ${transcript}.`, () => {
                router.push(`/navigate?destination=${encodeURIComponent(transcript)}`);
            });
        }
    }, [state, userName, transcript, router]);

    if (state === "IDLE") {
        return (
            <button
                onClick={startFlow}
                className="fixed bottom-8 right-8 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg shadow-brand-500/40 transition hover:scale-105 hover:bg-brand-400"
            >
                <Mic className="h-8 w-8" />
            </button>
        );
    }

    return (
        <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4">
            <div className="max-w-xs rounded-2xl border border-white/10 bg-slate-900/90 p-4 text-white shadow-xl backdrop-blur">
                <p className="text-sm font-medium text-brand-200 mb-1">Assistant</p>
                <p className="text-lg">
                    {state === "GREETING" && "Saying hello..."}
                    {state === "LISTENING_NAME" && "Listening for your name..."}
                    {state === "CONFIRMING_NAME" && `Hi, ${userName}!`}
                    {state === "ASKING_DESTINATION" && "Where to?"}
                    {state === "LISTENING_DESTINATION" && "Listening for destination..."}
                    {state === "REDIRECTING" && `Navigating to ${transcript}...`}
                </p>
                {transcript && state.includes("LISTENING") && (
                    <p className="mt-2 text-sm text-slate-400 italic">"{transcript}"</p>
                )}
            </div>

            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg shadow-brand-500/40 animate-pulse">
                {state.includes("LISTENING") ? (
                    <Mic className="h-8 w-8" />
                ) : (
                    <Volume2 className="h-8 w-8" />
                )}
            </div>
        </div>
    );
}
