// Esquema JSON (subconjunto) que entienden todos los proveedores.
export type JsonSchema = {
  type: "object" | "array" | "string" | "number" | "integer" | "boolean";
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: string[];
};

export type GenerateJsonInput = {
  system: string;
  prompt: string;
  schema: JsonSchema;
  temperature?: number;
  /** Momento (ms) a partir del cual no se debe empezar otra llamada. Lo fija getLlm(). */
  deadline?: number;
};

// Presupuesto de un paso: la función de Vercel tiene maxDuration = 120 s; dejamos
// margen para guardar en la base de datos. Ninguna cadena de modelos lo supera.
export const LLM_BUDGET_MS = 100_000;
export const MIN_CALL_MS = 8_000;

export function remaining(input: GenerateJsonInput) {
  return (input.deadline ?? Date.now() + LLM_BUDGET_MS) - Date.now();
}

export type GenerateJsonResult<T> = {
  data: T;
  model: string;
  ms: number;
};

export interface LlmProvider {
  name: string;
  generateJson<T>(input: GenerateJsonInput): Promise<GenerateJsonResult<T>>;
}

// Error "temporal": cuota, saturación o timeout. El motor lo reintenta más tarde.
export class LlmUnavailableError extends Error {
  constructor(
    message: string,
    public retryAfterSeconds = 20,
  ) {
    super(message);
    this.name = "LlmUnavailableError";
  }
}
