import { OpenAI } from "openai";
import analyzePrompt from "@/lib/prompts/analyzePrompt";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions/completions";

export interface GrievanceAIPromptMessage {
  role: "system" | "user";
  content: string;
}

export async function runGrievanceAI(messages: GrievanceAIPromptMessage[]) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is missing');
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  // Only use 'system' and 'user' roles for OpenAI API compatibility
  const finalMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: analyzePrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content }))
  ];
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: finalMessages,
    temperature: 0.4
  });
  return JSON.parse(response.choices[0].message?.content || "{}" );
}
