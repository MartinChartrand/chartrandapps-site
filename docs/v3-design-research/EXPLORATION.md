# Exploration design/UX v3 — déconstruction des références

**Date : 2026-06-12 — Session d'exploration (AUCUN code). Suite du feedback de Martin :**
> « la page est OK mais pas très engageante. c'est un beau prototype, mais le design sucks en esti. y'a pas d'interactivité, pas de flow (sauf un long scroll plate). »

**Contrainte acquise par la v2 :** le contenu est 100 % données structurées (content collections, schémas Zod). Le design peut être refait sans toucher au contenu. Critère non négociable : toute reco = lien cliquable (gardé en CI par content-parity.test.mjs).

---

## 1. Références étudiées (captures navigateur, 2026-06-12)

### A Trail Tale — https://atrailtale.com
Récit gamifié d'un thru-hike de l'Appalachian Trail (Unity, pixel art). Visité en direct : jour 68, mile 1,286, Pennsylvanie — le site EST le voyage en cours.

**Patterns extraits :**
- **La progression est un élément d'interface de premier ordre** : compteur mile/jour toujours visible, % de la section courante, carte de progression Georgia→Katahdin.
- **Le voyage est un espace continu**, pas une liste de pages. On *habite* la scène ; les onglets (Map/Status/Journal/Log) sont des couches par-dessus, pas des destinations.
- **État ambiant** : météo, heure du jour, fortitude/morale changent la scène et la musique. Le site vit.
- **Voix narrative incarnée** : les « blurbs » apparaissent au-dessus du personnage (« Click on me to see what's on my mind! »). Le narrateur est un personnage, pas un bloc de texte.
- **Scrubber temporel** : on peut naviguer la timeline du voyage (date/heure).
- Boucle d'engagement : bouton « Send Love » — le visiteur participe.

**Transposable chez nous :** progression visible (jour X de Y, chapitre X de Y), état ambiant léger (golden hour selon l'heure du lieu ?), narrateur incarné (la voix de Martin & Sophie). PAS transposable : Unity/jeu complet — overkill.

### NBC News, « Built to keep Black from white » (mur de Birwood, Détroit) — https://www.nbcnews.com/specials/detroit-segregation-wall/
Scrollytelling primé où **la carte est la scène**. Capturé en séquence au scroll.

**Patterns extraits (séquence observée) :**
1. Hero pleine page : vidéo de fond + titre superposé, zéro chrome.
2. Récit en colonne classique (lisibilité d'abord) avec liens inline.
3. **Bascule : la carte prend tout le viewport.** Le texte devient une petite carte flottante en coin (« This is Detroit's Birwood Wall »), le mur surligné rouge sur fond de carte épurée gris/blanc.
4. **Entre deux beats de scroll, la caméra bouge** : zoom ville → rue en 3D extrudée, le mur rouge courant dans la ruelle, la légende narrative mise à jour.
5. La caméra remonte pour le beat suivant. Chorégraphie complète pilotée par le scroll.

**Transposable chez nous :** c'est LE pattern pour le fil conducteur d'un itinéraire. Leaflet `flyTo()` + carte pleine page + beats narratifs en overlay = 80 % de l'effet sans 3D ni Mapbox. On a déjà les coordonnées de tous les POI et les cartes par chapitre.

### IDMC, « The road was long: a voice from Ukraine » — https://story.internal-displacement.org/the-road-was-long-a-voice-from-ukraine/index.html
Récit première personne illustré (Shorthand). Pattern « storybook ».

**Patterns extraits :**
- Hero en écran scindé : illustration à gauche, titre à droite.
- **L'illustration pleine page est la scène ; le texte avance par cartes superposées au scroll.** L'image reste, les beats de texte défilent par-dessus (sac d'urgence, passeports, argent — l'image montre ce que le texte raconte).
- Pull-quotes en jalons émotionnels (« We are being bombed. ») qui scandent le récit.
- Une seule voix, un seul fil — aucune navigation, aucun choix. L'engagement vient du rythme.

**Transposable chez nous :** le pattern photo-pleine-page + beats de texte pour les moments forts d'un chapitre (une taverne, une plage au couchant). Pull-quotes = les phrases-clés de nos blocs prose actuels.

### Black Tomato (Grèce) — https://www.blacktomato.com/destinations/greece/
Voyagiste de luxe. La référence « éditorial commercial haut de gamme ».

**Patterns extraits :**
- **Voix éditoriale assumée dès la première ligne** : « It took Odysseus ten years to cross the islands of the Aegean. But he made it. » Puis « There is a small, twisted olive tree in the grounds of the Temple of Poseidon… » — du concret sensoriel, pas du marketing générique.
- Hero vidéo pleine largeur, titre superposé.
- **Sous-navigation collante par intention** : Overview / Itineraries / See & Do / Hotels / Inspiration. On choisit son mode de consultation, pas un chapitre.
- Cartes d'itinéraires avec métadonnées franches : « 9 NIGHTS — From £9,800 ».
- Expériences en cartes « Read More » progressives (résumé → détail à la demande).
- À noter : ils vendent EXACTEMENT notre angle — « Biking Santorini's **non-touristic** villages », « Island hop to Greece's **hidden gems** ». Le positionnement local-secrets est un argument de luxe, pas un compromis.

**Transposable chez nous :** la voix éditoriale (réécriture du ton des intros), la sous-nav par intention (Itinéraire / Carte / Restos / Pratique), la révélation progressive (résumé d'abord, densité à la demande).

### Atlas Obscura — bot-wallé (Cloudflare 403, cohérent avec notre allowlist : TripAdvisor 403, Booking 202)
Pas de capture possible. Modèle documenté de mémoire (et déjà analysé dans la deep-research de la refonte v2) :
- **Un lieu = une histoire** : chaque place page raconte pourquoi ce lieu est étrange/merveilleux, jamais une fiche.
- Sections fixes : récit → « Know Before You Go » (pratique sec et utile) → carte → lieux à proximité.
- Communauté : « Been Here » / « Want to Go » — le statut personnel transforme le catalogue en liste de vie.
- La crédibilité vient du vécu et de la curation, pas de l'exhaustivité.

**Transposable chez nous :** la structure narrative par POI (histoire d'abord, pratique ensuite), et le germe de la feature « incontournables perso » (statut vu/à voir = notre version privée de Been Here/Want to Go).

### La référence maîtresse (confession de Martin, en cours de session) : Anthony Bourdain
*No Reservations* et surtout *Parts Unknown*. Le comportement réel de Martin en voyage : il cherche et essaie les endroits où Bourdain a mangé (Lunch Lady à HCMC, le bún bò Huế du marché public de Huế). C'est LE modèle mental du produit — pas un site de scrollytelling, un **épisode de Parts Unknown consultable**.

**Ce que Bourdain change à la grille de lecture :**
- **La structure d'un épisode, pas d'un guide** : cold open (atmosphère, hook), arrivée, puis une suite de SCÈNES — chaque scène est un repas, une personne, un lieu. Jamais une liste. Le chapitre v3 = un épisode ; le POI vedette = une scène.
- **La bouffe est la porte d'entrée, pas le sujet** : chez Bourdain, le bol de soupe ouvre sur l'histoire, la politique, la vie du quartier. Notre collection `dishes` (déjà des entités éditoriales au schéma !) devient le fil conducteur naturel des scènes.
- **Le test Bourdain pour un POI vedette** : qui est derrière ? pourquoi ça compte ? on commande quoi ? on s'assoit où ? Si on ne peut pas répondre, c'est une entrée de carnet, pas une scène. (Lunch Lady = une femme, une soupe différente chaque jour, des tabourets de plastique.)
- **La voix** : première personne, opinionée, anti-bullshit, zéro flatterie de brochure. Le contraire exact du ton catalogue actuel.
- **La preuve par le pèlerinage** : des gens (dont Martin) voyagent littéralement en suivant « Bourdain ate here ». La feature « incontournables perso » v3, c'est exactement ça : la couche « Martin & Sophie ont mangé ici » que d'autres pourront suivre. Validation directe du concept.

---

### Le sourcing par graphe de confiance (précision de Martin, même session)
Pour la bouffe, Martin suit un panel de créateurs : **Mark Wiens**, **Lila (curiousaboutvietnam)**, **Sonny (Best Ever Food Review Show)**, **Mickey Scotch** (perles en Thaïlande). Ils trouvent les meilleurs endroits locaux, jamais grand-public touristique. Direction retenue pour le skill v3 : **peu importe la destination, le skill doit découvrir les créateurs bouffe locaux crédibles et trianguler leurs recommandations** — remplacer le review aggregate (TripAdvisor) par un graphe de confiance humain.

**Mécanique proposée (failles adressées d'avance) :**
- **Règle de convergence** : un spot devient une scène seulement si ≥ 2 sources indépendantes convergent, ou 1 source + corroboration en langue locale (avis Google dans la langue du pays = les locaux y mangent). Protège contre le contenu commandité non déclaré.
- **Panel à deux tiers** : méga-créateurs (Wiens, Sonny) = classiques-devenus-célèbres, à étiqueter comme tels (effet Bourdain : Lunch Lady, Jay Fai — featuré = bientôt envahi) ; micro-créateurs locaux = perles actuelles. La **date de la vidéo est une donnée critique**.
- **Grille de crédibilité pour découvrir les locaux** : mange devant caméra sur place, commentaires en langue locale, ancienneté du canal, faible densité de #ad, retourne aux mêmes places.
- **Provenance au schéma** : chaque POI sourcé porte `sources: [{créateur, URL vidéo, date}]` — un lien cliquable de plus (critère), un hook narratif de scène (« Sonny en a fait un épisode »), et un input pour `revalidate-businesses` (une vidéo de 2022 ≠ un resto ouvert en 2027).
- YouTube se recherche bien (transcripts disponibles, pas de bot-wall) — contrairement à TripAdvisor/Booking déjà sur notre allowlist de domaines bloqués.

---

## 2. Diagnostic du v2 (confrontation)

Capture de référence : `reports/parite-2026-06-12/v2-crete.png`. Le constat est mécanique :

| Symptôme | Cause structurelle |
|---|---|
| « Long scroll plate » | Structure répétée × 4 chapitres : en-tête → prose → tableaux → grille d'images → carte. Aucune variation de rythme. |
| « Pas engageant » | Tout est au même niveau d'importance. La densité d'information écrase la hiérarchie : on ne sait jamais ce qui est LE moment du chapitre. |
| « Pas d'interactivité » | La carte Leaflet est un appendice en fin de chapitre, jamais une scène. Aucun élément ne répond au scroll. Aucune notion de progression. |
| « Pas pro » | Pas de voix. Les intros décrivent au lieu de raconter. Aucun hero fort par chapitre. |

La parité v2 a fidèlement reproduit… les défauts de design de la v1. C'était le mandat ; maintenant on le dépasse.

## 3. Principes proposés pour la v3

1. **L'itinéraire est un récit avec un axe** (le temps, la route) — pas une base de données paginée. Le scroll raconte ; la densité se consulte.
2. **La carte devient la scène du fil conducteur.** Entre chapitres : carte pleine page, `flyTo()` vers la prochaine étape, beat narratif en overlay (pattern NBC, fait avec Leaflet existant).
3. **Hiérarchie à deux vitesses** : un flow narratif principal (photos pleine page + beats, pull-quotes, pattern storybook) ET une couche de référence dense accessible à la demande (les tableaux/POI actuels, repliés derrière la sous-nav par intention, pattern Black Tomato). On ne jette RIEN du contenu — on le réorganise en strates.
4. **Progression visible** : jour X / Y, chapitre courant, trace parcourue sur la mini-carte (pattern A Trail Tale, version sobre).
5. **Toute reco reste un lien cliquable.** Non négociable, gardé en CI. La refonte ne doit jamais faire reculer la parité liens/images (≥ 0.95).
6. **La voix local-secrets s'incarne dans l'écriture** (pattern Atlas Obscura/Black Tomato) : chaque POI mis en avant raconte POURQUOI il vaut le détour, le pratique suit.

## 4. La tension à trancher (décision de design centrale)

**Deux modes d'usage contradictoires :**
- **Rêver/planifier** (avant le voyage, desktop, Sophie et Martin sur le sofa) → veut du flow, du scrollytelling, de l'émotion.
- **Terrain** (pendant le voyage, mobile, devant la taverne) → veut l'accès en 2 taps : la liste, le lien Maps, les heures. Le scrollytelling est un OBSTACLE ici.

Le critère liens-cliquables existe parce que le site sert sur le terrain. La v3 ne peut pas sacrifier le mode terrain pour le mode rêve. Piste : la sous-nav par intention fait le pont — le flow narratif est la page par défaut, un mode « Carnet » (liste dense, filtrable, par chapitre) à un tap. À débattre.

## 5. Faisabilité technique (survol, validé contre l'existant)

- **Scroll-driven sans framework** : IntersectionObserver est déjà dans notre code (lazy-load des cartes Leaflet). Les beats narratifs = la même mécanique. CSS scroll-driven animations (bien supporté en 2026) pour les transitions légères.
- **Carte-scène** : Leaflet `flyTo`/`fitBounds` entre beats. Piège connu à respecter : CSS Leaflet jamais en `@import` scopé Astro (leçon v2).
- **Aucune dépendance lourde nécessaire** : pas de Unity, pas de Three.js, pas de Mapbox GL. Le pattern NBC se dégrade bien : sans JS, la carte redevient statique et le texte reste lisible.
- **Le contenu ne bouge pas** : les schémas Zod actuels portent déjà tout ce qu'il faut (coordonnées, rôles, liens, prose). La v3 = nouveaux composants de rendu + peut-être un champ `beat`/`highlight` éditorial pour marquer LE moment d'un chapitre.

## 6. Prochaines étapes proposées

1. **Trancher la tension rêve/terrain** (section 4) — décision de Martin, ou débat personas (`/persona-debate`).
2. **Prototype d'UN chapitre** (Chania) en mode scrollytelling : carte-scène d'ouverture + storybook + couche carnet. Mesurer le feel avant de généraliser.
3. Si le prototype convainc : décliner aux 4 chapitres × 2 sites, puis intégrer au skill `/voyage-new`.
4. Les features « comparaison de dates » et « incontournables perso » se grefferont sur la nouvelle structure (le mode Carnet est leur habitat naturel).

---
*Captures réalisées en session (pinchtab) le 2026-06-12 ; les sites de référence restent consultables aux URLs ci-dessus. Atlas Obscura inaccessible aux bots — analyse de mémoire.*
