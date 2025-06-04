"""
🧠 embed_chunks_usps_manual_corrected.py

Purpose:
- Reads all rows from `usps_manual_chunks` in Supabase where `embedding IS NULL`
- Generates vector embeddings via OpenAI (`text-embedding-ada-002`)
- Updates the `embedding` column in-place

Assumes schema:
- id (UUID)
- series (TEXT)
- file_name (TEXT)
- manual_title (TEXT)
- page_number (INT)
- chunk_index (INT)
- content (TEXT)
- article_number (TEXT)
- embedding (VECTOR[1536])
"""

import os
import time
import socket
import openai
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

# Load environment
load_dotenv(".env")
openai.api_key = os.getenv("OPENAI_API_KEY")
db_url = os.getenv("SUPABASE_DB_URL")

if not openai.api_key or not db_url:
    raise ValueError("Missing OPENAI_API_KEY or SUPABASE_DB_URL in .env")

def parse_db_url(url):
    import re
    m = re.match(r"postgres(?:ql)?://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)", url)
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
    return socket.gethostbyname(host)

def get_db_connection(db_params, ip):
    return psycopg2.connect(
        dbname=db_params["dbname"],
        user=db_params["user"],
        password=db_params["password"],
        host=ip,
        port=db_params["port"],
        sslmode="require"
    )

def embed_text(client, text, retries=5):
    for attempt in range(retries):
        try:
            response = client.embeddings.create(
                model="text-embedding-ada-002",
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"Retrying embedding... ({attempt+1}/5) Error: {e}")
            time.sleep(2 * (attempt + 1))
    raise RuntimeError("Embedding failed after multiple attempts")

def main():
    db_params = parse_db_url(db_url)
    ip = resolve_ipv4(db_params["host"])
    conn = get_db_connection(db_params, ip)
    client = openai.OpenAI()

    total = 0
    success = 0
    start = time.time()

    try:
        with conn, conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute("""
                SELECT id, content FROM usps_manual_chunks
                WHERE embedding IS NULL
                ORDER BY id
            """)
            rows = cur.fetchall()
            total = len(rows)
            print(f"🔍 Found {total} chunks to embed.")

            for idx, row in enumerate(rows, 1):
                chunk_id = row["id"]
                content = row["content"]
                if not content or len(content.strip()) < 10:
                    continue
                try:
                    vector = embed_text(client, content)
                    cur.execute(
                        "UPDATE usps_manual_chunks SET embedding = %s WHERE id = %s",
                        (vector, chunk_id)
                    )
                    success += 1
                    print(f"✅ [{idx}/{total}] Embedded {chunk_id} (Total successes: {success})")
                    if idx % 10 == 0:
                        conn.commit()
                except Exception as e:
                    print(f"❌ Failed to embed {chunk_id}: {e}")
            conn.commit()
    finally:
        conn.close()
        print(f"🏁 Embedding complete. {success}/{total} chunks embedded in {time.time() - start:.2f}s")

if __name__ == "__main__":
    main()
