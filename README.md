# MyRollmate — Cinematic Dice Companion

A Foundry VTT module that replaces the plain dice roll with a full-screen cinematic overlay featuring 3D physics dice, animated character cards, card flip reveals, roulette spins, coin tosses, and more.

---

## Editions

| Feature                                    | Standard (`my-rollmate`) | Premium (`my-best-rollmate`) |
| ------------------------------------------ | ------------------------ | ---------------------------- |
| Cinematic overlay                          | ✅                       | ✅                           |
| 3D dice physics (Three.js + Cannon.js)     | ✅                       | ✅                           |
| Card flip / roulette / coin / coin toss    | ✅                       | ✅                           |
| DnD 5e & Pathfinder 2e support             | ✅                       | ✅                           |
| Multi-language (EN/DE)                     | ✅                       | ✅                           |
| MyArtist full customisation panel          | 🔒 locked                | ✅                           |
| Exclusive card designs (Flying Dead Horse) | 🔒 locked                | ✅                           |

---

## Installation

### Foundry VTT (v13+)

1. Copy the module folder (`my-rollmate` or `my-best-rollmate`) into your Foundry `Data/modules/` directory.
2. In Foundry, go to **Add-on Modules** → **Install Module** → search for "MyRollmate" or use the manifest URL.
3. Enable the module in your world's **Manage Modules** settings.

### Manual (from this repo)

The **Standard Edition** lives at the repo root (ID: `my-rollmate`).  
The **Premium Edition** is in the `my-best-rollmate/` subfolder.

---

## File Structure

```
my-rollmate/                   ← Standard Edition root
├── module.json
├── scripts/
│   ├── config.js              ← Asset registry & feature flags (ROLLMATE_IS_PREMIUM=false)
│   ├── lang.js                ← Localisation strings (EN / DE)
│   ├── audio.js               ← AudioHelper wrapper
│   ├── 3d-engine.js           ← Three.js + Cannon.js physics scene
│   ├── roll-logic.js          ← Roll outcomes, roulette, coin, group-check logic
│   ├── ui-handler.js          ← All UI rendering (overlay, menus, cards)
│   └── main.js                ← Entry point: execute(), hooks, floating launcher
├── styles/
│   └── rollmate.css           ← Floating launcher button styles
├── assets/
│   ├── images/
│   └── sounds/
└── lib/
    ├── three.min.js
    └── cannon.min.js

my-best-rollmate/              ← Premium Edition (identical structure, premium flags)
├── module.json
├── scripts/
│   └── config.js              ← ROLLMATE_IS_PREMIUM=true, ID="my-best-rollmate"
│   └── …                      ← rest same as Standard
├── styles/
├── assets/
└── lib/
```

---

## Script Load Order

Foundry loads scripts in the order declared in `module.json` (order is important and must consider as described below):

```
config.js → lang.js → audio.js → 3d-engine.js → roll-logic.js → ui-handler.js → main.js
```

Each module reads shared session state from `window.RollmateCtx` (populated by `main.js`).

---

## How It Works

1. Foundry fires `Hooks.once("ready", initRollmateHooks)`.
2. `initRollmateHooks()` injects the **floating launcher button** (drag-anywhere gold icon).
3. The GM clicks the launcher → `window.RollmateUniversal.execute()` runs:
   - Preloads the wood texture asset.
   - Loads Three.js + Cannon.js from local `lib/` (no CDN).
   - Detects game system (DnD 5e / PF2e).
   - Reads per-user customisation flags.
   - Populates `window.RollmateCtx` for all sub-modules.
   - Opens the **Start Menu** via `showStartMenu()`.
4. Other players are notified via **scene flags** and their clients auto-open the overlay.
5. Results are stored in **actor flags** (`rollmateRollResult`) and synced to all clients in real time.

---

## Key Globals

| Global                               | Purpose                                                      |
| ------------------------------------ | ------------------------------------------------------------ |
| `window.RollmateUniversal.execute()` | Launch the overlay                                           |
| `window.RollmateCtx`                 | Shared session context (set by main.js, read by sub-modules) |
| `RollmateAssets`                     | All local asset paths (images, sounds, libs)                 |
| `RollmateFlags`                      | Foundry flag keys (`scope`, `checkKey`, `resultKey`)         |
| `window.RollmateLang`                | Language helper (`changeLang(code)`, `t(key)`)               |

---
## Credits

- **Flying Dead Horse** — module author & artwork
- Three.js (MIT) — 3D rendering
- Cannon.js (MIT) — physics simulation
- Google Fonts — Cinzel typeface

---

## License

All artwork in `assets/images/Designs/FlyingDeadHorse/` is © Flying Dead Horse. All rights reserved.  

