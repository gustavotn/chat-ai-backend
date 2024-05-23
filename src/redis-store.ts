import { RedisVectorStore } from '@langchain/redis';
import { OpenAIEmbeddings } from '@langchain/openai';
import { createClient } from 'redis'

import 'dotenv/config'; // .env

export const redis = createClient({
    url: process.env.URL_REDIS
})


export const redisVectorStore = new RedisVectorStore(
    new OpenAIEmbeddings( { openAIApiKey: process.env.OPENAI_API_KEY } ),
    {
        indexName: 'sacs-embeddings',
        redisClient: redis,
        keyPrefix: 'sacs:'
    }
);

