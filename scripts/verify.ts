import { getAIProvider } from "../src/lib/ai/config";
import { GeminiProvider } from "../src/lib/ai/providers/GeminiProvider";
import { GroqProvider } from "../src/lib/ai/providers/GroqProvider";
import { FallbackProvider } from "../src/lib/ai/providers/FallbackProvider";
import { AIMessage, AIToolDefinition } from "../src/lib/ai/providers/AIProvider";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const mockTools: AIToolDefinition[] = [
  {
    name: "getWeather",
    description: "Get the current weather for a location",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string" }
      },
      required: ["location"]
    }
  }
];

const mockMessages: AIMessage[] = [
  { role: "user", content: "What is the weather in Tokyo?" }
];

async function verify() {
  console.log("=== 1. VERIFY ENVIRONMENT VARIABLES ===");
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  console.log(`GEMINI_API_KEY present: ${!!geminiKey}`);
  console.log(`GROQ_API_KEY present: ${!!groqKey}`);

  console.log("\n=== 2. VERIFY GEMINI ===");
  if (geminiKey) {
    const gemini = new GeminiProvider(geminiKey);
    try {
      const basicRes = await gemini.chat(mockMessages, []);
      console.log(`Gemini Basic Response finishReason: ${basicRes.finishReason}`);
      console.log(`Gemini Basic Content: ${basicRes.content}`);
      console.log("GEMINI BASIC TEST: PASS");

      const toolRes = await gemini.chat(mockMessages, mockTools);
      console.log(`Gemini Tool Response finishReason: ${toolRes.finishReason}`);
      if (toolRes.toolCalls.length > 0) {
        console.log(`Gemini Tool Call: ${JSON.stringify(toolRes.toolCalls[0])}`);
      } else {
        console.log(`Gemini Tool Content: ${toolRes.content}`);
      }
      console.log("GEMINI TOOL TEST: PASS");
    } catch (e: any) {
      console.error("GEMINI TEST: FAIL", e.message);
    }
  }

  console.log("\n=== 3. VERIFY GROQ ===");
  if (groqKey) {
    const groq = new GroqProvider(groqKey);
    try {
      const res = await groq.chat(mockMessages, mockTools);
      console.log(`Groq response finishReason: ${res.finishReason}`);
      if (res.toolCalls.length > 0) {
        console.log(`Groq Tool Call: ${JSON.stringify(res.toolCalls[0])}`);
      } else {
        console.log(`Groq Content: ${res.content}`);
      }
      console.log("GROQ TEST: PASS");
    } catch (e: any) {
      console.error("GROQ TEST: FAIL", e.message);
    }
  }

  console.log("\n=== 5. VERIFY FALLBACK (Simulate Gemini Failure) ===");
  if (geminiKey && groqKey) {
    // Create a broken Gemini provider (bad key)
    const brokenGemini = new GeminiProvider("invalid_key_to_force_failure");
    const groq = new GroqProvider(groqKey);
    const fallback = new FallbackProvider(brokenGemini, groq);
    
    try {
      const res = await fallback.chat(mockMessages, mockTools);
      console.log(`Fallback response finishReason: ${res.finishReason}`);
      if (res.toolCalls.length > 0) {
        console.log(`Fallback Tool Call: ${JSON.stringify(res.toolCalls[0])}`);
      } else {
        console.log(`Fallback Content: ${res.content}`);
      }
      console.log("FALLBACK TEST: PASS");
    } catch (e: any) {
      console.error("FALLBACK TEST: FAIL", e.message);
    }
  }

  console.log("\n=== 6. VERIFY BOTH PROVIDERS FAIL ===");
  if (geminiKey && groqKey) {
    const brokenGemini = new GeminiProvider("invalid_key");
    const brokenGroq = new GroqProvider("invalid_key");
    const fallback = new FallbackProvider(brokenGemini, brokenGroq);
    try {
      const res = await fallback.chat(mockMessages, mockTools);
      console.log(`Both Fail response: ${res.content}`);
      console.log(`Both Fail finishReason: ${res.finishReason}`);
      if (res.finishReason === "error") {
        console.log("BOTH FAIL TEST: PASS");
      } else {
        console.log("BOTH FAIL TEST: FAIL (Did not return error state)");
      }
    } catch (e: any) {
      console.error("BOTH FAIL TEST: FAIL (Threw exception instead of graceful return)", e.message);
    }
  }
}

verify().catch(console.error);
