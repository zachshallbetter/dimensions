# Contributing to dimensions

Thanks for your interest. This project is maintained by one person, so reviews are best-effort
(see [SUPPORT.md](SUPPORT.md)).

## Setup

```sh
npm install
npm start       # http-server on http://localhost:3200
```

There is no build step (`npm run build` prints a message and exits). Three.js is imported from the
`esm.run` CDN in `index.js`, so the page needs network access.

## Conventions

- ES modules loaded directly by the browser; no bundler.
- `archive/` holds earlier code that `index.html` does not load; make changes in `index.js`.
- Commit messages are short descriptive summaries; recent ones use conventional-commit style
  (`ci(vercel): ...`).

## Verifying a change

There are no automated tests. Before opening a PR, run `npm start`, check that the scene renders and
the controls respond, and confirm the browser console is clean.

## Pull requests

- Branch off `main`; keep PRs focused.
- Describe the change and how you verified it. The PR template prompts for this.
