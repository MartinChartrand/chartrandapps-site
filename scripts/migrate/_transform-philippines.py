#!/usr/bin/env python3
# One-shot : .research/<base>.json (sortie recherche voyage-new) -> fichiers de collection conformes.
# Déterministe. Re-roulable. Bloc A du handoff. Images = placeholders (sha vide), fetch+vision = Bloc B.
import json, os, re, glob
from urllib.parse import quote

ROOT = "src/content/destinations/philippines"
RES  = f"{ROOT}/.research"
os.makedirs(f"{ROOT}/bases", exist_ok=True)

# ---- méta par base (ordre, dates de travail, focus, ton) ----
META = {
 "bangkok":  dict(order=1, nights=5, dates="1–6 février", kicker="l'escale",
   title="Bangkok", focus="Bouffe de rue · marchés · décompression",
   subtitle="L'escale qui ouvre le voyage. On atterrit, on récupère du décalage, et on mange.",
   summary="Quelques jours pour décompresser du vol et plonger dans la bouffe de rue — Yaowarat la nuit, les marchés le matin.",
   pullquote="On ne vient pas à Bangkok pour les temples. On vient pour le wok qui crache du feu à 17h.", cur="THB"),
 "panay":    dict(order=2, nights=7, dates="6–13 février", kicker="l'ouest des Visayas",
   title="Panay", focus="Sisig de Pampanga · batchoy d'Iloilo · scallops de Gigantes",
   subtitle="La porte d'entrée gourmande des Visayas, des cantines d'Iloilo aux îlots de pêcheurs.",
   summary="Le batchoy au marché de La Paz, les scallops à volonté de Gigantes, les lagons déserts. La bouffe sous-cotée du pays.",
   pullquote="Iloilo, c'est le secret le mieux gardé de la table philippine.", cur="PHP"),
 "negros":   dict(order=3, nights=5, dates="13–18 février", kicker="le sucre et la mer",
   title="Negros", focus="Inasal de Bacolod · Apo Island · plongée à Dauin",
   subtitle="Du nord sucrier de Bacolod jusqu'aux tortues d'Apo Island, par la côte noire de Dauin.",
   summary="Le vrai chicken inasal grillé sur charbon, puis le sud : nager avec les tortues, plonger la côte noire.",
   pullquote="Le poulet grillé de Bacolod, c'est la définition du bonheur simple.", cur="PHP"),
 "siquijor": dict(order=4, nights=3, dates="18–21 février", kicker="l'île douce",
   title="Siquijor", focus="Cambugahay · plages vides · l'île douce",
   subtitle="L'île qu'on fait au scooter, entre cascades turquoise et plages sans personne.",
   summary="Les chutes Cambugahay où on se baigne aux balançoires, les plages vides, le rythme qui ralentit.",
   pullquote="Trois nuits à Siquijor, c'est le cœur qui se met au ralenti.", cur="PHP"),
 "bohol":    dict(order=5, nights=4, dates="21–25 février", kicker="la sortie",
   title="Bohol", focus="Plages calmes de Panglao · seafood · lechon de Cebu",
   subtitle="Les coins tranquilles de Panglao, loin de la cohue, puis le dernier festin : le lechon de Cebu.",
   summary="Plages calmes, seafood frais, croisière sur la Loboc — et on sort par Cebu sur le meilleur lechon du pays.",
   pullquote="On finit le voyage les doigts gras de lechon. La bonne façon de partir.", cur="PHP"),
} if False else {  # (garder lisible)
 "bangkok":  dict(order=1, nights=5, dates="1–6 février", kicker="l'escale", title="Bangkok",
   focus="Bouffe de rue · marchés · décompression",
   subtitle="L'escale qui ouvre le voyage. On atterrit, on récupère du décalage, et on mange.",
   summary="Quelques jours pour décompresser du vol et plonger dans la bouffe de rue — Yaowarat la nuit, les marchés le matin.",
   pullquote="On ne vient pas à Bangkok pour les temples. On vient pour le wok qui crache du feu à 17h.", cur="THB"),
 "panay":    dict(order=2, nights=7, dates="6–13 février", kicker="l'ouest des Visayas", title="Panay",
   focus="Sisig de Pampanga · batchoy d'Iloilo · scallops de Gigantes",
   subtitle="La porte d'entrée gourmande des Visayas, des cantines d'Iloilo aux îlots de pêcheurs.",
   summary="Le batchoy au marché de La Paz, les scallops à volonté de Gigantes, les lagons déserts. La bouffe sous-cotée du pays.",
   pullquote="Iloilo, c'est le secret le mieux gardé de la table philippine.", cur="PHP"),
 "negros":   dict(order=3, nights=5, dates="13–18 février", kicker="le sucre et la mer", title="Negros",
   focus="Inasal de Bacolod · Apo Island · plongée à Dauin",
   subtitle="Du nord sucrier de Bacolod jusqu'aux tortues d'Apo Island, par la côte noire de Dauin.",
   summary="Le vrai chicken inasal grillé sur charbon, puis le sud : nager avec les tortues, plonger la côte noire.",
   pullquote="Le poulet grillé de Bacolod, c'est la définition du bonheur simple.", cur="PHP"),
 "siquijor": dict(order=4, nights=3, dates="18–21 février", kicker="l'île douce", title="Siquijor",
   focus="Cambugahay · plages vides · l'île douce",
   subtitle="L'île qu'on fait au scooter, entre cascades turquoise et plages sans personne.",
   summary="Les chutes Cambugahay où on se baigne aux balançoires, les plages vides, le rythme qui ralentit.",
   pullquote="Trois nuits à Siquijor, c'est le cœur qui se met au ralenti.", cur="PHP"),
 "bohol":    dict(order=5, nights=4, dates="21–25 février", kicker="la sortie", title="Bohol",
   focus="Plages calmes de Panglao · seafood · lechon de Cebu",
   subtitle="Les coins tranquilles de Panglao, loin de la cohue, puis le dernier festin : le lechon de Cebu.",
   summary="Plages calmes, seafood frais, croisière sur la Loboc — et on sort par Cebu sur le meilleur lechon du pays.",
   pullquote="On finit le voyage les doigts gras de lechon. La bonne façon de partir.", cur="PHP"),
}
ORDER = ["bangkok","panay","negros","siquijor","bohol"]

