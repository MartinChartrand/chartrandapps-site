# Modèle Voyage-Container + Épisodes — Décisions

*Généré le 2026-06-13 via /persona-debate (1 ronde)*
*Personas : Sophie (épicurienne/utilisatrice), Marco (visiteur froid), Dre Léa (intégrité), L'Architecte (dev solo)*
*Cadrage : les positions de Martin étaient des HYPOTHÈSES à stress-tester — il a dit lui-même qu'il pouvait avoir tort.*
*STATUT : ✅ VALIDÉ 100 % par Martin (2026-06-13) — les 7 décisions sont VERROUILLÉES.*

## Décision 1 : Modèle = container + épisodes (ADOPTÉ, unanime)
- **Décision :** Voyage = page-CONTAINER ; chaque étape/base = un ÉPISODE scrollytelling (proto format). On TUE le long-scroll v2 et l'idée d'un méga-épisode unique.
- **Rationale :** le long-scroll v2 = « une liste de courses déguisée » (Sophie), « déjà mort, je clique pas sur des onglets sur mon cell » (Marco). Le méga-épisode = on perd le fil (« j'arrive à Ronda j'ai perdu Séville »). L'unité cold open + scènes + carnet par base est cohérente.
- **Persona check :** 4/4 pour. Zéro réserve sur le modèle lui-même.

## Décision 2 : Migration via flag `episodic`, JAMAIS de scission globale (non-négo Architecte)
- **Décision :** ne PAS mutuler `src/pages/[dest]/index.astro` globalement — il est en PROD pour crete+turquie. Soit un flag `episodic: true` dans `destination.json` (rendu conditionnel), soit garder le v2 intact et AJOUTER `src/pages/[dest]/[base]/index.astro` en parallèle. Activer le nouveau rendu seulement sur les nouvelles destinations. Jamais casser les deux prods en même temps pour tester.
- **Rationale :** une scission globale = régression silencieuse sur crete+turquie. Astro gère les routes parallèles ; le KML par base et la collection `bases` dest-scopée existent déjà → l'ajout est additif et non-conflictuel.
- **Persona check :** Architecte = non-négociable absolu. Les autres = neutres.

