require('dotenv').config();
import 'openai/shims/node';

const { OpenAI } = require("openai");

const openai = new OpenAI({
    organization: "org-UWoJ31hWNG1JFkkxytv0wOvO",
    project: "proj_b49nN9k2EyLkWZVykN8JdUBi",
});

async function summarizeText(text) {
    const prompt = `Summarize the following text: ${text}`;
    const response = await openai.createCompletion({
        model: 'gpt-4',
        prompt,
        max_tokens: 1000,
    });
    return response.data;
}

module.exports = { summarizeText };
