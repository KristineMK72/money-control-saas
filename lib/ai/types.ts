export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AiMode = "general" | "money";

export type AiRequestBody = {
  mode?: AiMode;
  messages?: ChatMessage[];
  context?: string;
  stressScore?: number;
  financialSummary?: string;
};
