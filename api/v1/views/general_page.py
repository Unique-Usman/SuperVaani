#!/usr/bin/python3
"""
Deals with the RESTful API action(s) of the general page with conversation memory
stored in SQLite database.
"""
from api.v1.views import app_views
import traceback
from flask import jsonify, request
import os
import asyncio
import logging
import json
import time
import subprocess
import re
from datetime import datetime
from models.research.main import create_app as qa_bot
from openpyxl import load_workbook

# Import database configuration
from database import get_db_connection

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

UPLOAD_FOLDER = "/home/anupam/SuperVaani/models/others_data"
USER_TIMEOUT = 30 * 60  # 30 minutes in seconds

# Get conversation history for a user
def get_conversation_history(conversation_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get all messages for the conversation ordered by timestamp
        cursor.execute('''
        SELECT id, role, content, timestamp
        FROM messages
        WHERE conversation_id = ?
        ORDER BY timestamp ASC
        ''', (conversation_id,))
        
        messages = []
        for row in cursor.fetchall():
            messages.append({
                'id': row['id'],
                'role': row['role'],
                'content': row['content'],
                'timestamp': row['timestamp']
            })
            
        return messages
    except Exception as e:
        logger.error(f"Error retrieving conversation history: {e}")
        return []
    finally:
        conn.close()

# Save a new message to the database
def save_message(message_id, conversation_id, role, content):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Insert message
        cursor.execute('''
        INSERT INTO messages (id, conversation_id, role, content)
        VALUES (?, ?, ?, ?)
        ''', (message_id, conversation_id, role, content))
        
        # Update conversation last activity time
        cursor.execute('''
        UPDATE conversations
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        ''', (conversation_id,))
        
        conn.commit()
        logger.info(f"Message {message_id} saved to conversation {conversation_id}")
        return True
    except Exception as e:
        conn.rollback()
        logger.error(f"Error saving message: {e}")
        return False
    finally:
        conn.close()

# Create a new conversation
def create_conversation(conversation_id, user_id, title):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
        INSERT INTO conversations (id, user_id, title)
        VALUES (?, ?, ?)
        ''', (conversation_id, user_id, title))
        
        conn.commit()
        logger.info(f"Created new conversation {conversation_id} for user {user_id}")
        return True
    except Exception as e:
        conn.rollback()
        logger.error(f"Error creating conversation: {e}")
        return False
    finally:
        conn.close()

# Get user's conversations
def get_user_conversations(user_id, limit=10, offset=0):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
        SELECT id, title, created_at, updated_at
        FROM conversations
        WHERE user_id = ?
        ORDER BY updated_at DESC
        LIMIT ? OFFSET ?
        ''', (user_id, limit, offset))
        
        conversations = []
        for row in cursor.fetchall():
            conversations.append({
                'id': row['id'],
                'title': row['title'],
                'created_at': row['created_at'],
                'updated_at': row['updated_at']
            })
            
        return conversations
    except Exception as e:
        logger.error(f"Error retrieving user conversations: {e}")
        return []
    finally:
        conn.close()

