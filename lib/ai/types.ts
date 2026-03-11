export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AiMode =
  | "general"
  | "money"
  | "shop"
  | "resources"
  | "spatial";

export type AiRequestBody = {
  mode?: AiMode;
  messages?: ChatMessage[];
  context?: string;
};
