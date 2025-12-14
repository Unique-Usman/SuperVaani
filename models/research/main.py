from langchain_community.document_loaders import PyPDFLoader, DirectoryLoader
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain.prompts import PromptTemplate
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.output_parsers import StrOutputParser
from langchain_community.utilities.sql_database import SQLDatabase
from langchain.chains import LLMChain
import re
from pprint import pprint
import os
from langchain_groq import ChatGroq
from langchain_ollama import ChatOllama
from langchain_ollama.llms import OllamaLLM
from typing import List
from langchain_core.documents import Document
from typing_extensions import TypedDict
from langgraph.graph import END, StateGraph, START
from langchain_core.runnables import RunnableSequence
from models.research.prompts import (
    prompt_retrieval_grader,
    prompt_rag_chain,
    prompt_hallucination,
    prompt_answer_grader,
    prompt_question_router,
)
from models.research.retrieval import retrieve, retrieve_sql, retrieve_other, retrieve_library
from models.research.router import route_sql, route_question
from models.research.generator import generate

local_llm = "llama3.1:8b"
llm = ChatOllama(model=local_llm, format="json", temperature=0)

retrieval_grader = prompt_retrieval_grader| llm | JsonOutputParser()

# Post-processing
def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

# State
class GraphState(TypedDict):
    """
    Represents the state of our graph.

    Attributes:
        question: question
        generation: LLM generation
        web_search: whether to add search
        documents: list of documents
    """

    question: str
    generation: str
    documents: List[str]

workflow = StateGraph(GraphState)

# Define the nodes
workflow.add_node("retrieve", retrieve)  # retrieve
workflow.add_node("retrieve_sql", retrieve_sql)  # retrieve sql
workflow.add_node("retrieve_other", retrieve_other)  # retrieve sql
workflow.add_node("generate", generate)  # generatae
workflow.add_node("retrieve_library", retrieve_library) # retrieve library

# Build the graph  


workflow.add_conditional_edges(
    START,
    route_question,
    {
        "retrieve_other": "retrieve_other",
        "faculty": "retrieve_sql",
        "founder": "retrieve", 
        "retrieve_library": "retrieve_library",
    },
)

workflow.add_edge("retrieve_library", "generate")

workflow.add_edge("retrieve", "generate")
workflow.add_edge("retrieve_other", "generate")
workflow.add_edge("retrieve_sql", "generate")
#workflow.add_conditional_edges(
#    "retrieve_sql",
#    route_sql,
#    {
#        "retrieve_sql": "retrieve_sql",
#        "generate": "generate",
#    }
#)
workflow.add_edge("generate", END,)
def create_app():
    app = workflow.compile()
    return app
