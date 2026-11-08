import json
import logging
logging.basicConfig(level=logging.INFO)
from ml.gap_analysis import generate_research_gaps

data = json.load(open("result10.json"))["data"]
gaps = generate_research_gaps(data["top_accelerating"], query="neural networks", papers=data["papers"])
for g in gaps:
    print(g["title"], "|", g["field_a"], "x", g["field_b"], "|", g["scope_rating"])
    print("   evidence:", g["evidence"])