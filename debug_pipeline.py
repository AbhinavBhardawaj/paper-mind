import logging
logging.disable(logging.CRITICAL)
from backend.pipeline import run_pipeline

r = run_pipeline("graph neural networks")
for k in ["velocity", "citation_velocity", "momentum", "forecast", "top_accelerating"]:
    print(k, len(r[k]), str(r[k][:2])[:250])
print("warnings:", r["warnings"])