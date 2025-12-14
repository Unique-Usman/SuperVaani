from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import PyPDFLoader, DirectoryLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter 
from langchain_community.document_loaders import UnstructuredExcelLoader
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document
from langchain_community.utilities.sql_database import SQLDatabase
import os


DATA_PATH = '/home/anupam/SuperVaani/models/others_data/'
DB_FAISS_PATH = '/home/anupam/SuperVaani/models/vectorstore_others/db_faiss'


# Create vector database
def create_vector_db():
    loader = DirectoryLoader(DATA_PATH,
                             glob='*',
                             loader_cls=UnstructuredExcelLoader)

    documents = loader.load()
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000,
                                                   chunk_overlap=100)
    texts = text_splitter.split_documents(documents)

    embeddings = HuggingFaceEmbeddings(model_name='sentence-transformers/all-MiniLM-L6-v2',
                                       model_kwargs={'device': 'cpu'})

    db = FAISS.from_documents(texts, embeddings)
    db.save_local(DB_FAISS_PATH)


if __name__ == "__main__":
    create_vector_db()
    # create_enhanced_courses_vector_db()
    # create_expertise_vector_db()
#    create_unified_sql_vector_db()
