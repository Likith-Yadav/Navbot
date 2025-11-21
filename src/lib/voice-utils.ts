export function speak(text: string, onEnd?: () => void) {
    if (!("speechSynthesis" in window)) {
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
    onError?: (error: any) => void
) {
    const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
        console.warn("Speech recognition not supported");
        onError?.("Speech recognition not supported");
        return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        onResult(text);
    };

    recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        onError?.(event.error);
    };

    recognition.start();
    return recognition;
}
