from langchain_huggingface import HuggingFaceEmbeddings
import logging
from typing import List
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from models.research.sql_chain import load_db, chain_create, sql_infer

DB_FAISS_PATH_PERSONNEL = '/home/anupam/SuperVaani/models/vectorstore_personnel/db_faiss/'
DB_FAISS_PATH_OTHERS = "/home/anupam/SuperVaani/models/vectorstore_others/db_faiss/"
DB_FAISS_PATH_LIBRARY = "/home/anupam/SuperVaani/models/vectorstore_library/db_faiss/"

embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2",
                                       model_kwargs={'device': 'cpu'})
db_personnel = FAISS.load_local(DB_FAISS_PATH_PERSONNEL, embeddings, allow_dangerous_deserialization=True)
db_others = FAISS.load_local(DB_FAISS_PATH_OTHERS, embeddings, allow_dangerous_deserialization=True)
db_library = FAISS.load_local(DB_FAISS_PATH_LIBRARY, embeddings, allow_dangerous_deserialization=True)

retriever_personnel = db_personnel.as_retriever(search_kwargs={'k': 1})
retriever_others = db_others.as_retriever(search_kwargs={'k': 2})
retriever_library = db_library.as_retriever(search_kwargs={'k': 6})


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

## For the new Databases

DB_FAISS_SQL_UNIFIED_PATH = '/home/anupam/SuperVaani/models/vectorstore_sql_unified/db_faiss/'

def retrieve_with_metadata(query: str, db_path: str, k: int = 3) -> List[Document]:
    """
    Retrieve documents from a FAISS DB and return new Document objects
    whose page_content combines both text and metadata.
    """
    vectorstore = FAISS.load_local(
        db_path,
        embeddings,
        allow_dangerous_deserialization=True
    )
    retriever = vectorstore.as_retriever(search_kwargs={"k": k})

    # Retrieve original documents
    docs = retriever.invoke(query)

    # Combine metadata into page_content and create new Document objects
    combined_docs = []
    for doc in docs:
        meta = doc.metadata or {}
        meta_text = "\n".join(f"{key}: {value}" for key, value in meta.items() if value)
        combined_docs.append(
            Document(
                page_content=f"{doc.page_content}\n\n--- Metadata ---\n{meta_text}",
                metadata=meta
            )
        )

    return combined_docs


### 

### Nodes
def retrieve(state):
    """
    Retrieve documents from vectorstore

    Args:
        state (dict): The current graph state

    Returns:
        state (dict): New key added to state, documents, that contains retrieved documents
    """
    print("---RETRIEVE---")
    question = state["question"]
    # Retrieval

    documents = retriever_personnel.invoke(question)
#    documents = retriever_others.invoke(question) +  documents
    # Load the database
    return {"documents": documents, "question": question}

def retrieve_other(state):
    """
    Retrieve documents from vectorstore

    Args:
        state (dict): The current graph state

    Returns:
        state (dict): New key added to state, documents, that contains retrieved documents
    """
    print("---RETRIEVE OTHERS---")
    question = state["question"]
    # Retrieval
    documents = retriever_others.invoke(question)
    # Load the database
    return {"documents": documents, "question": question}


def retrieve_sql(state):
    """
    Retrieve documents from mysql_database

    Args:
        state (dict): The current graph state

    Returns:
        state (dict): New key added to state, documents, that contains retrieved documents from sql
    """
    # print("---RETRIEVE SQL---")
    print("HELLOOOOOOOO WE IN SQL")
    question = state["question"]
    print(f"---question -- {question}")
    documents = [] 
    logger.error("sql step 2 are we here?")
    # Load the database
    db = load_db()
    
    # Create the SQL LLM chain
    llm_chain = chain_create()

    db = load_db()
    logger.error("sql step 3 are we here?")
    # Create the LLM chain
    llm_chain = chain_create()
    logger.error("sql step 4 are we here?")
    sql_docs = sql_infer(db, llm_chain, question)
    if sql_docs is not None:
        doc = Document(page_content=sql_docs, metadata={"source": "sql"})
        print(doc)
        documents.append(doc)
    logger.error("sql step 5 are we here?")
    ## The portion for the sql unified vectorstore
    sql_unified_docs = retrieve_with_metadata(question, DB_FAISS_SQL_UNIFIED_PATH, k=2)
    documents.extend(sql_unified_docs)
    logger.error("step 6 we are in sql brother")
    logger.error(f"{documents}")

    return {"documents": documents, "question": question}



def retrieve_library(state):
    """
    Retrieve documents related to books and libraries.

    Args:
        state (dict): The current graph state.

    Returns:
        state (dict): New key added to state, documents, that contains retrieved documents related to libraries.
    """
    print("---RETRIEVE LIBRARY---")
    question = state["question"]
    # Retrieval logic for books and libraries
    documents = retriever_library.invoke(question)
    return {"documents": documents, "question": question}
