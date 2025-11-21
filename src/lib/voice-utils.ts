function pickFemaleVoice(voices: SpeechSynthesisVoice[]) {
    const namePriority = ["Samantha", "Google US English", "Google UK English Female", "Victoria", "Karen", "Tessa"];
    const femaleMatch = voices.find((v) => /female/i.test(v.name) || /female/i.test(v.voiceURI));
    const prioritized = namePriority
        .map((n) => voices.find((v) => v.name.includes(n)))
        .find((v) => Boolean(v));
    return prioritized ?? femaleMatch ?? voices.find((v) => v.lang.startsWith("en"));
}

async function loadVoices(): Promise<SpeechSynthesisVoice[]> {
    const synth = window.speechSynthesis;
    const existing = synth.getVoices();
    if (existing && existing.length > 0) return existing;

    return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(synth.getVoices()), 400);
        synth.onvoiceschanged = () => {
            clearTimeout(timer);
            resolve(synth.getVoices());
        };
    });
}

export function speak(text: string, onEnd?: () => void) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        console.warn("Speech synthesis not supported");
        onEnd?.();
        return;
    }

    try {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onend = () => {
            onEnd?.();
        };

        utterance.onerror = (e) => {
            console.warn("Speech synthesis error:", e?.error ?? e);
            onEnd?.();
        };

        // Try to select a natural sounding voice, then speak once
        loadVoices()
            .then((voices) => {
                const preferredVoice = pickFemaleVoice(voices);
                if (preferredVoice) {
                    utterance.voice = preferredVoice;
                }
            })
            .finally(() => {
                window.speechSynthesis.speak(utterance);
            });
    } catch (e) {
        console.warn("Unable to play speech:", e);
        onEnd?.();
    }
}

export function startListening(
    onResult: (text: string) => void,
    onError?: (error: string) => void,
    options?: { keepAlive?: boolean }
) {
    if (typeof window === "undefined") {
        onError?.("Speech recognition is only available in the browser.");
        return null;
    }

    if (!window.isSecureContext && window.location.hostname !== "localhost") {
        const message = "Speech recognition requires HTTPS or localhost.";
        console.warn(message);
        onError?.(message);
        return null;
    }

    if (!navigator.onLine) {
        const message = "Speech recognition needs an active internet connection.";
        console.warn(message);
        onError?.(message);
        return null;
    }

    const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
        const message = "Speech recognition not supported in this browser.";
        console.warn(message);
        onError?.(message);
        return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    let retried = false;
    let stopped = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
        const text = event.results[0][0].transcript;
        onResult(text);
    };

    recognition.onend = () => {
        if (options?.keepAlive && !stopped) {
            try {
                recognition.start();
            } catch (_) {
                // ignore restart errors
            }
        }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.warn("Speech recognition error:", event.error);
        let errorMessage = "Unknown error";
        const retryable = event.error === "network" || event.error === "no-speech";

        // For keepAlive flows, try to silently recover without surfacing an error
        if (options?.keepAlive) {
            if ((event.error === "aborted" || event.error === "network" || event.error === "no-speech") && navigator.onLine) {
                try {
                    recognition.stop();
                    stopped = false;
                    recognition.start();
                    return;
                } catch (_) {
                    // ignore restart errors
                }
            } else if (event.error === "aborted") {
                // don't surface aborted in keepAlive
                return;
            }
        } else if (retryable && !retried && navigator.onLine) {
            retried = true;
            setTimeout(() => {
                try {
                    recognition.stop();
                    recognition.start();
                } catch (err) {
                    // ignore restart errors
                }
            }, 500);
            return;
        }

        switch (event.error) {
        case "network":
            errorMessage = "Mic needs network. Please tap the mic again or type.";
            break;
        case "not-allowed":
        case "service-not-allowed":
            errorMessage = "Microphone access denied.";
            break;
        case "no-speech":
            errorMessage = "We couldn't hear you.";
            break;
        case "aborted":
            errorMessage = "Listening was interrupted.";
            break;
        default:
            errorMessage = event.error;
        }
        try {
            stopped = true;
            recognition.abort();
        } catch (_) {
            // ignore
        }
        onError?.(errorMessage);
    };

    try {
        recognition.start();
    } catch (error) {
        console.error("Failed to start speech recognition:", error);
        onError?.("Unable to start speech recognition. Please try again.");
        return null;
    }

    return recognition;
}