def norm_date(d):
    if not d: return "2026-06"
    d = str(d).strip()
    if re.match(r'^\d{4}-\d{2}(-\d{2})?$', d): return d
    if re.match(r'^\d{4}$', d): return d + "-01"
    m = re.match(r'^(\d{4})-(\d{1,2})', d)
    if m: return f"{m.group(1)}-{int(m.group(2)):02d}"
    return "2026-06"

def clean_sources(srcs):
    out=[]
    for s in (srcs or []):
        if not isinstance(s, dict): continue
        out.append({"creator": s.get("creator","") or "—",
                    "url": s.get("url","") or "",
                    "date": norm_date(s.get("date"))})
    return out

def gmaps(name, city):
    return "https://www.google.com/maps/search/" + quote(f"{name} {city}".strip())

def mk_provenance(item):
    p={}
    st=item.get("story")
    if st: p["story"]=st
    sr=clean_sources(item.get("sources"))
    if sr: p["sources"]=sr
    if item.get("singleSourceTrusted"): p["singleSourceTrusted"]=True
    # approvedBy: JAMAIS posé sans approbation explicite de Martin (ADR-3) -> absent au Bloc A
    return p

seen_poi=set(); seen_dish=set(); seen_gem=set()
def uniq(id_, seen, base):
    id_ = re.sub(r'[^a-z0-9-]','', (id_ or "x").lower().replace(' ','-')) or "x"
    cand=id_
    i=2
    while cand in seen:
        cand=f"{id_}-{base[:3]}" if i==2 else f"{id_}-{base[:3]}{i}"
        i+=1
    seen.add(cand); return cand

ALLOWED_SIGHT=("sight","activity","plage")
all_pois=[]; all_dishes=[]; all_gems=[]; images=[{
    "id":"hero","slot":"hero","base":None,"role":"hero","file":"hero.jpg",
    "alt":"Mer turquoise et bateau de pêcheur — Visayas, Philippines","layout":None,"claims":"atmosphere",
    "credit":{"source":"unsplash","photoId":"","photographer":"","license":"unsplash-standard"},
    "sha256":"","visionChecked":"pending"}]

