# chartrandapps.ca

Static website for Chartrand Apps. Hosted on GitHub Pages with custom domain `chartrandapps.ca`.

## Structure

```
index.html                  # Landing page
vetready/
  index.html                # VetReady app page
  privacy.html              # Privacy policy
  support.html              # Support & FAQ
css/
  style.css                 # Global styles
images/                     # App icons, logo
CNAME                       # Custom domain
```

## URLs

- https://chartrandapps.ca
- https://chartrandapps.ca/vetready/
- https://chartrandapps.ca/vetready/privacy.html
- https://chartrandapps.ca/vetready/support.html

## Deploy

Push to `main` branch. GitHub Pages auto-deploys.

## DNS (Namecheap)

Add these A records pointing to GitHub Pages IPs:

```
@   A   185.199.108.153
@   A   185.199.109.153
@   A   185.199.110.153
@   A   185.199.111.153
```

Add a CNAME record:

```
www   CNAME   martinchartrand.github.io
```

## Réactivation après dormance

Le repo dort 8+ mois entre les voyages. À la réactivation, le risque n'est pas ton code —
c'est le monde qui a bougé (actions dépréciées, runners retirés, npm qui a changé de version).
Le `heartbeat.yml` (cron mensuel) commit `reports/heartbeat.txt` pour garder le repo actif
(règle 60 jours + dépublication Pages) et faire tourner la chaîne chaque mois — une casse se
voit en semaines, pas à J-90 du voyage.

Rituel à la reprise (ARCHITECTURE.md §2/§7) :

1. **Commit no-op d'abord** — pousse un changement vide pour faire tourner la CI *avant* toute
   modif. Ça distingue « le monde a bougé » de « j'ai cassé » :
   ```
   git commit --allow-empty -m "chore: réactivation — vérif CI" && git push
   ```
2. **Toolchain** — versions exactes épinglées dans `.mise.toml` :
   ```
   mise install && mise trust && npm ci
   ```
3. **xcode-select** — à revérifier après un upgrade macOS majeur (les outils en ligne de commande
   se désappairent) :
   ```
   xcode-select -p   # sinon : xcode-select --install
   ```

Le test de réactivation valide J+0, pas J+300 — c'est le heartbeat et ce rituel qui couvrent le reste.
