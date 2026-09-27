import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function testGemini() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Hello, world!"
    });
    console.log("Success:", res.text);
  } catch (e: any) {
    console.error("Failed:", e.message);
  }
}

testGemini().catch(console.error);
