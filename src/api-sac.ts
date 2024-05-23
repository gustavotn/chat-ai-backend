import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';

const api = axios.create({
    baseURL: 'https://plenushost.com.br',
});

interface Topic { 
    topicIteration: TopicIteration[]
}

interface TopicIteration {
    topicId: string;
    topicCode: string;
    topicTitle: string;
    topicType: number;
    id: string;
    description: string;
    dateCreatedAt: string;
    createdAt: Date;
    attachments: Array<TopicIterationAttach>;
    creationAuthorEmail: string;
    creationAuthorName: string;
    creationAuthorAvatarImage: string;
    creationAuthorAvatarCharacter: string;
    creationAuthorAvatarColor: string;
    creationAuthorCompanyName: string;
};

interface TopicIterationAttach {
    topicId: string;
    topicIterationId: string;
    id: string;
    name: string;
    blob: any;
};

async function getAllTopics() {
    const response = await api.get<TopicIteration[]>('topicBySearch?search=&help=true&improvement=false&support=false&fail=false&system=99&priority=99&status=99&createdBy=0&assignedTo=0&tagOrigem=true');

    return response.data;
}


async function getAllTopicsTexts() {
    const topics = await getAllTopics();

    topics.forEach(async t => {
        const response = await api.get<Topic>(
            'topicById', 
            {
                params: {
                    topicId: t.id
                }
            }
        );

        var description = response.data.topicIteration[0].description;

        const descriptionWithoutHtml = cheerio.load(description).text();
        console.log(descriptionWithoutHtml);

        const jsonDados = JSON.stringify({ text: descriptionWithoutHtml.trim()});

        fs.writeFile(`./tmp/${t.id}.json`, jsonDados, (err) => {
            if (err) throw err;
                console.log('Arquivo JSON criado com sucesso!');
        });
    });
}

getAllTopicsTexts();