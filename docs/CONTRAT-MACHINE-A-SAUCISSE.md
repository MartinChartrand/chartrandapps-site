# Contrat machine à saucisse

Le contrat d'opération de l'agent sur ce projet. Pas une suggestion. Les mémoires
le disaient déjà — il est ici parce qu'elles ont été ignorées sous pression. Ici, ça a des dents :
`npm run audit` force le plancher + sort l'auto-audit. À rouler à la fin de chaque morceau.

## Pourquoi ce doc existe

Session 2026-06-13 : l'agent a pris des raccourcis. Mur frappé (source 403, harness coincé)
→ il a abandonné ou downgradé au lieu de contourner. Aucun agent spawné en parallèle pour
trouver l'alternative. Le vert de `validate:fast` a été pris pour « fini ».

Cause racine : **le vert machine est un optimum local qui a le goût de « fini ».** La CI sort
exit 0 même quand le produit est creux — date placeholder, image stock, claim non sourcé. Le
vert devient une excuse pour arrêter. Le plancher est pris pour le plafond.

## La machine

```
input (destination / chapitre)  →  recherche honnête et brutale  →  output vérifié au pixel ET prêt au code
```

## Loi 1 — Un mur est un INPUT, pas un STOP

Source bloquée, outil qui plante, donnée introuvable : c'est le mandat de l'agent de
contourner. Spawner des agents de recherche **en parallèle** sur les sources alternatives.
Martin est le **dernier recours**, jamais le premier réflexe. (mémoire `principe-debloquer-avant-consulter`)

Violé si : « j'ai frappé un mur, donc j'ai downgradé / mis un placeholder / renvoyé la balle à Martin »
sans avoir d'abord épuisé le contournement (agents, sources alternatives, autre angle).

## Loi 2 — Sourcé ou inexistant

Tout claim porte une source vérifiable. Le filet vision mord (serrano ≠ bellota, Alcázar
éventail ≠ jardins) → **re-sourcer, jamais inventer**. Inverifiable = un **jaune honnête**, pas
un faux vert. Toute reco = un lien cliquable. (mémoires `bareme-temoin-images`,
`critere-liens-cliquables` ; un élément sans source n'existe pas — red flag de Léa, ADR-5)

## Loi 3 — Vérifié à deux couches, les deux obligatoires

- **Pixel** : l'image EST ce qu'elle prétend. Test de l'ami-témoin (Sophie pour l'Espagne).
  `alt` = les vrais pixels, jamais l'alt menteur hérité du manifest.
- **Code** : `npm test` vert, `npm run validate:fast` exit 0, golden-master zéro-régression
  sur tout refactor, parité texte/liens. Code-ready, pas « ça build ».

## Méta-loi — VERT ≠ FINI

Le vert machine c'est le **plancher**. Le **plafond** c'est la barre humaine : le feel Bourdain,
l'image qui hooke au premier scroll, le produit qui donne faim ET sert d'outil de départ.
Le verdict « fini » appartient à Martin, jamais à la CI. (mémoires `v3-north-star-episode-images`,
`definition-produit-guide-et-outil`) Jamais de stock menteur. Cloner la référence, changer
seulement l'info — pas réinventer la mécanique (`principe-cloner-pas-reinventer`).

## L'auto-audit — à SORTIR à chaque morceau (pas à cacher)

`npm run audit` roule le plancher (test + validate:fast) puis imprime ces questions. Y répondre
à voix haute à Martin, honnêtement, surtout quand la réponse est gênante :

1. **Murs** — frappé quoi ? contourné comment ? spawné quoi ? abandonné quoi ?
2. **Placeholders** — qu'est-ce qui reste faux/temporaire (dates, slots, blurbs) ?
3. **Sources** — quel claim n'a pas encore de source vérifiable ?
4. **Pixel** — chaque image passe-t-elle le test du témoin ? `alt` = vrais pixels ?
5. **Vert-mais-creux** — qu'est-ce qui passe la machine mais pas la barre humaine ?
6. **Ce que je cache** — qu'est-ce que je serais tenté de ne pas mentionner ?
