# db_config.py
import os
import sqlite3
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Determine application root directory
APP_ROOT = os.path.dirname(os.path.abspath(__file__))

# Create data directory if it doesn't exist
DATA_DIR = os.path.join(APP_ROOT, 'data')
os.makedirs(DATA_DIR, exist_ok=True)

# Default database path
DEFAULT_DB_PATH = os.path.join(DATA_DIR, 'supervaani.db')

# Get database path from environment variable or use default
DB_PATH = os.environ.get('SUPERVAANI_DB_PATH', DEFAULT_DB_PATH)

def get_db_connection():
    """
    Get a connection to the SQLite database.
    
    Returns:
        sqlite3.Connection: A connection to the database
    """
    try:
        # Connect to the database
        conn = sqlite3.connect(DB_PATH)
        
        # Enable foreign key constraints
        conn.execute("PRAGMA foreign_keys = ON")
        
        # Configure row factory to enable column access by name
        conn.row_factory = sqlite3.Row
        
        return conn
    except sqlite3.Error as e:
        logger.error(f"Database connection error: {e}")
        raise

def init_db():
    """
    Initialize the database with required tables.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create conversations table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # Create messages table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id)
        )
        ''')
        
        # Create user_sessions table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_sessions (
            user_id TEXT PRIMARY KEY,
            last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        conn.commit()
        logger.info(f"Database initialized successfully at {DB_PATH}")
    except sqlite3.Error as e:
        logger.error(f"Database initialization error: {e}")
        raise
    finally:
        if conn:
            conn.close()

# Initialize the database when this module is imported
init_db()
