import json, sys
x = json.load(open(sys.argv[1]))["data"]
for k in ["velocity", "citation_velocity", "momentum", "forecast", "top_accelerating"]:
    v = x.get(k)
    print(k, type(v).__name__, len(v) if v is not None else None)
    if v:
        print("   sample:", json.dumps(v[:2] if isinstance(v, list) else dict(list(v.items())[:2]))[:300])
print("topic_map:", {k: v[:3] for k, v in list(x["topic_map"].items())[:6]})
print("topic_id counts:", {t: sum(1 for p in x["papers"] if p["topic_id"] == t) for t in sorted({p["topic_id"] for p in x["papers"]})})
