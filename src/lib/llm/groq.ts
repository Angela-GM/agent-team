import "server-only";
import {
  LlmUnavailableError,
  type GenerateJsonInput,
  type GenerateJsonResult,
  type LlmProvider,
} from "./types";

// Alternativa gratuita (API compatible con OpenAI). Se activa con LLM_PROVIDER=groq.
const API = "https://api.groq.com/openai/v1/chat/completions";

export function createGroqProvider(apiKey: string): LlmProvider {
  const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

  return {
    name: "groq",
    async generateJson<T>(input: GenerateJsonInput): Promise<GenerateJsonResult<T>> {
      const started = Date.now();
      const res = await fetch(API, {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        signal: AbortSignal.timeout(45_000),
        body: JSON.stringify({
          model,
          temperature: input.temperature ?? 0.4,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `${input.system}\n\nResponde SOLO con JSON que cumpla este esquema:\n${JSON.stringify(input.schema)}`,
            },
            { role: "user", content: input.prompt },
          ],
        }),
      });

      if (res.status === 429 || res.status >= 500) {
        throw new LlmUnavailableError(`Groq ${res.status}`, Number(res.headers.get("retry-after")) || 20);
      }
      const json = await res.json();
      if (!res.ok) throw new Error(`Groq ${res.status}: ${json.error?.message ?? "error"}`);

      return {
        data: JSON.parse(json.choices[0].message.content) as T,
        model,
        ms: Date.now() - started,
      };
    },
  };
}
