#!/usr/bin/env python3
# Container (survol) + episodic=true pour Philippines. Hook = spine du voyage (voix de Martin,
# grammaire Bourdain : le feu et l'acide). Sources tirées des dishes réels. Re-roulable.
import json
ROOT="src/content/destinations/philippines"
dishes={d["id"]:d for d in json.load(open(f"{ROOT}/dishes.json"))}
pois={p["id"]:p for p in json.load(open(f"{ROOT}/pois.json"))}

def srcs(*ids):
    out=[]; seen=set()
    for i in ids:
        ent=dishes.get(i) or pois.get(i)
        if not ent: continue
        for s in (ent.get("sources") or []):
            if s["url"] not in seen:
                seen.add(s["url"]); out.append({"creator":s["creator"],"url":s["url"],"date":s["date"]})
    return out

container={
 "hookKicker":"Un mois · Bangkok et quatre îles · le ferry, le feu et l'acide",
 "hookTitle":"Aux Visayas, c'est la mer qui décide — l'heure du repas comme la couleur de l'eau.",
 "hookBody":"Au centre de ce voyage, il y a la catch du matin et deux façons de la traiter. Le feu : le poulet inasal sur le charbon de Bacolod, le poisson et les calamars en sinugba, le lechon de Cebu pour finir. Et l'acide : le kinilaw, le poisson cru « cuit » au vinaigre de coco et au calamansi — la façon dont les îles mangeaient bien avant que les Espagnols débarquent. Entre les deux, le ferry pour seul fil, une eau turquoise à couper le souffle, et le temps qui ralentit d'île en île. On commence par Bangkok — l'escale où on atterrit, on décompresse, et on se rappelle pourquoi on voyage : pour la première bouchée qui surprend. C'est ça, le voyage : la mer met la table, et on suit.",
 "hookImage":"panay-cover",
 "sources":srcs("kinilaw-ilonggo","chicken-inasal","kinilaw-frais"),
 "tilesIntro":"Bangkok pour atterrir, puis quatre îles des Visayas reliées par le ferry — la table et la mer, du nord sucrier de Negros à la sortie par le lechon de Cebu.",
 "tiles":[
  {"base":"bangkok","kicker":"Escale · 5 nuits","title":"Le wok qui crache du feu",
   "teaser":"On atterrit, on récupère du décalage, et on plonge dans la bouffe de rue — Yaowarat la nuit, la mangue au marché avant 10h.","image":"bangkok-cover"},
  {"base":"panay","kicker":"Chapitre 1 · 7 nuits","title":"La table sous-cotée du pays",
   "teaser":"Le batchoy d'Iloilo, les huîtres et les scallops à volonté de Gigantes, les bancs de sable déserts cernés d'eau turquoise.","image":"panay-cover"},
  {"base":"negros","kicker":"Chapitre 2 · 5 nuits","title":"Le sucre, le grill et les tortues",
   "teaser":"Le vrai chicken inasal grillé sur charbon à Bacolod, puis le sud : nager avec les tortues d'Apo, plonger la côte noire de Dauin.","image":"negros-cover"},
  {"base":"siquijor","kicker":"Chapitre 3 · 3 nuits","title":"L'île douce",
   "teaser":"Trois nuits au scooter entre les chutes turquoise de Cambugahay, les plages vides et le coucher de soleil de Paliton. Le cœur au ralenti.","image":"siquijor-cover"},
  {"base":"bohol","kicker":"Chapitre 4 · 4 nuits","title":"La sortie, les doigts gras",
   "teaser":"Les plages calmes de Panglao, le seafood grillé, la rivière Loboc — et on sort par Cebu sur le meilleur lechon du pays.","image":"bohol-cover"},
 ]
}

dest=json.load(open(f"{ROOT}/destination.json"))
dest["episodic"]=True
dest["chapterTotal"]=5
dest["container"]=container
json.dump(dest, open(f"{ROOT}/destination.json","w"), ensure_ascii=False, indent=2)
print(f"container écrit : {len(container['tiles'])} tuiles, hook {len(container['hookBody'])} car, {len(container['sources'])} sources · episodic=true")
