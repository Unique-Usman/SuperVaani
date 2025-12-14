from models.research.prompts import prompt_question_router
from langchain_core.output_parsers import JsonOutputParser
from langchain_ollama import ChatOllama


llm = ChatOllama(model="llama3.1:8b", temperature=0)
question_router = prompt_question_router | llm | JsonOutputParser()

# Define a conditional edge to decide whether to continue or end the workflow for sql
def route_sql(state):
    """
    Route question to back to retrieve_sql or to grade_documents.

    Args:
        state (dict): The current graph state

    Returns:
        str: Next node to call
    """
    messages = state["documents"]
    last_message = messages[-1]
    # If there is a tool call, then we finish
    if last_message.page_content.startswith("Error:"):
        return "retrieve_sql"
    else:
        return "generate"

### Conditional edge
def route_question(state):
    """
    Route question to web search or RAG.

    Args:
        state (dict): The current graph state

    Returns:
        str: Next node to call
    """

    print("---ROUTE QUESTION---")
    question = state["question"]
    print(question)
    source = question_router.invoke({"question": question})
    print(source)

    if source["datasource"] == "others":
        return "retrieve_other"
    elif source["datasource"] == "faculty":
        return "faculty"
    elif source["datasource"] == "founder":
        return "founder"
    else:
        return "retrieve_library"
