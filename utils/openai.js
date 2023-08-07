import { Configuration, OpenAIApi } from 'openai';
import 'dotenv/config'
// import config
import config from "../config.json" assert { type: "json" };

const gptModel = config.gptModel || 'gpt-3.5-turbo'

// if process.env.OPENAI_API_KEY is not set then exit
if (!process.env.OPENAI_API_KEY) {
    console.log("OPENAI_API_KEY is not set")
    process.exit(1)
}
// OpenAI API
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
const openai = new OpenAIApi(configuration);




export async function createPrompt(messages) {
    return new Promise((resolve, reject) => {
        const completion = openai.createChatCompletion({
            model: gptModel,
            temperature: 1,
            max_tokens: 200,
            messages: messages
        })
        .then((response) => {
            resolve(response)
        })
        .catch((error) => {
            reject(error)
        })
    })
}