## Décision 3 : Budget — global au container, détail au CARNET (pas dans le narratif), additif (Martin avait tort sur le FORMAT)
- **Décision :** container = une FOURCHETTE globale qui qualifie le voyage (« 3 000 $ ou 7 000 $ ? » avant d'investir du temps), condensée. Détail par étape = dans le CARNET de l'épisode (mode terrain), JAMAIS intercalé dans les beats narratifs. Donnée : champ optionnel `perBase?` additif au `budgetSchema` existant, seulement si les coûts diffèrent vraiment (Séville vs Sierra = défendable).
- **Tension résolue :** Martin proposait « 2 niveaux ». Sophie : oui 2 niveaux MAIS « t'as tort sur le format — le budget par étape appartient au carnet, pas au scrollytelling, sinon tu tues la scène ». Marco/Léa poussaient pour 1 niveau (restraint). Synthèse : 2 niveaux OK, mais global=fourchette au container, détail=carnet, schéma additif, pas de chiffres dans les beats.
- **Architecte check :** `perBase?` optionnel = additif sur le Zod, CI reste verte. Commencer avec la donnée, ajouter si ça diffère réellement.

## Décision 4 : Logistique — split par SCOPE, jamais répété (Martin validé, avec garde)
- **Décision :** règle dure — touche le VOYAGE entier → container (aéroports, où trouver du cash, combien sortir, cartes acceptées, location char, déplacement ENTRE villes). Touche UNE base → carnet de l'épisode (bus local, à pied, char-pour-Jabugo). Aucune répétition. Additif (`perBase?` sur `pratiqueSchema`), seulement où la donnée est vraiment locale (le taux de change n'est PAS par-base ; l'accès à un village, oui).
- **Tension résolue :** Martin proposait « 2 niveaux ». Léa : « redondant et dangereux — t'invites quelqu'un à lire la logistique d'une base sans avoir lu l'épisode → il arrive sans mèche allumée ». Sophie : 2 niveaux OK SI granularité différente. Synthèse : 2 niveaux, mais splitté par scope strict, jamais surfacer le local au container.

## Décision 5 : Survol = HOOK narratif + grille factuelle + TUILES d'épisodes — PAS une liste de highlights (Martin reframé)
- **Décision :** le container n'est NI une vue factuelle plate NI un « top 5 highlights ». C'est : (1) un HOOK narratif — la tension/le fil conducteur du voyage entier, dans la voix de Martin, façon Bourdain qui ouvre une saison sur une tension, pas un itinéraire ; (2) une grille factuelle ultra-condensée (dates, nuits, aéroports arrivée/départ, fourchette budget) ; (3) des TUILES d'épisodes, chacune = le VRAI hook de l'épisode (photo qui donne faim + titre accrocheur). Les « highlights » SONT les tuiles d'épisodes (sourcées), pas un top-5 séparé. Composé À LA MAIN dans `destination.json`, pas auto-extrait.
- **Tension résolue :** Martin votait « highlights narratifs ». Léa (la plus dure) : « un survol highlights = structurellement une listicle ; un highlight non-sourcé = du SEO recyclé avec une plus belle police ; le container va devenir la page que tout le monde lit sans cliquer les épisodes — vous optimisez pour la flemme et recréez ce que vous haïssez ». Sophie : hybride à dominante narrative (narration croche + grille condensée). Marco : narratif court, le titre EST le hook. Architecte : à la main, pas auto-composé (la magie pète). Synthèse : le « highlights » de Martin est reframé en hook-tension + tuiles-épisodes sourcées ; PAS de top-5 ; composition manuelle.
- **Léa check (red flag résiduel) :** « si un élément du container n'a pas de `source` vérifiable, il n'existe pas. »

## Décision 6 : Navigation / routing
- **Décision :** `/dest/` = container, `/dest/base/` = épisode (additif Astro, faisable). Le container mène à l'épisode via les TUILES (photo+titre = le hook, pas « Épisode 1/2 » générique). Retour au container en UN tap depuis n'importe où dans un épisode (non-négo mobile de Sophie).
- **Persona check :** unanime sur « le titre/la photo est le hook, pas la nav ». Marco : « une liste de liens génériques, je ferme ».

## Décision 7 : Dette technique — DRYer les helpers épisode AVANT de généraliser (non-négo Architecte)
- **Décision :** `chania.astro` et `seville.astro` dupliquent intégralement `resolveSlot`/`poiPills`/`poiThumb`/`rank`/`toBeat` (~450 lignes chacune). Avant de monter `[dest]/[base]/index.astro` et une 3e destination, extraire ces helpers dans un module partagé (`scripts/lib/episode-helpers.ts` ou équivalent). Sinon chaque bugfix se fait 3×.

## Tensions non résolues — à trancher par Martin
- **Le container risque-t-il de cannibaliser les épisodes ?** Léa : les gens lisent le container, cliquent jamais. Mitigation proposée (ADR-5) : le container est CONÇU pour faire cliquer (les tuiles = le hook), pas pour se suffire. À valider que ça tient en pratique (test Marco : « salle d'attente de 10 secondes max, pas une brochure »).

## Insights surprenants
- **Sophie :** le budget par étape va dans le CARNET (mode terrain), pas dans les beats narratifs. C'est une question de FORMAT, pas de niveau — Martin avait raison sur le quoi, tort sur le où.
- **Léa :** un container-survol auto-composé re-fabrique la listicle qu'on déteste. Le container doit être sourcé ou inexistant.
- **Architecte :** le flag `episodic` est LA clé pour migrer sans casser la prod ; et le copier-coller chania/seville est une dette à régler avant de scaler, pas après.