def base_pois(b, base, cur):
    pois=[]; idmap={}
    for h in (b.get("hebergements") or []):
        rid=uniq(h.get("id") or h.get("name"), seen_poi, base); idmap[h.get("id")]=rid
        coords = ({"lat":h["lat"],"lng":h["lng"],"source":"websearch","verifiedOn":"2026-06-15"}
                  if h.get("lat") and h.get("lng") else None)
        tier=h.get("tier") if h.get("tier") in ("budget","mid","gem") else "mid"
        p={"id":rid,"base":base,"kind":"hotel","mapType":"hotel","roles":["sleep"],"tier":tier,
           "name":h.get("name",""),"blurb":h.get("blurb",""),"signature":"","image":None,
           "price":{"range":h.get("prixParNuit") or "—","currency":h.get("devise") or cur,"asOf":"2026-06"},
           "links":{"official":h.get("url") or None,"booking":None,"tripadvisor":None,"maps":gmaps(h.get("name",""),h.get("quartier") or base)},
           "extraLinks":[],"seasonal":False,
           "status":{"open":True,"lastChecked":"2026-06-15","method":"websearch"},
           "onMap":bool(coords)}
        if coords: p["coords"]=coords
        p.update(mk_provenance(h)); pois.append(p)
    for r in (b.get("restos") or []):
        rid=uniq(r.get("id") or r.get("name"), seen_poi, base); idmap[r.get("id")]=rid
        coords = ({"lat":r["lat"],"lng":r["lng"],"source":"websearch","verifiedOn":"2026-06-15"}
                  if r.get("lat") and r.get("lng") else None)
        p={"id":rid,"base":base,"kind":"resto","mapType":"resto","roles":["eat"],"tier":None,
           "name":r.get("name",""),"blurb":r.get("blurb",""),"signature":r.get("platSignature") or "","image":None,
           "price":{"range":r.get("fourchettePrix") or "—","currency":r.get("devise") or cur,"asOf":"2026-06"},
           "links":{"official":r.get("url") or None,"booking":None,"tripadvisor":None,"maps":gmaps(r.get("name",""),base)},
           "extraLinks":[],"seasonal":False,
           "status":{"open":True,"lastChecked":"2026-06-15","method":"websearch"},
           "onMap":bool(coords)}
        if coords: p["coords"]=coords
        p.update(mk_provenance(r)); pois.append(p)
    for s in (b.get("sights") or []):
        rid=uniq(s.get("id") or s.get("name"), seen_poi, base); idmap[s.get("id")]=rid
        kind=s.get("kind") if s.get("kind") in ALLOWED_SIGHT else "sight"
        mapType="plage" if kind=="plage" else "sight"
        roles=[x for x in (s.get("roles") or []) if x in ("see","do")] or ["see"]
        coords = ({"lat":s["lat"],"lng":s["lng"],"source":"websearch","verifiedOn":"2026-06-15"}
                  if s.get("lat") and s.get("lng") else None)
        p={"id":rid,"base":base,"kind":kind,"mapType":mapType,"roles":roles,"tier":None,
           "name":s.get("name",""),"blurb":s.get("blurb",""),"signature":"","image":None,
           "price":{"range":s.get("prixEntree") or "Gratuit","currency":cur,"asOf":"2026-06"},
           "links":{"official":s.get("url") or None,"booking":None,"tripadvisor":None,"maps":gmaps(s.get("name",""),base)},
           "extraLinks":[],"seasonal":False,
           "status":{"open":True,"lastChecked":"2026-06-15","method":"websearch"},
           "onMap":bool(coords)}
        if coords: p["coords"]=coords
        p.update(mk_provenance(s)); pois.append(p)
    return pois, idmap

def reconcile_refs(text, base_ids):
    ids=set(base_ids)
    def repl(m):
        x=m.group(1)
        if x in ids: return f"[[poi:{x}]]"
        for i in ids:
            if i.startswith(x) or x.startswith(i) or x in i or i in x:
                return f"[[poi:{i}]]"
        return ""  # orphelin -> retirer la balise (build safe)
    out=re.sub(r'\[\[poi:([a-z0-9-]+)\]\]', repl, text or "")
    return re.sub(r'[ \t]{2,}',' ', out).replace(' .','.').replace(' ,',',')

