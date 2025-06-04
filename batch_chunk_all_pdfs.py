import os
import fitz  # PyMuPDF
import csv
import uuid
import re

# Config
INPUT_FOLDER = "input_pdfs"
OUTPUT_CSV = "usps_chunks_batch.csv"
CHUNK_SIZE = 1000

# Manual code → title mapping
manual_titles = {
    "ms-45": "Field Maintenance Program",
    "ms-47": "Custodial Workloading Handbook",
    "el-801": "Safety and Health Program",
    "cba-2024": "APWU National Agreement 2021–2024",
    "jcim-2023": "Joint Contract Interpretation Manual",
    "f-21": "Time and Attendance Handbook",
    "po-701": "Fleet Management Guide",
    "asm": "Administrative Support Manual",
    "ps-603": "Rural Carrier Duties and Responsibilities",
    # Add more as needed
}

# Cleanup + detection
def clean_text(text: str) -> str:
    return text.replace('\u2028', '\n').replace('\u2029', '\n').strip()

def chunk_text(text: str, chunk_size: int = CHUNK_SIZE):
    words = text.split()
    for i in range(0, len(words), chunk_size):
        yield ' '.join(words[i:i + chunk_size])

def extract_article(text: str) -> str:
    match = re.search(r'Article\s+(\d{1,2}(\.\d+)?[A-Z]?)', text, re.IGNORECASE)
    return match.group(0) if match else ""

# CSV output
with open(OUTPUT_CSV, mode="w", newline='', encoding='utf-8') as csvfile:
    writer = csv.DictWriter(csvfile, fieldnames=[
        "id", "series", "file_name", "manual_title", "page_number",
        "chunk_index", "content", "article_number", "embedding"
    ])
    writer.writeheader()

    for file in os.listdir(INPUT_FOLDER):
        if not file.lower().endswith(".pdf"):
            continue
        path = os.path.join(INPUT_FOLDER, file)
        try:
            # Use first dash for series, but allow fallback to UNKNOWN
            series = file.split("-")[0].upper() if "-" in file else "UNKNOWN"
            # Remove _ocred and .pdf, then match to manual_titles
            base = file.replace("_ocred", "").replace(".pdf", "").lower()
            title = manual_titles.get(base, "Unknown Manual")
            doc = fitz.open(path)
            for page_number, page in enumerate(doc, start=1):
                text = clean_text(page.get_text())
                for chunk_index, chunk in enumerate(chunk_text(text)):
                    if len(chunk.strip()) < 150:
                        continue
                    writer.writerow({
                        "id": str(uuid.uuid4()),
                        "series": series,
                        "file_name": file,
                        "manual_title": title,
                        "page_number": page_number,
                        "chunk_index": chunk_index,
                        "content": chunk,
                        "article_number": extract_article(chunk),
                        "embedding": ""
                    })
        except Exception as e:
            print(f"❌ Failed to process {file}: {e}")
