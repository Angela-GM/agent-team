import "server-only";
import {
  LlmUnavailableError,
  type GenerateJsonInput,
  type GenerateJsonResult,
  type LlmProvider,
} from "./types";

const API = "https://generativelanguage.googleapis.com/v1beta/models";

// Si un modelo está saturado (503) o sin cuota (429) se prueba el siguiente.
const DEFAULT_MODELS = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-flash-lite-latest"];
const TIMEOUT_MS = 45_000;

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  error?: { code: number; message: string; status: string };
};

export function createGeminiProvider(apiKey: string): LlmProvider {
  const models = (process.env.GEMINI_MODELS ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  const chain = models.length ? models : DEFAULT_MODELS;

  return {
    name: "gemini",
    async generateJson<T>(input: GenerateJsonInput): Promise<GenerateJsonResult<T>> {
      const errors: string[] = [];

      for (const model of chain) {
        const started = Date.now();
        let res: Response;
        try {
          res = await fetch(`${API}/${model}:generateContent`, {
            method: "POST",
            headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
            signal: AbortSignal.timeout(TIMEOUT_MS),
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: input.system }] },
              contents: [{ role: "user", parts: [{ text: input.prompt }] }],
              generationConfig: {
                temperature: input.temperature ?? 0.4,
                responseMimeType: "application/json",
                responseJsonSchema: input.schema,
              },
            }),
          });
        } catch (err) {
          errors.push(`${model}: ${err instanceof Error ? err.name : "fallo de red"}`);
          continue;
        }

        const json = (await res.json().catch(() => ({}))) as GeminiResponse;

        if (res.status === 429 || res.status === 503 || res.status === 500 || res.status === 404) {
          errors.push(`${model}: ${res.status}`);
          continue;
        }
        if (!res.ok) {
          throw new Error(`Gemini ${model} ${res.status}: ${json.error?.message ?? "error"}`);
        }

        const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
        try {
          return { data: JSON.parse(text) as T, model, ms: Date.now() - started };
        } catch {
          errors.push(`${model}: JSON inválido (${json.candidates?.[0]?.finishReason ?? "?"})`);
        }
      }

      throw new LlmUnavailableError(`Ningún modelo de Gemini respondió (${errors.join("; ")})`);
    },
  };
}
