import path from 'node:path';

import { DirectoryLoader } from 'langchain/document_loaders/fs/directory'
import { JSONLoader } from 'langchain/document_loaders/fs/json'
import { TokenTextSplitter } from 'langchain/text_splitter';
import { RedisVectorStore } from '@langchain/redis';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { createClient } from 'redis';

import 'dotenv/config'; // .env

const loader = new DirectoryLoader(
    path.resolve(__dirname, '../tmp'),
    {
        '.json': path => new JSONLoader(path, '/text')
    }
);

async function load() {
    const docs = await loader.load();

    const splitter = new TokenTextSplitter({
        chunkSize: 600,
        chunkOverlap: 0,
        encodingName: 'cl100k_base'
    });

    const splittedDocuments = await splitter.splitDocuments(docs);

    const redis = createClient({
      url: process.env.URL_REDIS
    })

    await redis.connect();

    await RedisVectorStore.fromDocuments(
      splittedDocuments,
      new OpenAIEmbeddings( { openAIApiKey: process.env.OPENAI_API_KEY } ),
      {
        indexName: 'sacs-embeddings',
        redisClient: redis,
        keyPrefix: 'sacs:'

      }
    );

    await redis.disconnect();
}

load();