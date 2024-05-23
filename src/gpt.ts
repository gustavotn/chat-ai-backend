import { ChatOpenAI } from '@langchain/openai';
import { RetrievalQAChain } from 'langchain/chains';
import { PromptTemplate } from '@langchain/core/prompts';
import { redis, redisVectorStore } from './redis-store';

import 'dotenv/config'; // .env

const openAiChat = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: 'gpt-3.5-turbo',
    temperature: 0.3
})

const prompt = new PromptTemplate({
    template: `
    Você responde perguntas sobre um sistema de gestão, o Plenus ERP.
    Além de perguntas, se conseguir pode escrever sobre 'ordens' do usuário, como por exemplo, 'me fale sobre', 'me diga algo sobre este assunto'...
    O usuário, é um usuário do sistema que está querendo tirar suas dúvidas.
    Use o conteúdo dos documentos abaixo para responder a pergunta do úsuario.
    Se não encontrar a resposta nos documentos, responda que você não sabe, não tente inventar uma resposta.
    
    Documentos:
    {context}

    Pergunta:
    {question}
    `.trim(),
    inputVariables: ['context', 'question']
})

const chain = RetrievalQAChain.fromLLM(openAiChat, redisVectorStore.asRetriever(), {
    prompt: prompt
});

export async function answerQuestion(question:string):Promise<string> {
    await redis.connect();

    const response = await chain.invoke({
        query: question
    });

    await redis.disconnect();

    return response.text;
}