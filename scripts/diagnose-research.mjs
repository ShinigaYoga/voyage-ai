#!/usr/bin/env node
import fs from "fs";
import path from "path";

// Load .env.local manually
try {
  const envPath = path.resolve(".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [key, ...val] = trimmed.split("=");
        process.env[key.trim()] = val.join("=").trim();
      }
    }
  }
} catch (e) {
  console.error("Failed to load .env.local", e);
}

import { getAIProvider } from "../src/lib/ai/config.js";
import { DestinationResearchService } from "../src/lib/services/destination/DestinationResearchService.js";

async function testDestination(dest) {
  console.log(`\n==============================================`);
  console.log(`TESTING DESTINATION: "${dest}"`);
  console.log(`==============================================`);
  
  const provider = getAIProvider();
  console.log(`Using AI Provider: ${provider.name}`);
  
  const service = new DestinationResearchService(provider);
  try {
    const profile = await service.research(dest);
    console.log(`\n--- RESULT FOR ${dest} ---`);
    console.log(`Destination: ${profile.destination}`);
    console.log(`Quality: ${profile.researchQuality}`);
    console.log(`Notes/Badge: "${profile.notes || 'None'}"`);
    console.log(`Total Attractions: ${profile.attractions.length}`);
    console.log(`Attraction Names:`);
    profile.attractions.forEach((a, i) => {
      console.log(`  ${i + 1}. ${a.name} (${a.category}, pop=${a.popularityScore ?? 'N/A'})`);
    });
  } catch (err) {
    console.error(`Research threw error for ${dest}:`, err);
  }
}

await testDestination("Agra");
await testDestination("Monsaraz");
