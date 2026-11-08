import json, os, re, requests
from dotenv import load_dotenv
load_dotenv()

d = json.load(open("result4.json"))["data"]
ids = []
for p in d["papers"]:
    m = re.match(r"^(\d{4}\.\d{4,5})", p["id"])
    ids.append(m.group(1) if m else p["id"])
print("ids:", len(ids), ids[:3], "...")
print("key loaded:", bool(os.getenv("SEMANTIC_SCHOLAR_API_KEY")))

headers = {"x-api-key": os.environ["SEMANTIC_SCHOLAR_API_KEY"]} if os.getenv("SEMANTIC_SCHOLAR_API_KEY") else {}
for n in (5, 50, 100):
    r = requests.post(
        "https://api.semanticscholar.org/graph/v1/paper/batch",
        params={"fields": "citationCount,influentialCitationCount"},
        json={"ids": [f"ARXIV:{i}" for i in ids[:n]]},
        headers=headers, timeout=30,
    )
    print(n, "ids ->", r.status_code, r.text[:200].replace("\n", " "))
