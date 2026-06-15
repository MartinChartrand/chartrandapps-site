#!/usr/bin/env python3
# Authoring épisode Bangkok (clone structure cyclades). Sources RÉSOLUES depuis les données
# (pois/dishes/gems) par id — jamais inventées. Re-roulable.
import json
ROOT="src/content/destinations/philippines"
pois={p["id"]:p for p in json.load(open(f"{ROOT}/pois.json"))}
dishes={d["id"]:d for d in json.load(open(f"{ROOT}/dishes.json"))}
gems={g["id"]:g for g in json.load(open(f"{ROOT}/gems.json"))}

def srcs(*ids):
    """Union des sources réelles des entités référencées, dédupliquées par url."""
    out=[]; seen=set()
    for i in ids:
        ent=pois.get(i) or dishes.get(i) or gems.get(i)
        if not ent: continue
        for s in (ent.get("sources") or []):
            u=s.get("url","")
            if u and u not in seen:
                seen.add(u); out.append({"creator":s["creator"],"url":u,"date":s["date"]})
    return out

def via(entity_id, creator_contains):
    """linkSchema {label,url} pointant vers la source d'un créateur précis (provenance affichée)."""
    ent=pois.get(entity_id) or dishes.get(entity_id) or gems.get(entity_id)
    for s in (ent.get("sources") or []):
        if creator_contains.lower() in s["creator"].lower():
            return {"label":f"📺 {s['creator']}","url":s["url"]}
    return None

