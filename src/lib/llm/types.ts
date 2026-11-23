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
};

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
