const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
    apiKey: 'your-openai-api-key',
});

const openai = new OpenAIApi(configuration);

async function summarizeText(text) {
    const prompt = `Summarize the following text: ${text}`;
    const response = await openai.createCompletion({
        model: 'gpt-4',
        prompt,
        max_tokens: 500,
    });
    return response.data.choices[0].text.trim();
}

module.exports = { summarizeText };
