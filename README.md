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
```

## Déploiement sur Cloudflare Pages

Deux options.

### Option A — Intégration Git (recommandée)

1. Pousser ce dépôt sur GitHub (déjà le cas si tu lis ceci).
2. Dans le dashboard Cloudflare → **Workers & Pages** → **Create** →
   **Pages** → **Connect to Git**, sélectionner ce dépôt.
3. Configurer le build :
   - **Framework preset** : `Vite`
   - **Build command** : `npm run build`
   - **Build output directory** : `dist`
4. **Save and Deploy**. Chaque push sur la branche de production déclenchera un
   nouveau déploiement, et chaque branche/PR aura sa propre URL de prévisualisation.

### Option B — Wrangler CLI

```bash
npm install
npm run build
npx wrangler pages deploy dist
```

La première fois, Wrangler demandera de s'authentifier et de créer (ou choisir)
le projet Pages. Le fichier `wrangler.toml` définit déjà
`pages_build_output_dir = "dist"`.

## Structure

```
.
├── index.html          # point d'entrée HTML
├── src/
│   ├── main.jsx        # bootstrap React
│   ├── App.jsx         # toute l'application (charts D3 + UI)
│   └── index.css       # reset CSS global minimal
├── public/
│   ├── favicon.svg
│   └── _redirects      # routing SPA pour Cloudflare Pages
├── vite.config.js
└── wrangler.toml       # config Cloudflare Pages (déploiement CLI)
```
