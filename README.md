# dimensions

An interactive 3D head rendered in the browser with Three.js (package name `focus-head`): displacement-mapped geometry, eyes that follow the pointer, a cursor-driven specular light, bloom post-processing, and a control panel for eye position, lighting, field of view and displacement scale.

## Quick start

```sh
npm install
npm start       # http-server on http://localhost:3200
```

There is no build step: `npm run build` only prints a message. Three.js 0.160.0 is loaded from the `esm.run` CDN at runtime, so the page needs network access.

## Repository map

- `index.html`, `index.css`, `index.js`: the page, its styles and the scene code.
- `assets/`: texture, displacement, normal, specular and ambient-occlusion maps.
- `archive/`: earlier modular scene code (`scene.js`, `head.js`, `eyes.js`, `shaders.js`, ...) and `config.json`; not loaded by `index.html`.
- `vercel.json`: Vercel deploys `main` only.

## Verification

There are no tests, linter or build. To check a change by hand, run `npm start`, open the page, confirm the scene renders, and check the browser console.

## Status and limitations

Experimental demo. It needs a browser with WebGL and network access to the CDN. It has no automated tests, and `package.json` is marked `private`.

## License

MIT. See [LICENSE](LICENSE).
