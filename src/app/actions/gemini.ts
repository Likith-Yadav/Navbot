"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function processVoiceCommand(text: string, context: "NAME" | "DESTINATION" | "GENERAL") {
    if (!process.env.GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY is not set");
        return text; // Fallback to raw text if key is missing
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        let prompt = "";
        if (context === "NAME") {
            prompt = `Extract the person's name from this text: "${text}". Return ONLY the name as a single string. Do not include punctuation, "The name is", or any other text. If no name is found, return "UNKNOWN". Example: "My name is Likith" -> "Likith".`;
        } else if (context === "DESTINATION") {
            prompt = `Extract the destination from this text: "${text}". Return ONLY the destination name. If no destination is found, return "UNKNOWN". Example: "Take me to the cafeteria" -> "Cafeteria".`;
        } else {
            prompt = `Analyze this text: "${text}". Return a JSON object with { intent: "navigate" | "identify" | "unknown", entity: string | null }.`;
        }

        const result = await model.generateContent(prompt);
        const response = result.response;
        let output = response.text().trim();

        // Cleanup potential markdown code blocks if Gemini adds them
        output = output.replace(/^```json\s*/, "").replace(/\s*```$/, "");

        // Additional cleanup for simple text responses
        if (context === "NAME" || context === "DESTINATION") {
            output = output.replace(/["'.]/g, "").trim(); // Remove quotes and periods
        }

        return output;
    } catch (error) {
        console.error("Gemini API Error:", error);
        return text; // Fallback
    }
}
