from langchain_community.utilities.sql_database import SQLDatabase
from langchain.prompts import PromptTemplate
from langchain_groq import ChatGroq
from langchain_ollama import ChatOllama
from langchain_ollama.llms import OllamaLLM
import os
import re


# Load the database
def load_db():
    # Connect to the MySQL database
    return db

# Create a query generation chain
def chain_create():
    llm = OllamaLLM(model="llama3.1")
    
    # Define the prompt template with schema description and instructions
    prompt_template = PromptTemplate.from_template(
        """The database contains the following tables and columns:
        1. professors:
           - id (INT, PRIMARY KEY)
           - name (VARCHAR(100))
           - email (VARCHAR(255))
           - webpage (VARCHAR(255))
           The professors table contains the names, emails, and webpages of the professors along with their respective id's.

        2. expertise:
           - id (INT, PRIMARY KEY)
           - name (VARCHAR(100))
           The expertise table contains the area of expertise of the professors referenced from the professors table along with the expertise id's.

        3. professor_expertise:
           - professor_id (INT, FOREIGN KEY to professors.id)
           - expertise_id (INT, FOREIGN KEY to expertise.id)
           The professor_expertise table links the professors to their respective areas of expertise.

        4. courses_m_2025:
           - id (INT, PRIMARY KEY)
           - course_title (VARCHAR(255))
           - credits (INT)
           - course_desc (TEXT)
           The courses_m_2025 table contains the course titles, credits, and descriptions.

        5. course_professors:
           - course_id (INT, FOREIGN KEY to courses_m_2025.id)
           - professor_id (INT, FOREIGN KEY to professors.id)
           The course_professors table links professors to the courses they teach.

           **Instructions**:
        - To answer questions about professors and their expertise or courses, first refer to the `professors`, `expertise`, and `courses_m_2025` tables to find the names and IDs.
        - Use the `professor_expertise` and `course_professors` tables to match IDs and determine the relationship between professors and their expertise or courses.
        - Generate SQL queries to retrieve names of professors along with their areas of expertise, courses taught, email and webpage based on these relationships.
        - Ensure that the query matches keywords partially. Give the answer even if the keyword is in lowercase or uppercase.
        - Handle variations in keyword matching (e.g., different forms or related terms should be considered the same keyword).
        - Group the results so that each professor is listed only once with all their relevant expertise and courses.
        - Include the professor's name, email, and webpage only once, followed by a list of their expertise and courses combined.
        - Return the professor names along with their areas of expertise and courses taught in the results.
        - Also Handle variations if the words are not completely matching, even if one word matches the answer then return the results, and 
        even if something is written in acronym form  still return the correct results.
        - Present the final answer in a well-structured and engaging manner, avoided repetitive listings. Provide the answer
        in a way that conveys the asked information and helps the user understand the context and avoid any hallucinated or fake data.
        - Be able to handle variations in questions asked, even if the professors name is in lower case, or even if the last name of the professor is not there, 
        still provide the answer according to the first name.
        
        User Question: {question}
        SQL Query: """
    )
    
    # Create the LLM chain for generating SQL queries
    sql_chain = prompt_template | llm 
    return sql_chain

def sql_infer(db, llm_chain, user_question):
    try:
        # Generate SQL query using the LLM
        response = llm_chain.invoke({"question": user_question})
        response_text = response.strip()

        # Extract the SQL query from the response
        sql_query = re.search(r"```sql\n(.*?)\n```", response_text, re.DOTALL)
        if sql_query:
            sql_query = sql_query.group(1).strip()
        else:
            raise ValueError("SQL query not found in the response.")

        # Debug: Print the generated SQL query
        print(f"Generated SQL Query: {sql_query}")

        # Check if sql_query is a valid string
        if not isinstance(sql_query, str) or not sql_query:
            raise ValueError("Generated SQL query is invalid or empty.")

        # Execute the SQL query
        result = db.run(sql_query)
        print(result)
        return result
    except Exception as e:
        return f"Error: in generating or executing sql_infer()ing SQL query: {e}"
