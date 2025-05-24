#!/usr/bin/env python3
"""
embed_diagnostic.py

Diagnostic script for OpenAI + Supabase Postgres embedding pipeline.
"""
import os
import sys
import logging
import socket
import psycopg2
import openai
from dotenv import load_dotenv

# --- Logging setup ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[logging.StreamHandler()]
)

# --- Load environment variables ---
logging.info("Loading .env file and environment variables...")
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL")

if not OPENAI_API_KEY:
    logging.error("OPENAI_API_KEY is missing from environment.")
    sys.exit(1)
if not SUPABASE_DB_URL:
    logging.error("SUPABASE_DB_URL is missing from environment.")
    sys.exit(1)
logging.info("Found OPENAI_API_KEY and SUPABASE_DB_URL.")

# --- Parse DB URL ---
def parse_db_url(db_url):
    import re
    m = re.match(r"postgres(?:ql)?://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)", db_url)
    if not m:
        raise ValueError("Invalid SUPABASE_DB_URL format")
    return {
        "user": m.group(1),
        "password": m.group(2),
        "host": m.group(3),
        "port": m.group(4),
        "dbname": m.group(5),
    }

try:
    db_params = parse_db_url(SUPABASE_DB_URL)
    logging.info(f"Parsed DB URL: host={db_params['host']} port={db_params['port']} user={db_params['user']} dbname={db_params['dbname']}")
except Exception as e:
    logging.error(f"Failed to parse SUPABASE_DB_URL: {e}")
    sys.exit(1)

# --- Resolve IPv4 address ---
try:
    host = db_params["host"]
    ip = socket.gethostbyname(host)
    logging.info(f"Resolved IPv4 address: {ip}")
except Exception as e:
    logging.error(f"Failed to resolve IPv4 address for {host}: {e}")
    sys.exit(1)

# --- Try DB connection ---
try:
    logging.info("Attempting to connect to Postgres via psycopg2 (5s timeout)...")
    conn = psycopg2.connect(
        dbname=db_params["dbname"],
        user=db_params["user"],
        password=db_params["password"],
        hostaddr=ip,
        port=db_params["port"],
        sslmode="require",
        connect_timeout=5
    )
    logging.info("Postgres connection established.")
    with conn.cursor() as cur:
        cur.execute("SELECT 1;")
        result = cur.fetchone()
        if result and result[0] == 1:
            logging.info("Test query SELECT 1 succeeded.")
        else:
            logging.error("Test query SELECT 1 failed.")
    conn.close()
except Exception as e:
    logging.error(f"Failed to connect/query Postgres: {e}")
    sys.exit(1)

# --- Test OpenAI Embedding ---
openai.api_key = OPENAI_API_KEY
try:
    logging.info("Testing OpenAI Embedding API with dummy text...")
    dummy_text = "This is a test for OpenAI embedding diagnostics."
    resp = openai.Embedding.create(input=dummy_text, model="text-embedding-ada-002")
    embedding = resp["data"][0]["embedding"]
    logging.info(f"OpenAI embedding call succeeded. Token length: {len(dummy_text.split())}, Embedding vector length: {len(embedding)}")
except Exception as e:
    logging.error(f"OpenAI Embedding API test failed: {e}")
    sys.exit(1)

logging.info("All diagnostics passed!")