# Update user session activity
def update_user_activity(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
        INSERT INTO user_sessions (user_id, last_activity)
        VALUES (?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET last_activity = CURRENT_TIMESTAMP
        ''', (user_id,))
        
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Error updating user activity: {e}")
    finally:
        conn.close()

# Format conversation history for AI context
def format_conversation_for_ai(messages):
    formatted_history = ""
    for msg in messages:
        role = "User" if msg['role'] == "user" else "Assistant"
        formatted_history += f"{role}: {msg['content']}\n\n"
    return formatted_history

# Dictionary to store user-specific conversation chains
supervaani_chains = {}
last_activity = {}

# Cleanup inactive users periodically
def cleanup_inactive_users():
    current_time = time.time()
    users_to_remove = []
    
    # Identify inactive users
    for user_id, last_time in last_activity.items():
        if current_time - last_time > USER_TIMEOUT:
            users_to_remove.append(user_id)
    
    # Remove inactive users
    for user_id in users_to_remove:
        if user_id in supervaani_chains:
            del supervaani_chains[user_id]
        del last_activity[user_id]
        logger.info(f"Cleaned up inactive user: {user_id}")

# Start a background task for cleanup (in a production app, you'd use a proper scheduler)
async def periodic_cleanup():
    while True:
        cleanup_inactive_users()
        await asyncio.sleep(300)  # Run every 5 minutes

# Start the cleanup task if not already running
try:
    loop = asyncio.get_event_loop()
    if not loop.is_running():
        asyncio.ensure_future(periodic_cleanup())
except RuntimeError:
    # Handle case where there's no running event loop
    pass

@app_views.route("/<userID>/supervaani", methods=['POST'], strict_slashes=False)
def handle_supervaani(userID):
    # Validate request format
    content_type = request.headers.get("Content-Type")
    if content_type != "application/json":
        return jsonify({"message": "Not a JSON"}), 400
    
    # Extract user message and conversation ID
    content = request.get_json()
    user_input = content.get("user_message", None)
    conversation_id = content.get("conversation_id", None)
    
    if user_input is None:
        return jsonify({"message": "Missing user_message"}), 400
    
    # Clean userID to prevent injection
    userID = re.sub(r'[^\w@.-]', '_', userID)
    
    # Generate a new conversation ID if not provided
    if not conversation_id:
        conversation_id = f"conv_{int(time.time())}_{userID}"
        # Create a new conversation in the database
        title = user_input[:30] + ('...' if len(user_input) > 30 else '')
        create_conversation(conversation_id, userID, title)
    
    # Generate unique message ID
    user_message_id = f"msg_user_{int(time.time())}"
    
    # Save user message to database
    save_message(user_message_id, conversation_id, "user", user_input)
    
    # Update user activity
    update_user_activity(userID)
    last_activity[userID] = time.time()
    
    # Get conversation history for context
    conversation_history = get_conversation_history(conversation_id)
    conversation_context = format_conversation_for_ai(conversation_history)
    
    # Get or create user's conversation chain
    supervaani_chain = supervaani_chains.get(userID, None)
    if supervaani_chain is None:
        logger.info(f"Creating new chain for user {userID}")
        supervaani_chain = qa_bot()
        supervaani_chains[userID] = supervaani_chain
    
    try:
        # Prepare the message with context
        question_with_context = f"Previous conversation:\n{conversation_context}\n\nCurrent question: {user_input}"
        
        # Process the message
        result = supervaani_chain.invoke({"question": question_with_context})
        assistant_response = result.get("generation", None)
        
        if not assistant_response:
            assistant_response = "I'm not sure how to respond to that. Could you please rephrase your question?"
        
        # Save assistant response to database
        assistant_message_id = f"msg_assistant_{int(time.time())}"
        save_message(assistant_message_id, conversation_id, "assistant", assistant_response)
        
    except Exception as e:
        logger.error(f"Error processing request: {e}")
        error_string = traceback.format_exc()
        assistant_response = f"Sorry, something went wrong. Please contact the developer. Error: {error_string}"
    
    return jsonify({
        "supervaani_message": assistant_response,
        "conversation_id": conversation_id
    }), 200

@app_views.route("/<string:userID>/conversations", methods=['GET'], strict_slashes=False)
def get_conversations(userID):
    # Clean userID to prevent injection
    userID = re.sub(r'[^\w@.-]', '_', userID)
    
    # Get pagination parameters
    limit = int(request.args.get('limit', 10))
    offset = int(request.args.get('offset', 0))
    
    # Get user's conversations
    conversations = get_user_conversations(userID, limit, offset)
    
    # Check if there are more conversations
    has_more = len(conversations) == limit
    
    return jsonify({
        "conversations": conversations,
        "has_more": has_more
    }), 200

@app_views.route("/<string:userID>/conversations/<string:conversationID>", methods=['GET'], strict_slashes=False)
def get_conversation_messages(userID, conversationID):
    # Clean IDs to prevent injection
    userID = re.sub(r'[^\w@.-]', '_', userID)
    conversationID = re.sub(r'[^\w@.-]', '_', conversationID)
    
    # Get conversation messages
    messages = get_conversation_history(conversationID)
    
    return jsonify({
        "messages": messages
    }), 200

@app_views.route("/<string:userID>/leave", methods=['POST'], strict_slashes=False)
def handle_leave(userID):
    # Clean userID to prevent injection
    userID = re.sub(r'[^\w@.-]', '_', userID)
    
    if userID in supervaani_chains:
        del supervaani_chains[userID]
        if userID in last_activity:
            del last_activity[userID]
        logger.info(f"User {userID} session ended")
    
    return jsonify({"supervaani_message": "User session ended"}), 200

@app_views.route('/upload_file', methods=['POST'])
def upload_file():
    # Handle file uploads

    user_id = request.form.get('user_id', '').strip()

    authorized_emails_str = os.getenv('AUTHORIZED_UPLOAD_EMAILS', '')
    print(authorized_emails_str)
    if not authorized_emails_str:
        return jsonify({"error": f"Authorization system not configured {authorized_emails_str}"}), 500

    # Parse and normalize authorized emails
    authorized_emails = [email.strip().lower() for email in authorized_emails_str.split(',')]

    # Check authorization
    if not user_id or user_id.lower() not in authorized_emails:
        return jsonify({
            "error": "Unauthorized - You do not have permission to upload files"
        }), 403

    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    # Validate file type
    if file and file.filename.endswith('.xlsx'):
        # Get user ID if available
        user_id = request.form.get('user_id', 'anonymous')
        # Clean user_id to prevent path traversal
        user_id = re.sub(r'[^\w@.-]', '_', user_id)
        
        # Create user directory if it doesn't exist
        user_dir = os.path.join(UPLOAD_FOLDER, "")
        os.makedirs(user_dir, exist_ok=True)
        
        # Save file with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = re.sub(r'[^\w.-]', '_', file.filename)
        filename = f"{safe_filename}"
        file_path = os.path.join(user_dir, filename)
        

        file.save(file_path)
        try:
            # Validate the uploaded file
            workbook = load_workbook(file_path)
            sheet = workbook.active  # Get the first sheet
            headers = [cell.value.strip().lower() for cell in sheet[1] if cell.value]  # Read the first row

            # Ensure the required columns are present
            if not any(header in headers for header in ['questions', 'question']) or \
               not any(header in headers for header in ['answers', 'answer']):
                return jsonify({"error": "Invalid file format. The first row must contain 'Questions'/'Question' and 'Answers'/'Answer' columns."}), 400
        except Exception as e:
            return jsonify({"error": f"Failed to process the file: {str(e)}"}), 400

        try:
            # Run the ingestion script
            script_path = "/home/anupam/SuperVaani/models/ingest_others_data.py"
            
            # Run script in background (non-blocking)
            # Option 1: Run and wait for completion
            result = subprocess.run(
                ['python3', script_path],
                cwd='/home/anupam/SuperVaani/models',
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode != 0:
                return jsonify({
                    "error": "File uploaded but processing failed",
                    "details": result.stderr
                }), 500
            
            return jsonify({
                "message": "File uploaded and processed successfully",
                "filename": file.filename,
                "user_id": user_id,
                "script_output": result.stdout
            }), 200
            
        except subprocess.TimeoutExpired:
            return jsonify({
                "error": "File uploaded but processing timed out"
            }), 500

    
    return jsonify({"error": "Invalid file type"}), 400
