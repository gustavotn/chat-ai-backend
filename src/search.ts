import { redis, redisVectorStore } from './redis-store'

async function search() {
    await redis.connect();

    const response = await redisVectorStore.similaritySearchWithScore(
        'Como faço uma nota fiscal?',
        3
    )

    await redis.disconnect();
}

search();