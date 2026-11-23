import "server-only";
import {
  LlmUnavailableError,
  type GenerateJsonInput,
  type GenerateJsonResult,
  type LlmProvider,
} from "./types";

// Respaldo gratuito (API compatible con OpenAI). Se usa si Gemini no responde.
const API = "https://api.groq.com/openai/v1/chat/completions";

export function createGroqProvider(apiKey: string): LlmProvider {
  const model = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";

  return {
    name: "groq",
    async generateJson<T>(input: GenerateJsonInput): Promise<GenerateJsonResult<T>> {
      const started = Date.now();
      let res: Response;
      try {
        res = await fetch(API, {
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
                content: `${input.system}\n\nResponde SOLO con un objeto JSON que cumpla este esquema:\n${JSON.stringify(input.schema)}`,
              },
              { role: "user", content: input.prompt },
            ],
          }),
        });
      } catch (err) {
        throw new LlmUnavailableError(`groq ${model}: ${err instanceof Error ? err.name : "fallo de red"}`);
      }

      const json = await res.json().catch(() => ({}));
      if (res.status === 429 || res.status >= 500) {
        throw new LlmUnavailableError(`groq ${model}: ${res.status}`, Number(res.headers.get("retry-after")) || 20);
      }
      if (!res.ok) throw new Error(`Groq ${model} ${res.status}: ${json.error?.message ?? "error"}`);

      try {
        return {
          data: JSON.parse(json.choices[0].message.content) as T,
          model: `groq/${model}`,
          ms: Date.now() - started,
        };
      } catch {
        throw new LlmUnavailableError(`groq ${model}: JSON inválido`);
      }
    },
  };
}
