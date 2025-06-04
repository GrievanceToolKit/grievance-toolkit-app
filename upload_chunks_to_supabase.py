import os
import csv
import time
from supabase import create_client, Client
from dotenv import load_dotenv

# Load credentials
load_dotenv(".env")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# CSV path and batch config
csv_file = "usps_chunks_batch.csv"
BATCH_SIZE = 100
MAX_RETRIES = 3

# Read CSV into row dicts
def read_csv_rows(file_path):
    with open(file_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)

# Chunk generator
def chunked(iterable, size):
    for i in range(0, len(iterable), size):
        yield iterable[i:i + size]

# Upload with retry + logging
def upload_batch(batch, attempt=1):
    try:
        result = supabase.table("usps_manual_chunks").upsert(batch, on_conflict="id").execute()
        if getattr(result, "data", None):
            return True
        print(f"❌ Batch insert failed (attempt {attempt}):", getattr(result, "model_dump", lambda: {})())
    except Exception as e:
        print(f"❌ Exception on attempt {attempt}: {e}")
    return False

# Main upload flow
def main():
    rows = read_csv_rows(csv_file)
    total = len(rows)
    uploaded = 0

    for batch_num, batch in enumerate(chunked(rows, BATCH_SIZE), 1):
        formatted_batch = []
        for row in batch:
            formatted_batch.append({
                "id": row["id"],
                "series": row["series"],
                "file_name": row["file_name"],
                "manual_title": row.get("manual_title", "Unknown").replace("\u0000", "").replace("\x00", ""),
                "page_number": int(row["page_number"]),
                "chunk_index": int(row["chunk_index"]),
                "content": row["content"].replace("\u0000", "").replace("\x00", ""),
                "article_number": row.get("article_number", "").replace("\u0000", "").replace("\x00", ""),
                "embedding": None
            })

        success = False
        for attempt in range(1, MAX_RETRIES + 1):
            if upload_batch(formatted_batch, attempt):
                uploaded += len(formatted_batch)
                print(f"✅ Batch {batch_num} uploaded ({uploaded}/{total})")
                success = True
                break
            time.sleep(2 * attempt)

        if not success:
            print(f"❌ Batch {batch_num} permanently failed after {MAX_RETRIES} attempts.")
            # Log failed batch rows
            with open("upload_failed_log.csv", "a", encoding="utf-8", newline="") as logf:
                writer = csv.DictWriter(logf, fieldnames=batch[0].keys())
                if logf.tell() == 0:
                    writer.writeheader()
                writer.writerows(batch)

    print(f"\n🏁 Upload complete: {uploaded}/{total} rows inserted or upserted.")

if __name__ == "__main__":
    main()
