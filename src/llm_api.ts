import { OpenAI } from "openai";
import "dotenv/config";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function summarizeDocument(
  id: number,
  messages: Message[]
): Promise<{ summary: string }> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4", // Or "gpt-3.5-turbo"
      messages: messages,
      temperature: 0.3,
    });

    const summary = response.choices[0]?.message?.content || "";
    return { summary };
  } catch (error) {
    console.error("OpenAI summarization failed:", error);
    throw new Error("Failed to summarize document.");
  }
}
