import { OpenAI } from "openai";
import 'dotenv/config'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function summarizeText(text: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a summarization assistant." },
        { role: "user", content: `Summarize the following text:\n\n${text}` },
      ],
      max_tokens: 500,
    });
    if (response.choices[0].message.content != null) {
      return response.choices[0].message.content.trim();
    } else {
      return "Empty string, as response is null..."
    }
  } catch (e: any) {
    console.error(e.message)
    return e.message;
  }

}
