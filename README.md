# On a tous grandi · Comparateur de courbes de croissance

Une petite application React qui permet de saisir des tailles à différents âges
pour plusieurs personnes, puis de comparer leurs courbes de croissance — à la
fois **au fil des années** (sur la même frise du temps) et **au même âge**
(comme si tout le monde avait démarré en même temps). Une animation permet de
faire défiler le temps et de voir les courbes se dessiner.

Construit avec **React**, **Vite**, **D3** et **lucide-react**.

## Développement local

```bash
npm install
npm run dev      # serveur de dev sur http://localhost:5173
npm run build    # build de production dans dist/
npm run preview  # prévisualise le build de production
npm run lint     # ESLint
npm run test     # Vitest (jsdom)
```

## Déploiement sur Cloudflare

Le projet est déployé via **Workers Static Assets** : un Worker « assets-only »
sert le contenu statique de `dist/`. La config est dans `wrangler.toml`
(`[assets] directory = "./dist"`), avec `not_found_handling =
"single-page-application"` pour le routing côté client.

### Intégration Git (configuration actuelle dans le dashboard)

Dans le dashboard Cloudflare → **Workers & Pages**, le projet est connecté à ce
dépôt avec :

- **Build command** : `npm run build`
- **Deploy command** : `npx wrangler deploy`
- **Root directory** : `/`

Chaque push sur la branche de production déclenche un nouveau déploiement.

### Wrangler CLI (déploiement manuel)

```bash
npm install
npm run build
npx wrangler deploy
```

La première fois, Wrangler demandera de s'authentifier.

## Structure

```
.
├── index.html          # point d'entrée HTML
├── src/
│   ├── main.jsx        # bootstrap React
│   ├── App.jsx         # toute l'application (charts D3 + UI)
│   └── index.css       # reset CSS global minimal
├── public/
│   └── favicon.svg
├── vite.config.js
└── wrangler.toml       # config Cloudflare (Workers Static Assets)
```
