export function speak(text: string, onEnd?: () => void) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        console.warn("Speech synthesis not supported");
        onEnd?.();
        return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to select a natural sounding voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
        voices.find((v) => v.name.includes("Google") && v.lang.startsWith("en")) ||
        voices.find((v) => v.lang.startsWith("en"));

    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }

    utterance.onend = () => {
        onEnd?.();
    };

    utterance.onerror = (e) => {
        console.error("Speech synthesis error:", e);
        onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
}

export function startListening(
    onResult: (text: string) => void,
    onError?: (error: string) => void
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

    recognition.onresult = (event: SpeechRecognitionEvent) => {
        const text = event.results[0][0].transcript;
        onResult(text);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error);
        let errorMessage = "Unknown error";
        switch (event.error) {
            case "network":
                errorMessage = "Network error. Please check your connection.";
                break;
            case "not-allowed":
            case "service-not-allowed":
                errorMessage = "Microphone access denied.";
                break;
            case "no-speech":
                errorMessage = "No speech detected.";
                break;
            case "aborted":
                errorMessage = "Listening session was interrupted.";
                break;
            default:
                errorMessage = event.error;
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
