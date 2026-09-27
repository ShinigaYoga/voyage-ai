import { AIProvider } from "./providers/AIProvider";
import { GeminiProvider } from "./providers/GeminiProvider";
import { GroqProvider } from "./providers/GroqProvider";
import { FallbackProvider } from "./providers/FallbackProvider";
import { MockAIProvider } from "./providers/MockAIProvider";

// Using gemini-3.6-flash as gemini-2.5-flash is restricted for new users
export const GEMINI_MODEL = "gemini-3.6-flash";

function hasValidGeminiKey(value?: string): boolean {
  const key = value?.trim();
  return !!key && key !== "your_gemini_api_key_here" && key.startsWith("AIza");
}

function hasValidGroqKey(value?: string): boolean {
  const key = value?.trim();
  return !!key && key.startsWith("gsk_");
}

export function getAIProvider(): AIProvider {
  // Ensure server-side execution
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (!geminiKey || !hasValidGeminiKey(geminiKey)) {
    console.warn(
      "[VoyageAI Config] GEMINI_API_KEY is missing or invalid. Falling back to MockAIProvider."
    );
    return new MockAIProvider();
  }

  const validGeminiKey = geminiKey.trim();
  const geminiProvider = new GeminiProvider(validGeminiKey);

  if (!groqKey || !hasValidGroqKey(groqKey)) {
    console.warn("[VoyageAI Config] GROQ_API_KEY is missing or invalid. Running with Gemini only (no fallback).");
    return geminiProvider;
  }

  const validGroqKey = groqKey.trim();
  const groqProvider = new GroqProvider(validGroqKey);

  return new FallbackProvider(geminiProvider, groqProvider);
}
