import {OpenAIEmbeddings} from "@langchain/openai";
import {MongoClient, ObjectId} from 'mongodb';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {Document} from 'langchain/document';
import {RecursiveCharacterTextSplitter} from 'langchain/text_splitter';

const url = 'mongodb+srv://94juanvalera94:mongodbjuan@cluster0.sd2zhrd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(url);

await client.connect();
console.log('Connected successfully to server');

const db = client.db('94juanvalera94');
const collection = db.collection('vectors');

const embeddings = new OpenAIEmbeddings({
    apiKey: "empty", // In Node.js defaults to process.env.OPENAI_API_KEY
    batchSize: 512, // Default value if omitted is 512. Max is 2048
    // dimensions: 1024,
    configuration: {
        baseURL: "http://localhost:8080/v1",
    }
});


// Obtén la ruta del directorio del módulo actual
const dirname = path.dirname(fileURLToPath(import.meta.url));

const logseqDirectory = path.join(dirname, 'docs_logseq', 'journals');

const splitter = new RecursiveCharacterTextSplitter({
    chunkOverlap: 0, // Cantidad de caracteres que se superpondrán entre fragmentos
    separators: ['-'], // Carácter para dividir el texto
});
let docOutput = [];

// Lee todos los archivos en el directorio de Logseq
fs.readdir(logseqDirectory, async (err, files) => {
    if (err) {
        console.error('No se pudo leer el directorio de Logseq:', err);
        return;
    }

    // Para cada archivo en el directorio...
    const promises = files.map(file => new Promise((resolve, reject) => {

        // Construye la ruta completa al archivo
        const filePath = path.join(logseqDirectory, file);

        // Lee el contenido del archivo
        fs.readFile(filePath, 'utf8', async (err, data) => {
            if (err) {
                console.error('No se pudo leer el archivo:', err);
                reject(err);
                return;
            }

            // Crea un nuevo Document con el contenido del archivo
            const doc = new Document({pageContent: data});

            // Divide el Document en fragmentos
            let docOutput = await splitter.splitDocuments([doc]);

            // Filtra los fragmentos que no están vacíos y no son solo "-"
            docOutput = docOutput.filter(fragment => {
                const trimmedContent = fragment.pageContent.trim();
                return trimmedContent !== '' && trimmedContent !== '-';
            });

            resolve(docOutput);
        });
    }));

    Promise.all(promises)
        .then(async results => {
            const docOutput = results.flat();

            // Extract pageContent from each Document
            const texts = docOutput.map(doc => doc.pageContent);

            const vectors = await embeddings.embedDocuments(texts);
// Cuando insertas los vectores en la base de datos, también inserta una referencia al documento original
            const result = await collection.insertMany(vectors.map((vector, index) => ({id: index, vector, document: docOutput[index]})));

            console.log(`Inserted ${result.insertedCount} items`);


        })
        .catch(err => console.error(err));
});

// Define la función euclideanDistance antes de usarla
function euclideanDistance(a, b) {
    if (a.length !== b.length) {
        throw new Error('Los vectores deben tener la misma longitud');
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += Math.pow(a[i] - b[i], 2);
    }

    return Math.sqrt(sum);
}

// Supongamos que quieres usar el vector asociado con un documento específico como tu vector de consulta
// Primero, necesitas saber el _id del documento en MongoDB
const queryDocumentId = '66210c1e34fc015c6ad0d995';

// Luego, puedes buscar el documento en la base de datos
const queryDocument = await collection.findOne({_id: new ObjectId(queryDocumentId)});

// Ahora puedes obtener el vector del documento
const queryVector = queryDocument.vector;

// Encuentra todos los vectores en la base de datos
const vectors = await collection.find().toArray();

// Calcula la distancia euclidiana entre el vector de consulta y cada vector en la base de datos
const distances = vectors.map(doc => {
    const distance = euclideanDistance(queryVector, doc.vector);
    return {_id: doc._id, id: doc.id, distance};
});

// Ordena las distancias en orden ascendente
distances.sort((a, b) => a.distance - b.distance);
const k = 5;
// Luego, cuando recuperas los vecinos más cercanos, también puedes recuperar los documentos correspondientes
const kNearestNeighbors = distances.slice(0, k).map(({_id, distance}) => {
    const doc = vectors.find(doc => doc._id.toString() === _id.toString());
    return {_id, id: doc.id, distance};
});

console.log(kNearestNeighbors);
await client.close();
