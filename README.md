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
