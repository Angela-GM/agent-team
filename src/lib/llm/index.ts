import "server-only";
import { createGeminiProvider } from "./gemini";
import { createGroqProvider } from "./groq";
import { LLM_BUDGET_MS, LlmUnavailableError, type GenerateJsonInput, type LlmProvider } from "./types";

export * from "./types";

function create(name: string): LlmProvider | null {
  switch (name) {
    case "gemini":
      return process.env.GEMINI_API_KEY ? createGeminiProvider(process.env.GEMINI_API_KEY) : null;
    case "groq":
      return process.env.GROQ_API_KEY ? createGroqProvider(process.env.GROQ_API_KEY) : null;
    default:
      throw new Error(`Proveedor de LLM desconocido: ${name}`);
  }
}

// Un único punto para elegir el modelo.
// LLM_PROVIDER es el principal (gemini por defecto). Si está saturado o sin cuota,
// se prueba el de respaldo (LLM_FALLBACK, groq por defecto) siempre que tenga clave.
export function getLlm(): LlmProvider {
  const primaryName = process.env.LLM_PROVIDER ?? "gemini";
  const fallbackName = process.env.LLM_FALLBACK ?? (primaryName === "gemini" ? "groq" : "gemini");

  const primary = create(primaryName);
  const fallback = fallbackName !== primaryName ? create(fallbackName) : null;
  const chain = [primary, fallback].filter((p): p is LlmProvider => p !== null);
  if (!chain.length) throw new Error(`Falta la clave de API de ${primaryName}`);

  return {
    name: chain.map((p) => p.name).join("+"),
    async generateJson<T>(input: GenerateJsonInput) {
      const errors: string[] = [];
      const withDeadline = { ...input, deadline: input.deadline ?? Date.now() + LLM_BUDGET_MS };
      for (const provider of chain) {
        try {
          return await provider.generateJson<T>(withDeadline);
        } catch (err) {
          if (!(err instanceof LlmUnavailableError)) throw err;
          errors.push(err.message);
        }
      }
      throw new LlmUnavailableError(errors.join(" | "));
    },
  };
}
