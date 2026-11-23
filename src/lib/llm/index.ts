import "server-only";
import { createGeminiProvider } from "./gemini";
import { createGroqProvider } from "./groq";
import type { LlmProvider } from "./types";

export * from "./types";

// Un único punto para elegir el modelo: cambiar de proveedor es cambiar LLM_PROVIDER.
export function getLlm(): LlmProvider {
  const provider = process.env.LLM_PROVIDER ?? "gemini";

  switch (provider) {
    case "gemini": {
      const key = process.env.GEMINI_API_KEY;
      if (!key) throw new Error("Falta GEMINI_API_KEY");
      return createGeminiProvider(key);
    }
    case "groq": {
      const key = process.env.GROQ_API_KEY;
      if (!key) throw new Error("Falta GROQ_API_KEY");
      return createGroqProvider(key);
    }
    default:
      throw new Error(`LLM_PROVIDER desconocido: ${provider}`);
  }
}
