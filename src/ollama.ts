import { createClient } from "redis";
import { RedisVectorStore } from "@langchain/redis";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";

import { DirectoryLoader } from 'langchain/document_loaders/fs/directory'
import { JSONLoader } from 'langchain/document_loaders/fs/json'
import { TokenTextSplitter } from 'langchain/text_splitter';
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";

const client = createClient({
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
});

const pat = 'C:/Git/chat-ai-backend/tmp'

const loader = new DirectoryLoader(
  pat,
  {
      '.json': path => new JSONLoader(path, '/text')
  }
);

async function load() {
  await client.connect();

  const docs = await loader.load();

  const splitter = new TokenTextSplitter({
      chunkSize: 600,
      chunkOverlap: 0,
      encodingName: 'cl100k_base'
  });

  const splittedDocuments = await splitter.splitDocuments(docs);

  const vectorStore = await RedisVectorStore.fromDocuments(
    splittedDocuments,
    // new OllamaEmbeddings({
    //   model: "mxbai-embed-large", // default value
    //   baseUrl: "http://localhost:11434", // default value
    //   requestOptions: {
    //     useMMap: true,
    //     numThread: 6,
    //     numGpu: 1,
    //   },
    // }),
    new OpenAIEmbeddings(),
    {
      redisClient: client,
      indexName: "docs",
    }
  );

  await client.disconnect();
}

async function run() {
  await client.connect();

  const vectorStore = new RedisVectorStore(new OllamaEmbeddings({
    model: "llama3", // default value
    baseUrl: "http://localhost:11434"
  }), {
    redisClient: client,
    indexName: "docs",
  });

  // const vectorStore = new RedisVectorStore(new OpenAIEmbeddings(), {
  //   redisClient: client,
  //   indexName: "docs",
  // });

  const simpleRes = await vectorStore.similaritySearch("redis", 1);
  console.log(simpleRes);

  const filterRes = await vectorStore.similaritySearch("redis", 3, ["qux"]);
  console.log(filterRes);

  const model = new ChatOllama({
    baseUrl: "http://localhost:11434", // Default value
    model: "llama3", // Default value
  });

  //const model = new ChatOpenAI({ model: "gpt-3.5-turbo-1106" });
  const questionAnsweringPrompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "Answer the user's questions based on the below context:\n\n{context}",
    ],
    ["human", "{input}"],
  ]);

  const combineDocsChain = await createStuffDocumentsChain({
    llm: model,
    prompt: questionAnsweringPrompt,
  });

  const chain = await createRetrievalChain({
    retriever: vectorStore.asRetriever(),
    combineDocsChain,
  });

  const chainRes = await chain.invoke({ input: "Como fazer um workflow?" });
  console.log(chainRes);

  await client.disconnect();
}

export async function answerQuestion(input:string):Promise<string> {
  await client.connect();

  // const vectorStore = new RedisVectorStore(new OllamaEmbeddings({
  //   model: "mxbai-embed-large", // default value
  //   baseUrl: "http://localhost:11434"
  // }), {
  //   redisClient: client,
  //   indexName: "docs",
  // });

    const vectorStore = new RedisVectorStore(new OpenAIEmbeddings(), {
    redisClient: client,
    indexName: "docs",
  });

  const model = new ChatOllama({
    baseUrl: "http://localhost:11434", // Default value
    model: "llama3", // Default value
    temperature: 0.3
  });

  //const model = new ChatOpenAI({ model: "gpt-3.5-turbo" });
  const questionAnsweringPrompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `Você responde perguntas sobre um sistema de gestão, o Plenus ERP.
      Além de perguntas, se conseguir pode escrever sobre 'ordens' do usuário, como por exemplo, 'me fale sobre', 'me diga algo sobre este assunto'...
      O usuário, é um usuário do sistema que está querendo tirar suas dúvidas.
      Use o conteúdo dos documentos abaixo para responder a pergunta do úsuario.
      Se não encontrar a resposta nos documentos, responda que você não sabe, não tente inventar uma resposta.
      
      Documentos: {context}`,
    ],
    ["human", "{input}"],
  ]);

  const combineDocsChain = await createStuffDocumentsChain({
    llm: model,
    prompt: questionAnsweringPrompt,
  });

  const chain = await createRetrievalChain({
    retriever: vectorStore.asRetriever(),
    combineDocsChain,
  });

  const chainRes = await chain.invoke({ input });
  console.log(chainRes);

  await client.disconnect();

  return chainRes.answer;
}

// load()