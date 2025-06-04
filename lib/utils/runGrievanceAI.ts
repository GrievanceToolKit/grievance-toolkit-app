import { OpenAI } from "openai";
import { analyzePrompt } from "@/lib/prompts/analyzePrompt";

export async function runGrievanceAI(messages: any[]) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const finalMessages: any[] = [analyzePrompt, ...messages];
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: finalMessages,
    temperature: 0.4
  });
  return JSON.parse(response.choices[0].message?.content || "{}" );
}
