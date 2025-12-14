# SuperVaani RAG System Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Installation & Setup](#installation--setup)
4. [Components](#components)
5. [Data Flow](#data-flow)
6. [Configuration](#configuration)
7. [Usage Guide](#usage-guide)
8. [Troubleshooting](#troubleshooting)
9. [Flask API](#flask-api-documentation)
10. [Frontend Application](#frontend-application)

---

## Overview

**SuperVaani** is an advanced Retrieval-Augmented Generation (RAG) system designed as an AI assistant for Plaksha University. It intelligently routes queries to appropriate data sources and generates accurate, context-aware responses.

### Key Features
- Multi-source Data Retrieval (Vector stores, SQL databases, Library catalogs)
- Intelligent Query Routing
- Hybrid Search (Vector similarity + SQL querying)
- LangGraph Workflow
- Specialized Knowledge Domains (Faculty, Courses, Expertise, Library, General info)

---

## System Architecture

### High-Level Architecture

```
User Query
    ↓
Query Router (LLM-based)
    ↓
┌────────────┬─────────────┬──────────────┬──────────────┐
│  Founders  │   Faculty   │    Others    │   Library    │
│  Vector DB │  SQL + Vec  │   Vector DB  │  Vector DB   │
└────────────┴─────────────┴──────────────┴──────────────┘
    ↓
Document Retrieval
    ↓
Generator (RAG Chain)
    ↓
Response to User
```

### Component Overview

```
models/
├── ingest.py                    # Vector DB creation for personnel data
├── ingest_others_data.py        # Vector DB creation for general data
├── requirements.txt             # Python dependencies
└── research/
    ├── main.py                  # LangGraph workflow orchestration
    ├── router.py                # Query routing logic
    ├── retrieval.py             # Document retrieval functions
    ├── generator.py             # Response generation
    ├── prompts.py               # Prompt templates
    └── sql_chain.py             # SQL query generation & execution
```

---

## Installation & Setup

### Prerequisites
- Python 3.8+
- MySQL database
- Ollama with llama3.1:8b model installed
- Sufficient disk space for vector stores (~1-2 GB)

### Step 1: Install Dependencies

```bash
pip install -r requirements.txt
```

**Key dependencies:** langchain, torch, sentence_transformers, faiss_cpu, pypdf, and supporting libraries.

### Step 2: Database Setup

The system uses a MySQL database with the following tables:
- `professors` - Faculty information
- `expertise` - Areas of expertise
- `professor_expertise` - Links professors to expertise
- `courses_m_2025` - Course catalog
- `course_professors` - Links professors to courses

Refer to `sql_chain.py` for complete schema details and `database.py` for SQLite schema used by the API.

### Step 3: Create Vector Stores

**1. Personnel Data:**
Place Excel files in the personnel data directory and run `ingest.py`.

**2. General Information:**
Place Excel files in the general data directory and run `ingest_others_data.py`.

**3. SQL-backed Unified Vector Store:**
Run the unified vector database creation function in `ingest.py`.

**4. Library Data:**
Ensure library JSON files are in the appropriate directory.

### Step 4: Configure Paths

Update path configurations in `retrieval.py` to match your deployment environment:
- Personnel vector store location
- General information vector store location
- Library vector store location
- SQL unified vector store location

### Step 5: Start Ollama

Ensure Ollama is running with the llama3.1:8b model.

---

## Components

### 1. main.py - Workflow Orchestration

**Purpose**: Defines the LangGraph state machine for query processing.

**Workflow Graph:**
- Five retrieval nodes: `retrieve`, `retrieve_sql`, `retrieve_other`, `retrieve_library`, `generate`
- Conditional routing based on query type
- All retrieval paths converge at generation

**Query Flow:**
1. Query enters system
2. Router determines data source
3. Appropriate retrieval function executes
4. Documents passed to generator
5. Response returned

### 2. router.py - Query Routing

**Purpose**: Routes queries to appropriate data sources using LLM classification.

**Routing Logic:**

| Query Type | Examples | Route To |
|-----------|----------|----------|
| Faculty | "Who teaches AI?", "Professor expertise" | SQL + Vector |
| Founders | "Who founded Plaksha?" | Vector Store |
| Library | "Books on algorithms" | Library Catalog |
| General | "Emergency contact?" | General Info |

### 3. retrieval.py - Document Retrieval

**Purpose**: Fetches relevant documents from various data sources.

**Retrieval Functions:**

**retrieve()** - Founder Information
- Source: Personnel vector store
- Top K: 1

**retrieve_other()** - General Information
- Source: General data vector store
- Top K: 2

**retrieve_sql()** - Faculty Data (Hybrid)
- SQL query execution
- Unified vector store search
- Combines structured and semantic search

**retrieve_library()** - Library Resources
- Source: Library catalog
- Top K: 6

**Embedding Model:** sentence-transformers/all-MiniLM-L6-v2

### 4. sql_chain.py - SQL Query Generation

**Purpose**: Generates and executes SQL queries using LLM-based text-to-SQL conversion.

**Features:**
- Schema-aware query generation
- Partial keyword matching
- Case-insensitive search
- Acronym handling
- Grouped results per professor

**Process:**
1. LLM generates SQL from natural language
2. Extract query from response
3. Execute against database
4. Return results

### 5. generator.py - Response Generation

**Purpose**: Generates final responses using RAG chain.

**Process:**
1. Receives question and retrieved documents
2. Passes through RAG prompt and LLM
3. Returns generated response

**LLM Configuration:**
- Model: llama3.1:8b
- Temperature: 0.5 (balances creativity with accuracy)

### 6. prompts.py - Prompt Templates

**Purpose**: Defines prompts for all system components.

**Key Prompts:**
- **RAG Chain Prompt** - Response generation with context
- **Question Router Prompt** - Query classification
- **Retrieval Grader** - Document relevance scoring
- **Hallucination Grader** - Fact-checking responses
- **Answer Grader** - Response quality assessment

**SuperVanni Persona:**
- Expert AI assistant for Plaksha University
- Authoritative and confident tone
- Concise and relevant responses
- No source citations in output
- Includes person details (expertise, email, webpage)

### 7. ingest.py - Vector Database Creation

**Purpose**: Creates FAISS vector stores from Excel files.

**Process:**
1. Load Excel files from directory
2. Split into chunks (1000 chars, 100 overlap)
3. Generate embeddings
4. Create FAISS index
5. Save to disk

**Unified SQL Vector DB:**
- Combines courses and expertise
- Includes professor metadata
- Enables hybrid search

---

## Data Flow

### Complete Query Processing Flow

```
User Query → Router → Data Source Selection
    ↓
┌───────────┬────────────┬─────────────┬──────────┐
│  Founder  │  Faculty   │   Others    │ Library  │
│   (Vec)   │ (SQL+Vec)  │    (Vec)    │  (Vec)   │
└───────────┴────────────┴─────────────┴──────────┘
    ↓
Document Aggregation
    ↓
Generator (RAG Chain)
    ↓
Final Response
```

### Faculty Query Example

```
"Who teaches deep learning?"
    ↓
Router → faculty
    ↓
retrieve_sql()
    ├─ SQL: Find professors teaching DL
    └─ Vector: Find DL course embeddings
    ↓
Documents Combined
    ↓
Generate Response
    ↓
"Dr. Smith teaches Deep Learning (CS501)..."
```

---

## Configuration

### Environment Variables

Configure the following in your environment:

**Database:**
- Database host, port, user, password
- Database name

**Vector Store Paths:**
- Personnel vector store path
- General info vector store path
- Library vector store path
- SQL unified vector store path

**LLM:**
- Model name (default: llama3.1:8b)
- Temperature setting

**Retrieval:**
- Top K values for each retriever

### Embedding Configuration

**Model:** sentence-transformers/all-MiniLM-L6-v2
- Dimensions: 384
- Max sequence: 256 tokens
- Fast on CPU
- Size: ~80MB

---

## Usage Guide

### Basic Usage

1. Import and initialize the application
2. Invoke with a question
3. Retrieve the generated response

### Example Queries

**Faculty Expertise:**
"Which professors specialize in artificial intelligence?"

**Course Information:**
"Tell me about the deep learning course"

**Founder Information:**
"Who founded Plaksha University?"

**Library Resources:**
"Do you have books on algorithms?"

**General Queries:**
"Who should I contact in case of emergency?"

### Retrieval Parameters

Retrieval parameters can be customized in `retrieval.py`:
- Adjust `k` values for different retrievers
- Modify search types (similarity, MMR)
- Configure fetch and diversity parameters

---

## Troubleshooting

### Common Issues

**1. Database Connection Error**
- Verify database is running
- Check credentials
- Ensure database exists
- Verify firewall settings

**2. Vector Store Loading Error**
- Run ingestion scripts to create stores
- Check path configurations
- Verify read permissions
- Ensure deserialization flag is set

**3. Ollama Model Not Found**
- Pull the required model
- Verify installation
- Start Ollama service

**4. Out of Memory**
- Use CPU instead of GPU
- Reduce chunk sizes
- Lower batch sizes

**5. Slow Query Performance**
- Reduce top K values
- Add database indexes
- Use approximate search in FAISS

**6. Incorrect Routing**
- Review routing prompt
- Adjust temperature
- Add debug logging

**7. Hallucination**
- Lower generation temperature
- Strengthen grounding in prompts
- Implement hallucination grading

**8. SQL Query Errors**
- Enhance SQL prompt with examples
- Add retry logic
- Log generated SQL for debugging

### Debugging

Enable verbose logging:
- Set logging level to DEBUG
- Add callback handlers
- Insert print statements in nodes

---

## Flask API Documentation

### API Structure

```
api/
├── __init__.py
└── v1/
    ├── app.py                  # Flask application entry point
    ├── config.py               # Configuration settings
    └── views/
        ├── __init__.py         # Blueprint registration
        ├── database.py         # SQLite database operations
        ├── general_page.py     # Main API endpoints
        └── landing_page.py     # Home endpoint
```

### Quick Start

Set required environment variables and run the Flask application. See `app.py` for configuration details.

### API Endpoints

#### 1. Health Check
`GET /api/home` - Verify API is running

#### 2. Chat with SuperVaani
`POST /api/<userID>/supervaani` - Send message to AI assistant

**Request:**
- `user_message`: User's question
- `conversation_id`: Optional conversation ID

**Response:**
- `supervaani_message`: AI response
- `conversation_id`: Conversation identifier

**Features:**
- Automatic conversation creation
- History maintained in SQLite
- 30-minute session timeout
- Context-aware responses

#### 3. Get User Conversations
`GET /api/<userID>/conversations` - List user's conversation history

**Parameters:**
- `limit`: Number of conversations (default: 10)
- `offset`: Pagination offset (default: 0)

#### 4. Get Conversation Messages
`GET /api/<userID>/conversations/<conversationID>` - Retrieve all messages in a conversation

#### 5. End User Session
`POST /api/<userID>/leave` - Clean up user session

#### 6. Upload Data File
`POST /api/upload_file` - Upload Q&A data files

**Requirements:**
- Excel file (.xlsx)
- Columns: "Questions" and "Answers"
- User authorization required

**Process:**
1. File validation
2. Save to data directory
3. Run ingestion script
4. Update vector store

### Database Schema

**SQLite Tables:**
- `conversations` - Conversation metadata
- `messages` - Chat messages
- `user_sessions` - User activity tracking

See `database.py` for complete schema.

### Key Features

**Session Management:**
- User-specific conversation chains
- 30-minute inactivity timeout
- Automatic cleanup
- SQLite persistence

**Context-Aware Responses:**
- Previous conversation history included
- Full context passed to RAG system
- Maintains flow across sessions

**File Upload Security:**
- Email-based authorization
- File type validation
- Column validation
- Path traversal prevention

### Error Responses

- `400` - Invalid request
- `403` - Unauthorized
- `404` - Not found
- `500` - Server error

---

## Frontend Application

### Pages Overview

Two main pages with Microsoft SSO authentication:

```
frontend/
├── /chat                    # Main chat interface
└── /upload                  # Data upload page (restricted)
```

### Authentication

**Microsoft SSO Integration:**
- All pages require authentication
- Domain restriction: @plaksha.edu only
- Session management
- Automatic login redirect

### 1. Chat Page

**Purpose:** Interactive chat interface with SuperVaani

**Features:**
- Real-time conversation
- Conversation history sidebar
- Context-aware responses
- Message persistence

**Access:** All authenticated Plaksha users

**UI Layout:**
```
┌─────────────────────────────────────────────────┐
│  SuperVaani                         [User Menu] │
├───────────┬─────────────────────────────────────┤
│ History   │  Chat Window                        │
│ • Conv 1  │  User: Question here                │
│ • Conv 2  │  Bot: Response here                 │
│           │  [Type message...]        [Send]    │
└───────────┴─────────────────────────────────────┘
```

**User Flow:**
1. Login with Plaksha account
2. View conversation history
3. Start or continue conversations
4. Receive AI responses with context

### 2. Upload Page

**Purpose:** Upload Q&A data to extend knowledge base

**Access Control:**
- ✅ IT staff
- ✅ SuperVaani creators
- ❌ Regular users

**Authorization:**
Two-tier system:
1. Microsoft SSO (@plaksha.edu required)
2. Email whitelist check

**UI Layout:**
```
┌─────────────────────────────────────────────────┐
│  SuperVaani - Upload                [User Menu] │
├─────────────────────────────────────────────────┤
│  Upload Q&A Data File                           │
│                                                 │
│  Requirements:                                  │
│  • Excel format (.xlsx)                         │
│  • Columns: Questions, Answers                  │
│  • First row: Headers                           │
│                                                 │
│  [Choose File]  file.xlsx         [Upload]     │
│                                                 │
│  Status: ✓ Upload successful                   │
└─────────────────────────────────────────────────┘
```

**File Requirements:**

Excel structure:
- Column 1: "Questions" or "Question"
- Column 2: "Answers" or "Answer"
- First row must be headers
- Questions and answers in subsequent rows

**Upload Process:**
1. User authentication via SSO
2. Authorization check
3. File selection
4. Format validation
5. Upload to server
6. Vector store regeneration
7. Confirmation message

**Error Handling:**
- Unauthorized user → 403 error
- Invalid format → Validation message
- Missing columns → Format error
- Processing failure → Error details

### User Roles

| Role | Chat Access | Upload Access |
|------|-------------|---------------|
| Student/Faculty | ✅ | ❌ |
| IT Staff | ✅ | ✅ |
| SuperVaani Team | ✅ | ✅ |

### Frontend-Backend Flow

**Chat:**
```
User → SSO Login → Chat Page
    ↓
POST /api/{email}/supervaani
    ↓
Backend RAG Processing
    ↓
Response Display
```

**Upload:**
```
User → SSO Login → Authorization Check
    ↓ (if authorized)
File Selection → POST /api/upload_file
    ↓
Validation → Save → Ingest
    ↓
Success Confirmation
```

### Deployment Checklist

**Frontend:**
- [ ] Configure Microsoft SSO
- [ ] Set API endpoint
- [ ] Configure authorization list
- [ ] Enable HTTPS
- [ ] Test authentication
- [ ] Verify domain restriction

**Backend:**
- [ ] Match authorization emails
- [ ] Configure upload directory
- [ ] Set up CORS
- [ ] Configure ingestion script
- [ ] Test file processing

---

## Performance Optimization

### Caching
Implement caching for repeated queries to reduce latency.

### Batch Processing
Process multiple queries in parallel when possible.

### Database Optimization
- Add appropriate indexes
- Optimize join queries
- Analyze tables regularly

### Vector Store Optimization
Consider IVF indexes for large-scale deployments.

---

## Maintenance

### Regular Tasks

**Weekly:**
- Monitor performance logs
- Check database health
- Review error logs

**Monthly:**
- Update vector stores
- Optimize database indexes
- Review prompts

**Quarterly:**
- Evaluate model updates
- Performance benchmarking
- Security audit

### Updating Data

**Vector Stores:**
1. Place new files in data directories
2. Run ingestion scripts
3. Restart application

**SQL Database:**
1. Update database records
2. Regenerate unified vector store

---

## Security Considerations

### Authentication
- Microsoft SSO for all pages
- Domain restriction enforcement
- Session management

### Authorization
- Role-based access control
- Email whitelist for uploads
- Input sanitization

### Data Protection
- Secure credential storage
- SQL injection prevention
- Path traversal protection
- Rate limiting (recommended)

---

## Future Enhancements

### Planned Features
1. Multi-language support
2. Voice interface
3. User preference learning
4. Advanced analytics
5. Real-time data sync
6. Mobile applications

---

## License & Credits

### Technologies Used
- LangChain - RAG framework
- LangGraph - Workflow orchestration
- FAISS - Vector similarity search
- Ollama - Local LLM serving
- HuggingFace - Embedding models
- MySQL - Relational database
- SQLite - Conversation storage
- Flask - API framework

### Credits
- Developed for Roma,Chaitanya,Manjree,Vandita,Usman under the supervision of Anupam Sobti 
- Powered by llama3.1:8b
- Embeddings: sentence-transformers/all-MiniLM-L6-v2

---

**Last Updated**: December 2024  
**Version**: 1.0  
**Status**: Production Ready
