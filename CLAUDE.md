# CLAUDE.md

Contexte projet pour Claude Code. Lis ceci avant de travailler sur le dépôt.

## Ce que c'est

« On a tous grandi » — une petite application web (mono-page) qui compare les
**courbes de croissance** (taille) de plusieurs personnes, à la fois au fil des
années et « au même âge ». Construit avec **React 18 + Vite**, graphiques en
**D3**, icônes **lucide-react**. Aucune dépendance backend : tout est côté client.

## Commandes

```bash
npm install        # dépendances (auto en session web via le hook SessionStart)
npm run dev        # serveur de dev → http://localhost:5173
npm run build      # build de prod → dist/
npm run preview    # sert le build de prod localement
npm run lint       # ESLint (flat config, eslint.config.js)
npm run test       # Vitest (jsdom) en une passe
npm run test:watch # Vitest en mode watch
```

Avant tout commit, les trois doivent passer : **`npm run lint`**,
**`npm run test`**, **`npm run build`**.

- **ESLint** : config plate dans `eslint.config.js` (React + hooks + react-refresh).
  `react/no-unescaped-entities` est désactivé (apostrophes FR dans le JSX).
- **Vitest** : config dans `vite.config.js` (`environment: 'jsdom'`), setup dans
  `src/test/setup.js` (matchers jest-dom + stub `ResizeObserver` que jsdom n'a pas).
  Tests dans `src/**/*.test.jsx`. Note : les noms/titres apparaissent souvent
  en double (label SVG du graphe + carte), donc préférer `getAllByText`.

## Structure

```
index.html              # point d'entrée HTML (Vite)
src/main.jsx            # bootstrap React (monte <App/>, importe index.css)
src/App.jsx             # TOUTE l'app : data d'exemple, charts D3, UI, CSS-in-JS
src/App.test.jsx        # tests de rendu (Vitest + Testing Library)
src/index.css           # reset CSS global minimal (marges body)
src/test/setup.js       # setup Vitest (jest-dom + stub ResizeObserver)
public/favicon.svg      # favicon
vite.config.js          # Vite + @vitejs/plugin-react + config Vitest
eslint.config.js        # config ESLint (flat config)
wrangler.toml           # config de déploiement Cloudflare (voir plus bas)
.claude/                # hook SessionStart (npm install en session web, async)
```

`src/App.jsx` contient presque tout, y compris les styles (injectés via une
balise `<style>` dans le composant `App`, pas dans un fichier `.css`). Les
couleurs/tokens sont en haut du fichier (`PALETTE`, `PERSON_COLORS`).

## Déploiement (Cloudflare — Workers Static Assets)

Le site est servi par un Worker « assets-only » qui sert le contenu de `dist/`.
La config est dans `wrangler.toml` :

```toml
[assets]
directory = "./dist"
not_found_handling = "single-page-application"
```

Le projet Cloudflare est connecté à ce dépôt GitHub via le dashboard avec :
- **Build command** : `npm run build`
- **Deploy command** : `npx wrangler deploy`  ← Workers, PAS `wrangler pages deploy`
- **Production branch** : `main`

⚠️ Piège connu : ce projet utilise **`wrangler deploy`** (Workers Static Assets),
pas `wrangler pages deploy`. Ne PAS remettre `pages_build_output_dir` dans
`wrangler.toml` — `wrangler deploy` ne le lit pas et échoue avec
« Missing entry-point to Worker script or to assets directory ».

Déploiement manuel : `npm run build && npx wrangler deploy`.

## Workflow git

- Branche par défaut : `main`. Développer sur des branches de feature et merger
  dans `main` (chaque push sur `main` redéploie via Cloudflare).
- Toujours vérifier `npm run build` avant de pousser.

## Pistes d'amélioration connues

- Les mesures sont identifiées par `(date, height)` ; deux mesures identiques
  poseraient problème à la suppression. Passer à des IDs de mesure stables
  serait plus robuste.
- Persistance : les personnes/mesures sont sauvegardées dans `localStorage`
  (clé `growth-comparator:people`, voir `loadPeople` dans `src/App.jsx`) et
  rechargées au démarrage. Les préférences d'affichage (intervalle d'âges,
  affichage des points) ne sont pas encore persistées — piste d'amélioration.
