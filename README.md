Esto es un proyecto para aprender a usar embeddings con langchain y búsquedas vectoriales.

El proyecto comienza conectándose a una base de datos MongoDB. Luego, crea una instancia de OpenAIEmbeddings
para generar incrustaciones de texto. A continuación, lee todos los archivos en el directorio docs_logseq/journals y,
para cada archivo, crea un nuevo Document con el contenido del archivo. Este Document se divide en fragmentos utilizando
RecursiveCharacterTextSplitter, y se filtran los fragmentos que no están vacíos y no son solo "-". Después, se extrae
el contenido de la página de cada Document y se pasa a embeddings.embedDocuments para generar las incrustaciones de
texto.
Estas incrustaciones se insertan en la base de datos MongoDB, junto con una referencia al documento original. El código
también define una función euclideanDistance para calcular la distancia euclidiana entre dos vectores. Luego, busca un
documento específico en la base de datos MongoDB y obtiene su vector asociado. Encuentra todos los vectores en la base
de datos y calcula la distancia euclidiana entre el vector de consulta y cada vector en la base de datos. Las distancias
se ordenan en orden ascendente y se recuperan los k vecinos más cercanos y los documentos correspondientes. Finalmente,
se imprimen los vecinos más cercanos y se cierra la conexión con la base de datos MongoDB. 
