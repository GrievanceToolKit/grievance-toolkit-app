#!/usr/bin/env python3
"""
embed_chunks.py

Production-grade embedding pipeline for Supabase + OpenAI v1.x
"""
import os
import sys
import time
import logging
import socket
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
import openai

# --- Logging setup ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[logging.StreamHandler()]
)

def load_env():
    load_dotenv()
    openai_api_key = os.getenv("OPENAI_API_KEY")
    supabase_db_url = os.getenv("SUPABASE_DB_URL")
    if not openai_api_key:
        logging.error("OPENAI_API_KEY is missing from environment.")
        sys.exit(1)
    if not supabase_db_url:
        logging.error("SUPABASE_DB_URL is missing from environment.")
        sys.exit(1)
    return openai_api_key, supabase_db_url

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

def resolve_ipv4(host):
    try:
        ip = socket.gethostbyname(host)
        logging.info(f"Resolved IPv4 address: {ip}")
        return ip
    except Exception as e:
        logging.error(f"Failed to resolve IPv4 address for {host}: {e}")
        sys.exit(1)

def get_db_connection(db_params, ip):
    try:
        conn = psycopg2.connect(
            dbname=db_params["dbname"],
            user=db_params["user"],
            password=db_params["password"],
            hostaddr=ip,
            port=db_params["port"],
            sslmode="require"
        )
        return conn
    except Exception as e:
        logging.error(f"Failed to connect to database: {e}")
        sys.exit(1)

def embed_text_chunk(client, text, max_retries=5):
    delay = 2
    for attempt in range(max_retries):
        try:
            resp = client.embeddings.create(
                input=text,
                model="text-embedding-ada-002"
            )
            return resp.data[0].embedding
        except Exception as e:
            logging.warning(f"OpenAI error: {e} (attempt {attempt+1})")
            if attempt == max_retries - 1:
                raise
            time.sleep(delay)
            delay *= 2

def main():
    openai_api_key, supabase_db_url = load_env()
    db_params = parse_db_url(supabase_db_url)
    ip = resolve_ipv4(db_params["host"])
    client = openai.OpenAI(api_key=openai_api_key)
    conn = get_db_connection(db_params, ip)
    success_count = 0
    start_time = time.time()
    try:
        with conn, conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute("""
                SELECT id, text_chunk FROM public.document_chunks
                WHERE embedding IS NULL
                ORDER BY id
            """)
            rows = cur.fetchall()
            total = len(rows)
            logging.info(f"Found {total} chunks to embed.")
            for idx, row in enumerate(rows, 1):
                chunk_id = row["id"]
                text = row["text_chunk"]
                if not text or not text.strip():
                    logging.info(f"Skipping empty text_chunk for id={chunk_id}")
                    continue
                try:
                    embedding = embed_text_chunk(client, text)
                    cur.execute(
                        "UPDATE public.document_chunks SET embedding = %s WHERE id = %s",
                        (embedding, chunk_id)
                    )
                    success_count += 1
                    logging.info(f"[{idx}/{total}] Embedded id={chunk_id} (successes: {success_count})")
                    if idx % 10 == 0 or idx == total:
                        conn.commit()
                        logging.info(f"Committed batch at idx={idx}")
                except Exception as e:
                    logging.error(f"Failed to embed id={chunk_id}: {e}")
                    continue
            conn.commit()
            elapsed = time.time() - start_time
            logging.info(f"Embedding complete. {success_count}/{total} chunks embedded. Time taken: {elapsed:.2f}s")
    except KeyboardInterrupt:
        conn.commit()
        logging.warning("Interrupted by user. Partial progress committed.")
    finally:
        conn.close()
        logging.info("Database connection closed.")

if __name__ == "__main__":
    main()
