import { AIProvider } from "./providers/AIProvider";
import { GeminiProvider } from "./providers/GeminiProvider";
import { GroqProvider } from "./providers/GroqProvider";
import { FallbackProvider } from "./providers/FallbackProvider";
import { MockAIProvider } from "./providers/MockAIProvider";

// Using gemini-3.6-flash as gemini-2.5-flash is restricted for new users
export const GEMINI_MODEL = "gemini-3.6-flash";

export function getAIProvider(): AIProvider {
  // Ensure server-side execution
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (!geminiKey || geminiKey.trim() === "" || geminiKey === "your_gemini_api_key_here") {
    console.warn(
      "[VoyageAI Config] GEMINI_API_KEY is not set in environment variables. Falling back to MockAIProvider."
    );
    return new MockAIProvider();
  }

  const geminiProvider = new GeminiProvider(geminiKey);

  if (!groqKey || groqKey.trim() === "") {
    console.warn("[VoyageAI Config] GROQ_API_KEY is not set. Running with Gemini only (no fallback).");
    return geminiProvider;
  }

  const groqProvider = new GroqProvider(groqKey);
  
  return new FallbackProvider(geminiProvider, groqProvider);
}
