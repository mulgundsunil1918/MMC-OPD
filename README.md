# Mulgund Multispeciality Clinic — Website (`/docs`)

Public marketing website for the clinic. Plain HTML / CSS / JS (no build step). Deployed to GitHub Pages from this folder.

---

## 1. Add the images

Drop these files into `docs/assets/images/` with **exactly these filenames** (the site already references them):

| Filename                | What it is                                  | Status     |
|-------------------------|---------------------------------------------|------------|
| `logo.png`              | Vertical clinic logo (TRUSTED CARE + name)  | needed     |
| `clinic-front.jpg`      | Building exterior — Arihant Plaza shot      | needed     |
| `clinic-door.jpg`       | Entrance with marigold + reception sign     | needed     |
| `clinic-plaque.jpg`     | Steel name plaque (both doctors' details)   | needed     |
| `reception.jpg`         | Reception desk close-up                     | needed     |
| `consult-cabin.jpg`     | OPD consultation cabin interior             | needed     |
| `dr-sunil.jpg`          | Portrait of Dr. Sunil Mulgund               | optional — falls back to "SM" initials |
| `dr-sunita.jpg`         | Portrait of Dr. Sunita Mulgund              | optional — falls back to "SM" initials |
| `dr-viresh.jpg`         | Portrait of Dr. Viresh U Elimath            | optional — falls back to "VE" initials |

If a file is missing, the site shows a styled placeholder instead of breaking.

**Recommended sizes** (resize before uploading):
- `logo.png` — 500×500 PNG, transparent background
- Photos — 1600px on the long edge, JPG, ~80% quality

---

## 2. Edit the copy

All text lives in **`assets/i18n/translations.js`** as `en` and `kn` objects. Edit a string in both languages and the change appears everywhere it's used.

Example — to change a doctor's focus line:

```js
sunil: {
  ...
  focus: 'Newborn intensive care, paediatric infections, child wellness & vaccinations.',
  // ↑ edit this. The Kannada version below it must also be updated.
}
```

---

## 3. Pending placeholders to fill in

These are wired with a sensible default but should be replaced when you have the real value:

- **Google Business Profile review link** — open `assets/js/main.js` and replace the `GOOGLE_BUSINESS_URL` constant with your `https://g.page/r/XXXXXXXXXX/review` link.
- **Doctor portrait photos** — drop into `assets/images/` (filenames above). Until then, the cards show gradient circles with initials.

---

## 4. Deploy to GitHub Pages

1. Commit and push this `docs/` folder to the `main` branch of `mulgundsunil1918/MMC-OPD`.
2. On GitHub: **Settings → Pages**.
3. **Source**: *Deploy from a branch*.
4. **Branch**: `main`, **Folder**: `/docs`.
5. Click **Save**. Site goes live at `https://mulgundsunil1918.github.io/MMC-OPD/` in ~1 minute.

### Custom domain (optional, later)

If you point a domain like `mulgundclinic.in` at GitHub Pages, drop a file called `CNAME` into this folder containing only the domain name (no protocol). Then add the domain in **Settings → Pages → Custom domain**.

---

## 5. Local preview

No build step. Just open `index.html` in a browser, or run any static server:

```bash
# from the docs/ folder
python -m http.server 8080
# open http://localhost:8080
```

---

## 6. File map

```
docs/
├── index.html                     ← single-page site
├── .nojekyll                      ← tells GitHub Pages to skip Jekyll
├── README.md                      ← this file
└── assets/
    ├── css/styles.css             ← frosted-glass theme
    ├── js/main.js                 ← language toggle + interactions
    ├── i18n/translations.js       ← all EN + KN copy
    └── images/                    ← logo + photos (drop them here)
```

---

## 7. Tech notes

- **Bilingual toggle**: top-right header. Persists choice in `localStorage` as `mmc-lang`. Defaults to browser language if it's `kn`, otherwise `en`.
- **Frosted glass**: uses `backdrop-filter: blur()`. Works in all modern browsers (Chrome, Edge, Safari, Firefox 103+).
- **Responsive**: mobile menu kicks in below 880px. Single-column layout below 480px.
- **Fonts**: Inter (English) and Noto Sans Kannada — both loaded from Google Fonts.
- **No backend**: pure static. Forms, if added later, would need a third-party service (Formspree, Netlify Forms, etc.).
