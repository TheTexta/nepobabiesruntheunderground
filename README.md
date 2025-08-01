# nepobabiesruntheunderground

This repository contains a small static website with two primary pages:

- **`index.html`** – the landing page featuring parallax scrolling effects and interactive hover animations.
- **`me.html`** – a blog style page that loads entries from `journal.json` and appends them as the user scrolls.

Images, GIFs and the accompanying `styles.css` file provide the visual styling. The "blog photos" folder stores pictures used within posts.

## Project Goals
1. Learn to do more advanced effects and interesting/enegaging creative and interactible animations
2. Create a more robust blog system
3. Add a photo browing page where one can browse through my photos over the past couple years in a creative ui (perhaps similar to that of the node system in obsidian)
4. implement some kind of noise generators to add to the distorted noise/glitch/datamosh aesthetic of the site.

## Project Structure
```
/ (repo root)
├── index.html
├── me.html
├── journal.json
├── styles.css
├── blog photos/
└── [images and gif assets]
```

To view the site, open `index.html` in any web browser. Clicking the "me" section links to `me.html` where posts are displayed dynamically.

## Running Tests
Install dependencies if you haven't already and run the test script:

```bash
npm install   # if dependencies are added
npm test
```

The repository does not specify a Node.js version, but the tests should run with any recent LTS release.
