import express from 'express';
import { answerQuestion } from '../ollama';
import cors from 'cors';

import 'dotenv/config'; // .env

const app = express();

app.use(cors())
app.use(express.json());

app.post('/', async (request, response) => {

    const { question } = request.body;

    const resp = await answerQuestion(question);

    response.status(200).send({ message: resp });
});

app.listen(process.env.PORT);