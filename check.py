import json, sys
d = json.load(open(sys.argv[1]))
print("top-level keys:", list(d.keys()) if isinstance(d, dict) else type(d))
x = (d or {}).get("data") or {}
print("cached:", d.get("cached") if d else None)
print("warnings:", x.get("warnings"))
for p in x.get("papers", [])[:5]:
    print("  ", p["id"], "|", p["title"][:70], "| cites:", p.get("citation_count"))
