# Personal Portfolio

Personal portfolio showcasing my work as a Web Developer, with professional experience in Drupal and projects involving PHP, JavaScript, APIs and modern frontend development.

Use Node 24 (`nvm use`, following `.nvmrc`) and install dependencies with `npm ci`.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Astro development server |
| `npm run check:astro` | Run official Astro source diagnostics |
| `npm run build` | Generate the production site in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint:html` | Build, then validate generated HTML |
| `npm run lint:css` | Lint the CSS modules |
| `npm run lint:js` | Lint production JavaScript, tests, and JS configuration |
| `npm test` | Build, then run the DOM integration tests |
| `npm run check` | Run the complete local and CI QA pipeline, building once |

`check` runs Astro diagnostics, the production build, generated HTML validation,
CSS/JS lint, and tests in that order. `lint:html:built` and `test:built` reuse an
existing build; run them only after `npm run build`. The standalone `lint:html`
and `test` commands build first so they do not silently test stale markup.

Tests load the real `dist/index.html` into JSDOM and import the production
Playground and navigation initializers. They cover selected viewport attributes,
menu state, Escape/focus behavior, anchor targets, and breakpoint changes.
JSDOM does not verify layout; use browser smoke checks at 1280, 1000, 760, and
420px for responsive layout and the bundled script entry point.

HTML validation targets only `dist/**/*.html`, using recommended rules.
`.htmlvalidate.json` ignores trailing whitespace introduced by Astro's generated
formatting and uses `no-raw-characters`' relaxed ampersand handling for generated
text such as `Drupal & CMS`. The rule remains enabled for other raw characters;
semantic and accessibility rules remain enabled.

`src/styles/main.css` imports the styles in their original cascade order:
tokens, global foundations, header, hero/Playground, sections, projects,
contact/footer, and responsive/reduced-motion overrides. `src/scripts/main.js`
initializes navigation and Playground behavior and updates the copyright year.

GitHub Actions runs `npm ci` and `npm run check` using `.nvmrc`. GitHub Pages
deployment remains a separate task.
