from operator import itemgetter
from langchain_ollama.llms import OllamaLLM
from langchain.chains import RetrievalQA
from langchain_core.callbacks import CallbackManager, StreamingStdOutCallbackHandler
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate
from checkout import create_app
from datetime import datetime


def create_chain(retriever):
    prompt = set_custom_prompt()
    model = load_llm()#ChatOpenAI(model="gpt-3.5-turbo-16k", temperature=0)
    response_generator = prompt | model | StrOutputParser()
    chain = (
        # The runnable map here routes the original inputs to a context and a question dictionary to pass to the response generator
        {
            "context": itemgetter("question")
            | retriever
            | (lambda docs: "\n".join([doc.page_content for doc in docs])),
            "question": itemgetter("question"),
        }
        | response_generator
    )
    return chain
#==================
import langsmith
from langchain import chat_models, prompts, smith
from langchain.schema import output_parser

# Define the evaluators to apply
eval_config = smith.RunEvalConfig(
    evaluators=[
        "cot_qa",
        smith.RunEvalConfig.LabeledCriteria("conciseness"),
        smith.RunEvalConfig.LabeledCriteria("relevance"),
        #smith.RunEvalConfig.LabeledCriteria("insensitivity"),
        #smith.RunEvalConfig.LabeledCriteria("criminality"),
       # smith.RunEvalConfig.LabeledCriteria("misogyny"),
       # smith.RunEvalConfig.LabeledCriteria("controversiality"),
        smith.RunEvalConfig.LabeledCriteria("helpfulness"),
        #smith.RunEvalConfig.LabeledCriteria("maliciousness"),
        #smith.RunEvalConfig.LabeledCriteria("coherence"),
       # smith.RunEvalConfig.LabeledCriteria("harmfulness")
    ],
    custom_evaluators=[],
    prediction_key="generation",
    eval_llm=OllamaLLM(
        model="llama3.1",
        callback_manager=CallbackManager([StreamingStdOutCallbackHandler()]),
        temperature = 0,
    )
)

client = langsmith.Client()
chain_results = client.run_on_dataset(
    dataset_name="QBank_Final_1Dec2024.xlsx",
    #llm_or_chain_factory=qa_bot(),
    llm_or_chain_factory=create_app(),
    evaluation=eval_config,
    project_name="QBank_Final_1Dec2024.xlsx",
    concurrency_level=5,
    verbose=True,
)
#==========================================:==================================================