def fm(v): return json.dumps(v, ensure_ascii=False)

for base in ORDER:
    b=json.load(open(f"{RES}/{base}.json"))
    m=META[base]; cur=m["cur"]
    pois, idmap = base_pois(b, base, cur)
    all_pois += pois
    base_ids=[p["id"] for p in pois]
    heb=[p["id"] for p in pois if p["kind"]=="hotel"]
    eat=[p["id"] for p in pois if p["kind"]=="resto"]
    see=[p["id"] for p in pois if p["kind"] in ("sight","activity","plage")]
    info=[]
    if heb: info.append({"label":"Où dormir","type":"poi-list","items":heb})
    if eat: info.append({"label":"Où manger","type":"poi-list","items":eat})
    if see: info.append({"label":"Voir & se baigner","type":"poi-list","items":see})
    cover=f"{base}-cover"
    images.append({"id":cover,"slot":cover,"base":base,"role":"cover","file":f"{cover}.jpg",
        "alt":f"{m['title']} — {m['focus'].split(' · ')[0]}","layout":"wide","claims":"atmosphere",
        "credit":{"source":"unsplash","photoId":"","photographer":"","license":"unsplash-standard"},
        "sha256":"","visionChecked":"pending"})
    # dishes / gems (scope par base, image placeholder par item)
    for d in (b.get("dishes") or []):
        did=uniq(d.get("id") or d.get("title"), seen_dish, base)
        slot=f"d-{did}"
        e={"id":did,"base":base,"group":f"Le carnet de bouche — {m['title']}","title":d.get("title",""),
           "body":d.get("body",""),"image":slot,"links":[]}
        if d.get("type") in ("plat","vin","bière","alcool","produit"): e["type"]=d["type"]
        if d.get("region"): e["region"]=d["region"]
        e.update(mk_provenance(d)); all_dishes.append(e)
        images.append({"id":slot,"slot":slot,"base":base,"role":"foodie","file":f"{slot}.jpg",
            "alt":d.get("title",""),"layout":None,"claims":"atmosphere",
            "credit":{"source":"unsplash","photoId":"","photographer":"","license":"unsplash-standard"},
            "sha256":"","visionChecked":"pending"})
    for g in (b.get("gems") or []):
        gid=uniq(g.get("id") or g.get("title"), seen_gem, base)
        slot=f"g-{gid}"
        e={"id":gid,"base":base,"group":f"Pépites locales — {m['title']}","title":g.get("title",""),
           "body":g.get("body",""),"image":slot,"links":[]}
        e.update(mk_provenance(g)); all_gems.append(e)
        images.append({"id":slot,"slot":slot,"base":base,"role":"photo","file":f"{slot}.jpg",
            "alt":g.get("title",""),"layout":None,"claims":"atmosphere",
            "credit":{"source":"unsplash","photoId":"","photographer":"","license":"unsplash-standard"},
            "sha256":"","visionChecked":"pending"})
    # base .md
    body=reconcile_refs(b.get("narratif",""), base_ids)
    front={"order":m["order"],"slug":base,"title":m["title"],"kicker":m["kicker"],"nights":m["nights"],
           "dates":m["dates"],"focus":m["focus"],"subtitle":m["subtitle"],"summary":m["summary"],
           "pullquote":m["pullquote"],"cover":cover,"infoBlocks":info,"mapLabel":f"Carte — {m['title']}"}
    lines=[f"{k}: {fm(v)}" for k,v in front.items()]
    md=f"---\n" + "\n".join(lines) + "\n---\n\n" + body + "\n"
    open(f"{ROOT}/bases/{m['order']:02d}-{base}.md","w").write(md)

json.dump(all_pois, open(f"{ROOT}/pois.json","w"), ensure_ascii=False, indent=2)
json.dump(all_dishes, open(f"{ROOT}/dishes.json","w"), ensure_ascii=False, indent=2)
json.dump(all_gems, open(f"{ROOT}/gems.json","w"), ensure_ascii=False, indent=2)
json.dump(images, open(f"{ROOT}/images.json","w"), ensure_ascii=False, indent=2)

