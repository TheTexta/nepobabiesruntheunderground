# nepobabiesruntheunderground

This repository contains a small static website with two primary pages:

- **`index.html`** – the landing page featuring parallax scrolling effects and interactive hover animations.
- **`me.html`** – a blog style page that loads entries from `journal.json` and appends them as the user scrolls.

All assets now live under the `assets` folder, with images in `assets/images`, CSS in `assets/css`, and JavaScript in `assets/js`. Blog photos are stored in `assets/images/blog`.

## Project Goals
1. Learn to do more advanced effects and interesting/engaging creative and interactible animations
2. Create a more robust blog system
3. Add a photo browing page where one can browse through my photos over the past couple years in a creative ui (perhaps similar to that of the node system in obsidian)
4. implement some kind of noise generators to add to the distorted noise/glitch/datamosh aesthetic of the site.

## Project Structure
```
/ (repo root)
├── index.html
├── me.html
├── journal.json
├── assets/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── parallax.js
│   │   └── formatDate.js
│   └── images/
│       ├── blog/
│       │   └── entree-one-photo-one.png
│       └── [...other images]
└── tests/
```

To view the site, open `index.html` in any web browser. Clicking the "me" section links to `me.html` where posts are displayed dynamically.

## Running Tests
Install dependencies if you haven't already and run the test script:

```bash
npm install   # if dependencies are added
npm test
```

The repository does not specify a Node.js version, but the tests should run with any recent LTS release.
