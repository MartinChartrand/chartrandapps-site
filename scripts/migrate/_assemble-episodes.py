#!/usr/bin/env python3
# Assemble les 4 épisodes draftés (sourceless) -> episodes/<base>.json avec sources RÉELLES injectées.
# Usage: python3 _assemble-episodes.py <workflow-output.json>
import json, sys
ROOT="src/content/destinations/philippines"
pois={p["id"]:p for p in json.load(open(f"{ROOT}/pois.json"))}
dishes={d["id"]:d for d in json.load(open(f"{ROOT}/dishes.json"))}
gems={g["id"]:g for g in json.load(open(f"{ROOT}/gems.json"))}
slots={i["slot"]:i for i in json.load(open(f"{ROOT}/images.json"))}

def ent(i): return pois.get(i) or dishes.get(i) or gems.get(i)
def srcs(ids):
    out=[]; seen=set()
    for i in (ids or []):
        e=ent(i)
        if not e: continue
        for s in (e.get("sources") or []):
            if s["url"] not in seen:
                seen.add(s["url"]); out.append({"creator":s["creator"],"url":s["url"],"date":s["date"]})
    return out
def via(ids, creator):
    if not creator: return None
    for i in (ids or []):
        e=ent(i)
        for s in (e.get("sources") or []) if e else []:
            if creator.lower() in s["creator"].lower():
                return {"label":f"📺 {s['creator']}","url":s["url"]}
    return None

def valid_ids(ids): return [i for i in (ids or []) if ent(i)]
def valid_slot(s, base): return s if s in slots else None

data=json.load(open(sys.argv[1]))
drafts=data.get("result", data)
warnings=[]
for item in drafts:
    base=item["base"]; ep=item["episode"]
    # coldOpen
    for b in ep["coldOpen"]:
        b["targets"]=valid_ids(b.get("targets"))
        if not ent(b.get("focusPoi","")): warnings.append(f"{base}: focusPoi invalide {b.get('focusPoi')}")
        if b.get("thumb") not in slots: warnings.append(f"{base}: thumb invalide {b.get('thumb')}")
        b["sources"]=srcs(b.pop("sourceFrom",[]))
    # scenes
    for sc in ep["scenes"]:
        if sc.get("image") not in slots: warnings.append(f"{base}: scene image invalide {sc.get('image')}")
        # alt = alt réel du slot (garantie de cohérence vision)
        if sc.get("image") in slots: sc["alt"]=slots[sc["image"]]["alt"]
        sf=sc.pop("sourceFrom",[]); vc=sc.pop("viaCreator",None)
        sc["via"]=via(sf, vc)
        sc["sources"]=srcs(sf)
        sc.setdefault("quote",None)
    # montage
    for m in ep["montage"]:
        m["boundsPois"]=valid_ids(m.get("boundsPois")); m["targets"]=valid_ids(m.get("targets"))
        pr=m.pop("pillPoiRef",None)
        pills=[]
        if pr and ent(pr):
            pills.append({"poiRef":pr,"link":"maps","label":f"{pois[pr]['name'] if pr in pois else pr} · Maps"})
        pills.append({"label":"Le carnet de bouche","url":"#carnet"})
        m["pills"]=pills
        m["sources"]=srcs(m.pop("sourceFrom",[]))
    json.dump(ep, open(f"{ROOT}/episodes/{base}.json","w"), ensure_ascii=False, indent=2)
    ns=sum(len(s["sources"]) for s in ep["scenes"])
    print(f"  {base}.json : {len(ep['coldOpen'])} coldOpen, {len(ep['scenes'])} scenes, {ns} sources injectées")

print("\nWARNINGS:" if warnings else "\nAucun warning ✓")
for w in warnings: print("  ⚠️", w)