# budget.json (chiffres du budget v2)
budget={"kicker":"Finances","title":"Budget estimé",
 "intro":"En dollars canadiens, pour deux, niveau mid-range confortable (guesthouses de caractère, tavernas locales). Bangkok inclus. Taux : 1 CAD ≈ 28 THB ≈ 41 PHP.",
 "statCards":[{"value":"~9 965 $","label":"Total pour 2, ~26 jours"},
   {"value":"~4 983 $","label":"Par personne, tout inclus"},
   {"value":"~380 $","label":"Par jour sur place, pour 2"},
   {"value":"1 CAD ≈ 41 PHP","label":"Taux de référence"}],
 "lines":[
  {"label":"Vols internationaux (open-jaw, 2 pers.)","category":"YUL → Bangkok / Cebu → YUL · escale obligée · réserver août 2026","amount":"~3 900 $"},
  {"label":"Vol Bangkok → Manille (2 pers.)","category":"Cebu Pacific/AirAsia ou PAL · ~3h30","amount":"~410 $"},
  {"label":"Vol domestique Manille → Iloilo (2 pers.)","category":"GO Easy bagage 20kg inclus","amount":"~180 $"},
  {"label":"Hébergement Philippines (21 nuits)","category":"Guesthouses/resorts mid-range · Iloilo, Dauin, Siquijor, Panglao","amount":"~1 365 $"},
  {"label":"Hébergement Bangkok (5 nuits)","category":"Hôtel mid-range, Thonglor/Chinatown","amount":"~450 $"},
  {"label":"Bouffe Philippines","category":"Carinderias + fruits de mer + bons repas · pour 2","amount":"~1 050 $"},
  {"label":"Bouffe Bangkok","category":"Bouffe de rue + bonnes tables · pour 2","amount":"~275 $"},
  {"label":"Transport local Philippines","category":"Ferries Visayas/Bohol/Cebu, scooters, vans, bus","amount":"~750 $"},
  {"label":"Transport local Bangkok","category":"BTS, Grab, taxis","amount":"~75 $"},
  {"label":"Activités & entrées","category":"Apo Island, plongée, Cambugahay, Loboc, island hopping Gigantes","amount":"~750 $"},
  {"label":"Assurance voyage (2 pers., ~55 ans)","category":"Médical + annulation, tout le voyage","amount":"~460 $"},
  {"label":"Divers (eSIM, lessive, pourboires, tampon)","category":"eTravel + TDAC gratuits · pas d'extension visa","amount":"~300 $"}],
 "scenarios":[
  {"name":"Budget serré","total":"~7 565 $","desc":"~7 565 $ (guesthouses simples, plus de bouffe de rue, vols réservés tôt)"},
  {"name":"Budget confort+","total":"~12 365 $","desc":"~12 365 $ (resorts plongée, quelques très bonnes tables, vols flexibles)"}],
 "advice":"Le poste le plus négociable reste les vols (réserver dès août 2026) et l'hébergement (contacter les guesthouses en direct pour un tarif mensuel). Visa 30 jours largement suffisant — aucune extension à prévoir.",
 "total":"~9 965 $"}
json.dump(budget, open(f"{ROOT}/budget.json","w"), ensure_ascii=False, indent=2)

# pratique.json : parse les sections **Label** : body de chaque base
groups=[]
for base in ORDER:
    b=json.load(open(f"{RES}/{base}.json"))
    txt=b.get("pratique","") or ""
    items=[]
    for chunk in re.split(r'\n{2,}', txt):
        mm=re.match(r'\s*\*\*(.+?)\*\*\s*[:：]?\s*(.*)', chunk, re.S)
        if mm and mm.group(2).strip():
            items.append({"label":mm.group(1).strip(), "body":re.sub(r'\s+',' ',mm.group(2)).strip()})
    if not items and txt.strip():
        items=[{"label":"Logistique","body":re.sub(r'\s+',' ',txt).strip()}]
    if items:
        groups.append({"label":META[base]["title"],"items":items})
json.dump({"groups":groups}, open(f"{ROOT}/pratique.json","w"), ensure_ascii=False, indent=2)

print(f"POIs:{len(all_pois)} dishes:{len(all_dishes)} gems:{len(all_gems)} images:{len(images)} bases:5 budget:1 pratique:{len(groups)} groupes")
