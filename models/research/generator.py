from models.research.prompts import prompt_rag_chain
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from langchain_ollama import ChatOllama
from models.research.prompts import prompt_hallucination, prompt_answer_grader

llm = ChatOllama(model="llama3.1:8b", verbose=True, temperature=0.5)
rag_chain = prompt_rag_chain | llm | StrOutputParser()
hallucination_grader = prompt_hallucination | llm | JsonOutputParser()
answer_grader = prompt_answer_grader | llm | JsonOutputParser()

def generate(state):
    """
    Generate answer using RAG on retrieved documents

    Args:
        state (dict): The current graph state

    Returns:
        state (dict): New key added to state, generation, that contains LLM generation
    """
    print("---GENERATE---")
    question = state["question"]
    documents = state["documents"]

    # RAG generation
    generation = rag_chain.invoke({"documents": documents, "question": question})
    return {"documents": documents, "question": question, "generation": generation}

