from langchain_community.document_loaders import PyPDFLoader, DirectoryLoader
from operator import itemgetter
from langchain_community.vectorstores import FAISS


#============================================================================================
#TESTING
import pandas as pd
from langsmith import Client

# Load the Excel file
df = pd.read_excel('QBank_Final_1Dec2024.xlsx')

# Extract questions and answers into separate lists
inputs = df['Questions'].tolist()
outputs = df['Answer'].tolist()

qa_pairs = [{"question": q, "answer": a} for q, a in zip(inputs, outputs)]

from ragas.metrics import faithfulness, answer_relevancy, context_relevancy, context_recall
from ragas.langchain import RagasEvaluatorChain

# make eval chains
eval_chains = {
    m.name: RagasEvaluatorChain(metric=m)
    for m in [faithfulness, answer_relevancy, context_relevancy, context_recall]
}

# dataset creation
from langsmith import Client
from langsmith.utils import LangSmithError

client = Client()
dataset_name ="QBank_Final_1Dec2024.xlsx"

try:
    # check if dataset exists
    dataset = client.read_dataset(dataset_name=dataset_name)
    print("using existing dataset: ", dataset.name)
except LangSmithError:
# Create dataset
    dataset = client.create_dataset(
        dataset_name=dataset_name,
        description="QBank_Final_1Dec2024.xlsx",
    )
    client.create_examples(
        inputs=[{"question": q} for q in inputs],
        outputs=[{"answer": a} for a in outputs],
        dataset_id=dataset.id,
    )