episode={
 "coldOpen":[
  {
   "kicker":"L'arrivée — la fièvre",
   "body":"Bangkok te tombe dessus comme une fièvre. Le tuk-tuk klaxonne, l'air sent le jasmin et la graisse de wok, et avant même d'avoir posé les valises, quelqu'un t'a mis un cha yen dans les mains — ce thé glacé orange brûlé qui coule dans un sac de plastique noué sur une paille. On n'est pas venus pour les temples. Ils sont là, imposants, mais ils sont le décor. On est venus pour ce qui se passe à table.",
   "focusPoi":"yaowarat-chinatown","zoom":13,"targets":["yaowarat-chinatown"],
   "thumb":"d-cha-yen-thai-iced-tea","thumbAlt":"Un grand verre de cha yen, le thé glacé thaïlandais orange vif, plein de glaçons",
   "poiRef":"yaowarat-chinatown","sources":srcs("yaowarat-chinatown")
  },
  {
   "kicker":"La zone de base — Thonglor le jour, le wok le soir",
   "body":"On dort à Thonglor-Ekkamai, loin du chaos de Khao San : le BTS pour tout rejoindre, les coffee shops japonais, les nouilles ouvertes jusqu'à 2h, l'air conditionné propre et les draps froids — le luxe à Bangkok, c'est ça. Le ciel de février est bleu, l'air doux. Puis vers 17h, les cuisinières de Yaowarat allument les woks, et la ville change de visage.",
   "focusPoi":"muu-bangkok-thonglor","zoom":14,"targets":["muu-bangkok-thonglor"],
   "thumb":"bangkok-cover","thumbAlt":"Les étals de bouffe de rue de Yaowarat qui s'allument à la tombée de la nuit, Bangkok",
   "poiRef":"muu-bangkok-thonglor","sources":srcs("muu-bangkok-thonglor")
  }
 ],
 "scenes":[
  {
   "id":"scene-pad-krapow","kicker":"Phed Mark · LE WOK",
   "title":"Le pad krapow qui fait pleurer de bonheur",
   "image":"d-pad-krapow-holy-basil","alt":"Pad Krapow (ผัดกะเพรา)",
   "intro":"Mark Wiens — le vidéaste bouffe qui a fait découvrir la cuisine thaïe à des millions de gens — a ouvert son propre comptoir à Ekkamai. Une seule recette, faite obsessionnellement bien : le pad krapow, viande hachée sautée au basilic sacré, piment et ail, sur du riz, avec un œuf frit au bord croustillant.",
   "intro2":None,
   "reco":"Phed Mark, à deux pas du BTS Ekkamai. Le porc ou le poulet haché, basilic sacré, œuf frit. Niveau d'épice à ton goût — le 10 est sérieux, le 5 déjà bien relevé. C'est la première vraie bouchée du voyage : un plat de rue simple, fait avec une précision de chef.",
   "quote":"On ne vient pas à Bangkok pour les temples. On vient pour le wok qui crache du feu à 17h.",
   "via":via("pad-krapow-holy-basil","Mark Wiens"),
   "poiRef":"phed-mark-ekkamai","sources":srcs("phed-mark-ekkamai","pad-krapow-holy-basil")
  },
  {
   "id":"scene-yaowarat","kicker":"Yaowarat · LA NUIT",
   "title":"La crevette géante dans la fumée de Chinatown",
   "image":"bangkok-yaowarat","alt":"Yaowarat Road, le Chinatown de Bangkok la nuit — néons rouges, étals de bouffe de rue, foule",
   "intro":"Le soir, les néons rouges de Yaowarat s'allument, les familles s'installent sur des tabourets en plastique, et les woks crachent du feu sur le trottoir. Chez T&K, les « chemises vertes » grillent les crevettes fluviales géantes et le poisson dans la fumée jusqu'à 2h du matin. Une bouteille de Singha froide à 50 bahts t'appartient pour la soirée.",
   "reco":"T&K Seafood (les chemises vertes) au coin de Phadung Dao, dans Yaowarat. La crevette fluviale géante grillée, le poisson du jour, les calamars dans la fumée du charbon. On mange au coude à coude avec des habitants qui font ça depuis trente ans.",
   "quote":"Personne ne te regarde bizarrement — Bangkok absorbe tout le monde avec la même indifférence bienveillante.",
   "via":via("tk-seafood-yaowarat","Mark Wiens"),
   "poiRef":"tk-seafood-yaowarat","sources":srcs("tk-seafood-yaowarat","yaowarat-chinatown")
  },
  {
   "id":"scene-tom-yum","kicker":"Jeh O Chula · MINUIT",
   "title":"Le tom yum monstre des noctambules",
   "image":"d-tom-yum-mama-jeh-o","alt":"Tom Yum Goong — soupe thaïe épicée aux crevettes, citronnelle et citron vert",
   "intro":"Jeh O Chula, c'est le spot de souper des Bangkokiens depuis 50 ans, et la file déborde sur le trottoir passé minuit. Le plat-culte : le MAMA OHO, un tom yum XXL aux fruits de mer monté sur une montagne de nouilles instantanées Mama, avec deux œufs. C'est gras, épicé, légendaire — et ça vaut la file.",
   "reco":"Jeh O Chula, près de l'université Chula. Vas-y tard, prends un numéro, attends. Le MAMA OHO (tom yum instantané XXL) à partager, et le moo krob (porc croustillant) en extra. La cuisine de rue élevée au rang d'institution nocturne.",
   "quote":None,"via":None,
   "poiRef":"jeh-o-chula","sources":srcs("jeh-o-chula","tom-yum-mama-jeh-o")
  },
  {
   "id":"scene-or-tor-kor","kicker":"Or Tor Kor · LE MATIN",
   "title":"Le durian à 9h, la tache de mangue avant 10h",
   "image":"d-mango-sticky-rice","alt":"Khao Niao Mamuang — Mango Sticky Rice",
   "intro":"Le matin, on file à l'Or Tor Kor, le marché de fruits et de curry préféré des chefs locaux : le durian kanyao qui embaume à 9h, les crevettes fluviales en pyramides, l'un des meilleurs khao gaeng (riz-curry) de la ville. Et le mango sticky rice — la mangue nam dok mai bien mûre, le riz gluant au lait de coco — qu'on mange debout.",
   "reco":"Or Tor Kor Market (MRT Kamphaeng Phet) pour le khao gaeng au comptoir et les fruits. Pour LE mango sticky rice de référence, Mae Varee au BTS Thong Lo, ouvert tard, à manger debout sur le trottoir comme un Bangkokien ordinaire.",
   "quote":"Le luxe, ici, c'est une mangue trop mûre mangée debout, le jus qui coule sur les doigts à 9h du matin.",
   "via":via("or-tor-kor-market","Mark Wiens"),
   "poiRef":"or-tor-kor-market","sources":srcs("or-tor-kor-market","mango-sticky-rice")
  }
 ],
 "montage":[
  {
   "kicker":"Le carnet de bouche",
   "body":"Avant de filer vers Manille : le pad krapow de Phed Mark, la crevette de T&K dans la fumée de Yaowarat, le tom yum de minuit chez Jeh O, le pad thai mythique de Thip Samai, la mangue de Mae Varee. Et le marché de nuit Rot Fai pour finir, sous les tentes illuminées. Le carnet a les adresses, les liens, les prix, et le budget complet du voyage.",
   "boundsPois":["phed-mark-ekkamai","tk-seafood-yaowarat","jeh-o-chula","or-tor-kor-market"],
   "targets":["tk-seafood-yaowarat"],
   "thumb":"g-talad-rot-fai-train-market","thumbAlt":"Les tentes colorées d'un marché de nuit illuminées à la tombée du jour, Bangkok",
   "pills":[{"poiRef":"tk-seafood-yaowarat","link":"maps","label":"T&K Seafood · Maps"},{"label":"Le carnet de bouche","url":"#carnet"}],
   "sources":srcs("talad-rot-fai-train-market")
  }
 ],
 "carnet":{
  "groups":[
   {"label":"Où dormir","kinds":["hotel"],"footer":"À Chinatown : The Mustang Blu (ancienne banque de 1890 reconvertie en suites design) ou Feung Nakorn (école des années 1920, jardin intérieur, calme). Côté Thonglor, MUU Bangkok, ancré dans le quartier le plus vivant, BTS à 15 minutes."},
   {"label":"À table","kinds":["resto"],"footer":"Le pad krapow de Phed Mark (Ekkamai), la crevette de T&K dans la fumée de Yaowarat, le tom yum de minuit chez Jeh O Chula, le pad thai mythique de Thip Samai, et le guay tiew kua gai (Michelin à 50 bahts) chez Ann."},
   {"label":"À voir, si ça te tente","kinds":["sight","activity"],"footer":"Yaowarat la nuit, l'Or Tor Kor le matin, l'allée aux boat noodles de Victory Monument, le lever de soleil à Lumpini, le massage chez Ruen-Nuad, le Bouddha couché de Wat Pho, la balade riverside de Talad Noi."}
  ],
  "dishesTitle":"Le carnet de bouche"
 },
 "outro":{
  "kicker":"L'escale se termine",
  "body":"Cinq jours pour se remettre du vol et se rappeler pourquoi on voyage : pour la première bouchée qui surprend. Les {count} adresses de Bangkok — où dormir, où manger, où flâner — vivent dans le carnet, avec leurs liens, leurs prix, et le budget complet du voyage. L'épisode, c'est l'apéro ; le carnet, c'est l'outil. Prochain vol : Manille, puis Iloilo et les Visayas.",
  "nextLabel":"← Retour au survol du voyage","nextHref":"/philippines/"
 }
}
# nettoyer les clés None / intro2 parasite
for sc in episode["scenes"]:
    sc.pop("intro2",None)
    if sc.get("via") is None: sc["via"]=None

json.dump(episode, open(f"{ROOT}/episodes/bangkok.json","w"), ensure_ascii=False, indent=2)
ns=sum(len(s["sources"]) for s in episode["scenes"])
print(f"bangkok.json écrit : {len(episode['coldOpen'])} coldOpen, {len(episode['scenes'])} scenes, {len(episode['montage'])} montage, {len(episode['carnet']['groups'])} carnet groups")
print(f"sources résolues (scenes): {ns} | toutes tirées des données réelles")
