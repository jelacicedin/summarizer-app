require('dotenv').config();
// import 'openai/shims/node';

const { OpenAI } = require("openai");

const openai = new OpenAI({
    organization: process.env.ORGANIZATION,
    apiKey: process.env.OPENAI_API_KEY,
    project: process.env.PROJECT,
});


async function summarizeText(text) {
    const prompt = `Summarize the following text: ${text}`;
  
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: "You are a summarization assistant." },
                   { role: "user", content: prompt }],
        max_tokens: 1000,
      });
  
      // Extract and return the assistant's message
      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error("Error in OpenAI API call:", error);
      throw error;
    }
  }
  
  module.exports = { summarizeText };
