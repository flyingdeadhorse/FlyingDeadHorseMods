/**
 * MyRollmate – UI Handler (ui-handler.js)
 *
 * Manages all overlay rendering:
 *   • Dynamic CSS generation (fonts, colours, backgrounds)
 *   • Settings panel
 *   • Participant stage (actor portrait cards)
 *   • Start menu
 *   • MyArtist visual-customisation panel  [standard: locked / premium: full]
 *   • Roll setup wizard
 *
 * Depends on: config.js, lang.js, audio.js, roll-logic.js
 * Loaded before: main.js
 */

// Session-state accessor – populated by execute() in main.js
function _rmCtx() {
  return window.RollmateCtx || {};
}

// Thin wrapper so ui-handler can call cleanUp() before execute() exposes window.rmCleanUp
function cleanUp() {
  if (window.rmCleanUp) window.rmCleanUp();
}

// Re-sync activeSystem / sysCfg in RollmateCtx when needed
function updateSystemState() {
  if (!window.RollmateCtx) return;
  const sys = game.system.id === "pf2e" ? "pf2e" : "dnd5e";
  window.RollmateCtx.activeSystem = sys;
  window.RollmateCtx.sysCfg =
    sys === "pf2e"
      ? {
          id: "pf2e",
          name: "Pathfinder 2",
          themeColor: "#FFD700",
          glowColor: "rgba(255,215,0,0.6)",
          logoImg: RollmateAssets.images.pf2Logo,
        }
      : {
          id: "dnd5e",
          name: "Dungeons and Dragons 5",
          themeColor: "#FF5722",
          glowColor: "rgba(255, 87, 34, 0.6)",
          logoImg: RollmateAssets.images.dnd5Logo,
        };
}

// ── Scale & text helpers ──────────────────────────────────────────────────
window.autoSizeText = function (selector, minEm = 0.5) {
  const view = $("#rollmate-universal-overlay");
  view.find(selector).each(function () {
    const el = $(this);
    el.css({ "font-size": "", transition: "none" });
    let em = el.hasClass("menu-btn") ? 1.4 : 1.0;
    while (this.scrollWidth > this.clientWidth && em > minEm) {
      em -= 0.05;
      el.css("font-size", em + "em");
    }
  });
};

// --- AUFLÖSUNG GELOCKT: SKALIERT NICHT MEHR MIT DEM FENSTER ---
window.applyWindowScaling = function () {
  const view = $("#rollmate-universal-overlay");
  if (view.length === 0) return;
  const windowEl = view.find(".cc-window");
  if (windowEl.length === 0) return;
  // Scale wird hart auf 1 gelockt, unabhängig von der Bildschirmauflösung
  windowEl.css("--ui-scale", 1);
  requestAnimationFrame(() => {
    windowEl.css("--ui-scale", 1).attr("data-scale", 1);
    window.autoSizeText(
      ".menu-btn, .indiv-skill, .indiv-ability, .roll-type-toggle, .vis-toggle",
      0.5,
    );
  });
};
$(window)
  .off("resize.rollmate")
  .on("resize.rollmate", window.applyWindowScaling);

window.updateStageScale = function () {
  const view = $("#rollmate-universal-overlay");
  if (view.length === 0) return;
  view.find(".cc-stage").each(function () {
    $(this).css("--cc-scale", 1);
  });

  let finalStage = view.find(".cc-overlay-final .cc-stage");
  if (finalStage.length) {
    let isImmersive = view.hasClass("board-mode-immersive");
    let cardsCount = finalStage.find(".cc-portrait-card").length;
    let scale = 1.4;

    if (isImmersive) {
      let gap = 15;
      finalStage.find(".cc-portrait-card").css("margin-top", "0");

      finalStage.css(
        "max-width",
        `calc((180px + ${gap}px) * 5 * var(--cc-scale))`,
      );
      finalStage.css("flex-wrap", "wrap");
      finalStage.css("gap", `calc(${gap}px * var(--cc-scale))`);

      if (cardsCount > 5 && cardsCount <= 8) {
        scale = 1.0;
      } else if (cardsCount >= 9) {
        scale = 0.85;
      }
      finalStage.css("--cc-scale", scale);
    } else {
      finalStage.css("--cc-scale", 1.4);
      finalStage.css("gap", `calc(40px * var(--cc-scale))`);
      finalStage.css("max-width", `calc(1320px * var(--cc-scale))`);
    }
  }
  setTimeout(() => window.applyWindowScaling(), 50);
};

window.fitTextToContainer = function (
  parentContainerSelector,
  textElementSelector,
  minFontSizeEm = 0.4,
) {
  const view = $("#rollmate-universal-overlay");
  if (view.length === 0) return;
  view.find(parentContainerSelector).each(function () {
    const container = $(this);
    const textElement = container.find(textElementSelector);
    if (textElement.length === 0) return;
    textElement.css({ transition: "none", "font-size": "" });
    let currentSizeEm = 0.9;
    const maxWidth = container.width() * 0.95;
    while (
      textElement[0].scrollWidth > maxWidth &&
      currentSizeEm > minFontSizeEm
    ) {
      currentSizeEm -= 0.05;
      textElement.css("font-size", currentSizeEm + "em");
    }
    setTimeout(() => textElement.css("transition", ""), 50);
  });
};

// ── Draggable utility ─────────────────────────────────────────────────────
function makeDraggable(windowEl, handleEls) {
  let isDragging = false;
  let startX, startY, initialLeft, initialTop;
  handleEls.on("mousedown", function (e) {
    if (
      e.target.closest(".cc-close") ||
      e.target.closest("#cc-back-btn") ||
      e.target.closest("#setup-back-btn") ||
      e.target.closest("#rm-settings-btn") ||
      e.target.closest("select") ||
      e.target.closest("#rollmate-lang-picker") ||
      e.target.closest("input") ||
      e.target.closest("button") ||
      e.target.closest(".roll-type-toggle") ||
      e.target.closest(".vis-toggle") ||
      e.target.closest(".interactive-dice-wrap") ||
      e.target.closest("#rm-settings-panel") ||
      e.target.closest("#btn-my-artist") ||
      e.target.closest(".art-toggle-btn") ||
      e.target.closest(".art-design-item") ||
      e.target.closest(".art-dice-container") ||
      e.target.closest(".cc-close-card") ||
      e.target.closest(".art-card-item") ||
      e.target.closest(".dice-style-btn") ||
      e.target.closest(".artist-mode-toggles") ||
      e.target.closest(".art-board-item") ||
      e.target.closest(".ctrl-icon")
    )
      return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    let style = windowEl[0].style;
    initialLeft = parseFloat(style.left) || window.innerWidth / 2;
    initialTop = parseFloat(style.top) || window.innerHeight / 2;
  });
  $(window).on("mousemove.ccDrag", function (e) {
    if (!isDragging) return;
    let scale = parseFloat(windowEl.attr("data-scale")) || 1;
    let dx = (e.clientX - startX) / scale;
    let dy = (e.clientY - startY) / scale;
    windowEl.css({
      left: initialLeft + dx + "px",
      top: initialTop + dy + "px",
    });
  });
  $(window).on("mouseup.ccDrag", function () {
    isDragging = false;
  });
}

// ── Settings panel ────────────────────────────────────────────────────────
const getSettingsHtml = (isMainMenu = false) => {
  const isGM = _rmCtx().isGM;
  if (!isGM) return "";
  let soundOn =
    game.user.getFlag(RollmateFlags.scope, "rollmateSoundEnabled") ?? true;
  let vol = game.user.getFlag(RollmateFlags.scope, "rollmateVolume") ?? 1.0;
  let langPickerHtml = "";
  if (isMainMenu) {
    langPickerHtml = `
                <div id="rollmate-lang-picker" class="elegant-select" style="position:relative; width:100%; display:flex; align-items:center; padding: 5px 10px; height: 35px; cursor: pointer; background: rgba(0,0,0,0.8); color: white; font-family: var(--rm-font); font-size: 0.9em; outline: none; border-radius: 5px; z-index: 10000; overflow: visible !important;">
                    <div id="current-lang" style="display:flex; align-items:center; gap:10px; width:100%;"><img src="https://flagcdn.com/w20/${langFlags[currentLang] || "gb"}.png" style="width:20px; height:15px; border-radius:2px; box-shadow: 0 0 2px black;"> ${langLabels[currentLang] || "English"}</div>
                    <i class="fas fa-chevron-down" style="margin-left:auto; font-size:0.8em; color:#bbb;"></i>
                    <div id="lang-dropdown" style="display:none; position:absolute; top:calc(100% + 5px); left:0; width:100%; background:rgba(0,0,0,0.95); border:1px solid #888; border-radius:5px; z-index:10001; flex-direction:column; padding:5px; box-shadow: 0 5px 15px rgba(0,0,0,0.8); max-height: 200px; overflow-y: auto;">
                        ${Object.keys(langLabels)
                          .map(
                            (k) =>
                              `<div class="lang-opt" data-val="${k}" style="display:flex; align-items:center; gap:10px; padding:8px; cursor:pointer; border-radius:3px;"><img src="https://flagcdn.com/w20/${langFlags[k]}.png" style="width:20px; height:15px; border-radius:2px; box-shadow: 0 0 2px black;"> ${langLabels[k]}</div>`,
                          )
                          .join("")}
                    </div>
                </div>`;
  }
  return `
            <div id="rm-settings-btn" class="immersive-ui-top ctrl-icon" title="Options" style="position:absolute; top:20px; left:20px; font-size:1.5em;cursor:pointer;color:rgba(255,255,255,0.7); text-shadow: 0 2px 5px black; transition: color 0.2s; z-index: 99999;"><i class="fas fa-cog"></i></div>
            <div id="rm-settings-panel" class="hidden" style="position:fixed; top:60px !important; left:20px !important; background:rgba(0,0,0,0.95); border:1px solid var(--rm-theme, #888); border-radius:8px; padding:15px; box-shadow: 0 5px 15px rgba(0,0,0,0.8); width: 220px; display: flex; flex-direction: column; gap: 15px; z-index: 9999999 !important;">
                ${langPickerHtml}
                <div style="display:flex; justify-content:space-between; align-items:center; font-family:var(--rm-font); font-size:1.1em; color:white;">
                    <span style="font-size: 0.9em;">${RollmateLang.t("settings_perf")}:</span>
                    <select id="rm-perf-select" style="background:rgba(0,0,0,0.8); color:${_rmCtx().userPerf === "min" ? "orange" : _rmCtx().userPerf === "mid" ? "yellow" : "#0f0"}; border:none; outline:none; font-weight:bold; border-radius:4px; padding:4px 8px; font-family:var(--rm-font); cursor:pointer;">
                        <option value="min" ${_rmCtx().userPerf === "min" ? "selected" : ""} style="color:orange;">Min</option>
                        <option value="mid" ${_rmCtx().userPerf === "mid" ? "selected" : ""} style="color:yellow;">Mid</option>
                        <option value="max" ${_rmCtx().userPerf === "max" ? "selected" : ""} style="color:#0f0;">Max</option>
                    </select>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; font-family:var(--rm-font); font-size:1.1em; color:white;">
                    <span>Sound:</span>
                    <div id="rm-sound-toggle-group" style="display:flex; gap:10px; cursor:pointer; font-weight:bold;">
                        <span id="rm-sound-on" style="color:${soundOn ? "#0f0" : "#888"}; text-shadow:${soundOn ? "0 0 5px #0f0" : "none"}; transition: color 0.3s;">ON</span>
                        <span id="rm-sound-off" style="color:${!soundOn ? "#0f0" : "#888"}; text-shadow:${!soundOn ? "0 0 5px #0f0" : "none"}; transition: color 0.3s;">OFF</span>
                    </div>
                </div>
                <div style="display:flex; flex-direction:column; gap:5px; font-family:var(--rm-font); font-size:0.9em; color:white;">
                    <span>${RollmateLang.t("settings_vol")}: <span id="rm-vol-label">${Math.round(vol * 100)}%</span></span>
                    <input type="range" id="rm-volume-slider" min="0" max="100" value="${Math.round(vol * 100)}" style="width:100%; cursor:pointer;">
                </div>
                <hr style="border-color:#444; margin: 5px 0;">
                <button id="rm-emergency-exit" style="background:#8a0303; color:white; border:1px solid transparent; border-radius:5px; padding:8px; font-family:var(--rm-font); font-weight:bold; cursor:pointer; width:100%; text-transform:uppercase;">${RollmateLang.t("exit")}</button>
            </div>`;
};

function attachSettingsListeners(v) {
  const isGM = _rmCtx().isGM;
  if (!isGM) return;
  v.find("#rm-settings-btn")
    .hover(
      function () {
        $(this).css("color", "white");
      },
      function () {
        $(this).css("color", "rgba(255,255,255,0.7)");
      },
    )
    .click((e) => {
      e.stopPropagation();
      let panel = v.find("#rm-settings-panel");
      panel.toggleClass("hidden");
    });

  v.on("click", "#rollmate-lang-picker", function (e) {
    e.stopPropagation();
    $(this).find("#lang-dropdown").toggle();
  });

  $(document)
    .off("click.langDropdown")
    .on("click.langDropdown", function (e) {
      if (!$(e.target).closest("#rollmate-lang-picker").length) {
        $("#lang-dropdown").hide();
      }
    });

  v.on("click", ".lang-opt", async function (e) {
    e.stopPropagation();
    const selectedLang = $(this).attr("data-val");
    await window.changeRollmateLanguage(selectedLang);
  });

  v.on("change", "#rm-perf-select", async function (e) {
    e.stopPropagation();
    let val = $(this).val();
    _rmCtx().userPerf = val;

    let color = val === "min" ? "orange" : val === "mid" ? "yellow" : "#0f0";
    $(this).css("color", color);

    await game.user.setFlag(RollmateFlags.scope, "rollmatePerformance", val);

    $("#rollmate-universal-overlay")
      .removeClass("perf-min perf-mid perf-max")
      .addClass("perf-" + val);
    if (window.rm3DEngine && window.rm3DEngine.renderer) {
      let pixelRatio = val === "min" ? 0.5 : val === "mid" ? 0.75 : 1;
      window.rm3DEngine.renderer.setPixelRatio(pixelRatio);
    }
  });

  v.on("click", "#rm-sound-toggle-group", async function (e) {
    e.stopPropagation();
    let newState = !(
      game.user.getFlag(RollmateFlags.scope, "rollmateSoundEnabled") ?? true
    );
    await game.user.setFlag(
      RollmateFlags.scope,
      "rollmateSoundEnabled",
      newState,
    );
    v.find("#rm-sound-on").css({
      color: newState ? "#0f0" : "#888",
      "text-shadow": newState ? "0 0 5px #0f0" : "none",
    });
    v.find("#rm-sound-off").css({
      color: !newState ? "#0f0" : "#888",
      "text-shadow": !newState ? "0 0 5px #0f0" : "none",
    });
    if (!newState) {
      window.stopLevitate();
      window.stopHeartbeat();
    } else if (
      canvas.scene.getFlag(RollmateFlags.scope, RollmateFlags.checkKey)
        ?.type === "randomTarget"
    ) {
      let p = canvas.scene.getFlag(RollmateFlags.scope, "roulettePhase") || 0;
      if (p < 2 && p > 0) window.playLevitate();
      else if (p === 2) window.playHeartbeat();
    }
  });
  v.on("input", "#rm-volume-slider", function (e) {
    e.stopPropagation();
    v.find("#rm-vol-label").text(parseInt($(this).val()) + "%");
  });
  v.on("change", "#rm-volume-slider", async function (e) {
    e.stopPropagation();
    let val = parseInt($(this).val()) / 100;
    await game.user.setFlag(RollmateFlags.scope, "rollmateVolume", val);
    if (window.rmAudioLevitate) window.rmAudioLevitate.volume = val;
    if (window.rmAudioHeartbeat) window.rmAudioHeartbeat.volume = val * 0.8;
  });
  v.on("click", "#rm-emergency-exit", async function (e) {
    e.stopPropagation();
    await canvas.scene.unsetFlag(RollmateFlags.scope, RollmateFlags.checkKey);
    await canvas.scene.unsetFlag(RollmateFlags.scope, "rouletteWinner");
    await canvas.scene.unsetFlag(RollmateFlags.scope, "roulettePhase");
    cleanUp();
    console.log("Rollmate beendet (Notausstieg).");
  });
}

const getSkillList5e = () => [
  { label: RollmateLang.t("acr"), key: "acr" },
  { label: RollmateLang.t("ani"), key: "ani" },
  { label: RollmateLang.t("arc"), key: "arc" },
  { label: RollmateLang.t("ath"), key: "ath" },
  { label: RollmateLang.t("dec"), key: "dec" },
  { label: RollmateLang.t("his"), key: "his" },
  { label: RollmateLang.t("ins"), key: "ins" },
  { label: RollmateLang.t("itm"), key: "itm" },
  { label: RollmateLang.t("inv"), key: "inv" },
  { label: RollmateLang.t("med"), key: "med" },
  { label: RollmateLang.t("nat"), key: "nat" },
  { label: RollmateLang.t("prc"), key: "prc" },
  { label: RollmateLang.t("prf"), key: "prf" },
  { label: RollmateLang.t("per"), key: "per" },
  { label: RollmateLang.t("rel"), key: "rel" },
  { label: RollmateLang.t("slt"), key: "slt" },
  { label: RollmateLang.t("ste"), key: "ste" },
  { label: RollmateLang.t("sur"), key: "sur" },
];
const getSaveList5e = () => [
  { label: RollmateLang.t("str"), key: "str" },
  { label: RollmateLang.t("dex"), key: "dex" },
  { label: RollmateLang.t("con"), key: "con" },
  { label: RollmateLang.t("int"), key: "int" },
  { label: RollmateLang.t("wis"), key: "wis" },
  { label: RollmateLang.t("cha"), key: "cha" },
];
const getFlatList5e = () => [
  { label: RollmateLang.t("flat_straight"), key: "flat_straight" },
  { label: RollmateLang.t("flat_death"), key: "flat_death" },
];
const getAbilitiesList5e = () => [
  { label: RollmateLang.t("abl_str"), key: "str" },
  { label: RollmateLang.t("abl_dex"), key: "dex" },
  { label: RollmateLang.t("abl_con"), key: "con" },
  { label: RollmateLang.t("abl_int"), key: "int" },
  { label: RollmateLang.t("abl_wis"), key: "wis" },
  { label: RollmateLang.t("abl_cha"), key: "cha" },
];
const defaultAbilities5e = {
  acr: "dex",
  ani: "wis",
  arc: "int",
  ath: "str",
  dec: "cha",
  his: "int",
  ins: "wis",
  itm: "cha",
  inv: "int",
  med: "wis",
  nat: "int",
  prc: "wis",
  prf: "cha",
  per: "cha",
  rel: "int",
  slt: "dex",
  ste: "dex",
  sur: "wis",
};

const getSkillListPF2 = () => [
  { label: RollmateLang.t("acrobatics"), key: "acrobatics" },
  { label: RollmateLang.t("arcana"), key: "arcana" },
  { label: RollmateLang.t("athletics"), key: "athletics" },
  { label: RollmateLang.t("crafting"), key: "crafting" },
  { label: RollmateLang.t("deception"), key: "deception" },
  { label: RollmateLang.t("diplomacy"), key: "diplomacy" },
  { label: RollmateLang.t("intimidation"), key: "intimidation" },
  { label: RollmateLang.t("medicine"), key: "medicine" },
  { label: RollmateLang.t("nature"), key: "nature" },
  { label: RollmateLang.t("occultism"), key: "occultism" },
  { label: RollmateLang.t("perception"), key: "perception" },
  { label: RollmateLang.t("performance"), key: "performance" },
  { label: RollmateLang.t("religion"), key: "religion" },
  { label: RollmateLang.t("society"), key: "society" },
  { label: RollmateLang.t("stealth"), key: "stealth" },
  { label: RollmateLang.t("survival"), key: "survival" },
  { label: RollmateLang.t("thievery"), key: "thievery" },
];
const getSaveListPF2 = () => [
  { label: RollmateLang.t("fortitude"), key: "fortitude" },
  { label: RollmateLang.t("reflex"), key: "reflex" },
  { label: RollmateLang.t("will"), key: "will" },
];
const getFlatListPF2 = () => [
  { label: RollmateLang.t("flat_persistent"), key: "flat_persistent" },
  { label: RollmateLang.t("flat_concealed"), key: "flat_concealed" },
  { label: RollmateLang.t("flat_hidden"), key: "flat_hidden" },
  { label: RollmateLang.t("flat_recovery"), key: "flat_recovery" },
];
const getLevelDCPF2 = (level) => {
  const dcs = {
    "-1": 13,
    0: 14,
    1: 15,
    2: 16,
    3: 18,
    4: 19,
    5: 20,
    6: 22,
    7: 23,
    8: 24,
    9: 26,
    10: 27,
    11: 28,
    12: 30,
    13: 31,
    14: 32,
    15: 34,
    16: 35,
    17: 36,
    18: 38,
    19: 39,
    20: 40,
    21: 42,
    22: 44,
    23: 46,
    24: 48,
    25: 50,
  };
  return dcs[level] || 15;
};

const iconMap = {
  acr: "fa-running",
  ani: "fa-paw",
  arc: "fa-magic",
  ath: "fa-dumbbell",
  dec: "fa-mask",
  his: "fa-book-open",
  ins: "fa-eye",
  itm: "fa-skull",
  inv: "fa-search",
  med: "fa-briefcase-medical",
  nat: "fa-leaf",
  prc: "fa-binoculars",
  prf: "fa-music",
  per: "fa-handshake",
  rel: "fa-pray",
  slt: "fa-hand-sparkles",
  ste: "fa-user-secret",
  sur: "fa-campground",
  str: "fa-fist-raised",
  dex: "fa-bolt",
  con: "fa-heart",
  int: "fa-brain",
  wis: "fa-owl",
  cha: "fa-theater-masks",
  flat_straight: "fa-dice-d20",
  flat_death: "fa-skull-crossbones",
  acrobatics: "fa-running",
  arcana: "fa-magic",
  athletics: "fa-dumbbell",
  crafting: "fa-hammer",
  deception: "fa-mask",
  diplomacy: "fa-handshake",
  intimidation: "fa-skull",
  medicine: "fa-briefcase-medical",
  nature: "fa-leaf",
  occultism: "fa-moon",
  perception: "fa-search",
  performance: "fa-music",
  religion: "fa-pray",
  society: "fa-landmark",
  stealth: "fa-user-secret",
  survival: "fa-compass",
  thievery: "fa-key",
  fortitude: "fa-heart",
  reflex: "fa-bolt",
  will: "fa-brain",
  flat_persistent: "fa-fire",
  flat_concealed: "fa-cloud",
  flat_hidden: "fa-eye-slash",
  flat_recovery: "fa-heartbeat",
  initiative: "fa-bolt",
};

// ── Dynamic CSS generator ─────────────────────────────────────────────────
const generateCSS = () => `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Macondo&family=MedievalSharp&family=Uncial+Antiqua&family=Grenze+Gotisch&family=Pirata+One&family=Almendra&display=swap');
            
            :root {
                --rm-theme: ${_rmCtx().sysCfg.themeColor};
                --rm-glow: ${_rmCtx().sysCfg.glowColor};
                --rm-custom-glow: ${_rmCtx().userGlow};
                --rm-border: ${_rmCtx().userBorderTrans};
                --rm-font: ${_rmCtx().userFont};
                --rm-brightness: ${_rmCtx().userBrightness}%;
                --rm-bg-trans: ${_rmCtx().userBgTrans};
                --rm-bg-img: url('${_rmCtx().userBgImg}');
            }

           /* --- UHD SHARPNESS FIXES --- */
            #${"rollmate-universal-overlay"} * { 
                box-sizing: border-box; user-select: none; 
                text-rendering: optimizeLegibility; 
                -webkit-font-smoothing: antialiased; 
                -moz-osx-font-smoothing: grayscale; 
            }
            img { 
                image-rendering: auto;
                image-rendering: high-quality;
            }
            .cc-img-wrap img { 
                image-rendering: auto;
                image-rendering: high-quality;
                -webkit-backface-visibility: hidden; 
                backface-visibility: hidden; 
                transition: filter 0.5s ease; 
            }

            /* --- PERFORMANCE TOGGLE OVERRIDES --- */
            .perf-min .fx-container, 
            .perf-min .dice-particle, 
            .perf-min .glass-shimmer, 
            .perf-min .magic-explosion,
            .perf-min .nova-explosion,
            .perf-min .skull-cloud,
            .perf-min .blood-drop,
            .perf-min .gold-sparkle,
            .perf-min .wind-line {
                display: none !important;
            }

            .cc-overlay-setup, .cc-overlay-final { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; font-family: var(--rm-font); }
            
            /* CLASSIC vs IMMERSIVE Z-INDEX LOGIK */
            .cc-overlay-setup { background: transparent; pointer-events: none; z-index: 800; }
            .board-mode-classic { background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(8px); pointer-events: auto; perspective: 1200px; z-index: 800; }
            
            /* Z-Index Immersive Layering */
            .board-mode-immersive { z-index: 50; background: transparent !important; backdrop-filter: none !important; pointer-events: auto; perspective: 1200px; }
            .immersive-bg { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 1; pointer-events: none; background-size: cover; background-position: center; }
            .immersive-fg { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 900; pointer-events: none; background-size: cover; background-position: center; }
            .immersive-fg2 { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 990; pointer-events: none; background-size: cover; background-position: center; }

            @keyframes foldIn { 0% { opacity: 0; filter: blur(10px); } 100% { opacity: 1; filter: blur(0px); } }
            .cc-overlay-final .cc-window { animation: foldIn 0.5s ease-out forwards; }

            .cc-window { 
                position: absolute; left: 50vw; top: 50vh; --ui-scale: 1 !important; z-index: 10;
                transform: translate(-50%, -50%) scale(1) !important; transform-origin: center center; margin: 0 !important; 
                background: transparent;
                padding: 60px 80px; min-width: 800px;
                border: 2px solid var(--rm-border) !important; border-radius: 15px; box-shadow: 0 10px 40px rgba(0,0,0,0.9); 
                pointer-events: auto; display: flex; flex-direction: column; align-items: center; color: white; width: max-content;
            }
            
            /* --- IMMERSIVE BOARD MODE OVERRIDES --- */
            .board-mode-immersive .cc-window {
                transform-style: preserve-3d;
                transform: translate(-50%, -40%) scale(1) rotateX(15deg) !important;
                margin-top: 0 !important;
                border: none !important; box-shadow: none !important; background: transparent !important;
            }
            .board-mode-immersive.roulette-window {
                z-index: 950 !important;
            }
            .board-mode-immersive .cc-window-bg { display: none !important; }
            .board-mode-immersive .cc-drag-edge { display: none !important; }
            .board-mode-immersive .cc-portrait-card { transform: none !important; box-shadow: none !important; background: transparent !important; }
            .board-mode-immersive .roulette-card { transform: none !important; }
            .board-mode-immersive .cc-img-wrap { border-width: 6px !important; }

            /* FIXIERTES UI IM IMMERSIVE MODE (Final Screen) */
            .board-mode-immersive.cc-overlay-final .immersive-ui-top { display: none !important; } 
            
            .immersive-control-bar {
                position: fixed; top: 20px; left: 20px; bottom: auto; transform: none;
                display: flex; gap: 15px; align-items: center; justify-content: flex-start;
                z-index: 999999; background: transparent; padding: 0;
                border: none; backdrop-filter: none; box-shadow: none;
            }
            
            /* BUTTONS IM IMMERSIVE MODE */
            .board-mode-immersive #end-btn { margin: 0; padding: 10px 20px !important; font-size: 1.1em !important; box-shadow: 0 4px 15px rgba(0,0,0,0.8); }
            
            .immersive-close-icon {
                position: fixed !important; top: 20px !important; right: 25px !important; bottom: auto !important; left: auto !important;
                transform: none !important; z-index: 999999 !important; font-size: 2em; cursor: pointer; color: rgba(255,255,255,0.7);
                text-shadow: 0 2px 5px black; transition: color 0.2s;
            }
            .immersive-close-icon:hover { color: white; text-shadow: 0 0 15px var(--rm-custom-glow); }

            .ctrl-icon {
                font-size: 1.8em; cursor: pointer; color: rgba(255,255,255,0.7); 
                text-shadow: 0 2px 5px black; transition: all 0.2s;
            }
            .ctrl-icon:hover, .ctrl-icon.active-tool { color: white; text-shadow: 0 0 15px var(--rm-custom-glow); transform: scale(1.1); }
            
            /* -- ERGEBNIS-ANZEIGE IM IMMERSIVE MODUS (KLEBEND AUF KARTE) -- */
            .board-mode-immersive .cc-result-area { 
                position: absolute !important;
                bottom: calc(15px * var(--cc-scale)) !important;
                right: calc(8px * var(--cc-scale)) !important;
                transform: translateZ(40px) !important; 
                height: auto !important; 
                width: max-content !important;
                margin: 0 !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: flex-end !important;
                background: transparent !important;
                padding: calc(4px * var(--cc-scale)) calc(8px * var(--cc-scale)) !important;
                border: none !important;
                backdrop-filter: none !important;
                box-shadow: none !important;
                z-index: 60 !important;
            }
            .board-mode-immersive .cc-number-display { font-size: 1.8em !important; margin-bottom: 0 !important; line-height: 1 !important; text-align: right; }
            .board-mode-immersive .cc-degree-text { font-size: 0.6em !important; margin-bottom: 2px !important; text-align: right; }
            .board-mode-immersive .cc-d20-display { font-size: 0.7em !important; margin-top: 0 !important; text-align: right; color: #00ffff !important; text-shadow: 0 1px 3px rgba(0,0,0,0.8); }
            .board-mode-immersive .cc-reroll-btn { position: static !important; font-size: 1.2em !important; margin-top: 5px !important; margin-bottom: 2px !important; }
            .board-mode-immersive .pf-icon { font-size: 2.0em !important; }
            
.immersive-name-tag { display: none; }
            .board-mode-immersive .immersive-name-tag {
                display: block;
                position: absolute; top: calc(8px * var(--cc-scale)); left: 50%; transform: translateX(-50%);
                background: rgba(10, 10, 10, 0.7); padding: calc(4px * var(--cc-scale)) calc(10px * var(--cc-scale));
                border-radius: calc(10px * var(--cc-scale)); border: 1px solid rgba(255,255,255,0.2);
                backdrop-filter: blur(2px); z-index: 100; font-size: clamp(0.75em, 1.1em, 1.1em); color: white;
                font-family: var(--rm-font); text-shadow: 0 2px 5px black;
                width: max-content; max-width: 90%; max-height: 2.8em; pointer-events: none;
                word-wrap: break-word; text-align: center; line-height: 1.1;
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis; /* Fallback for safe rendering */
            }
            .board-mode-immersive .text-info { display: none !important; }

            .board-mode-classic .cc-portrait-card { transform: none !important; box-shadow: none !important; }
            .board-mode-classic .roulette-card { transform: none !important; }

            .cc-window-bg {
                position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                background: var(--rm-bg-img) no-repeat center center;
                background-size: cover; filter: brightness(var(--rm-brightness));
                opacity: var(--rm-bg-trans); z-index: -1; border-radius: inherit; 
                pointer-events: none; transition: filter 0.1s, opacity 0.1s;
            }
            
            /* --- MENU LAYOUT --- */
            @keyframes logoPureShimmer { 0% { filter: brightness(1); } 50% { filter: brightness(1.4) drop-shadow(0 0 10px rgba(255,255,255,0.2)); } 100% { filter: brightness(1); } }
            .start-menu-logo { animation: logoPureShimmer 3s infinite ease-in-out; }

            .start-menu-container { 
                width: 1000px !important; height: 600px !important; 
                display: flex; flex-direction: column; justify-content: center; align-items: flex-start;
                position: fixed !important; top: 50% !important; left: 50% !important; 
                transform: translate(-50%, -50%) scale(1) !important; margin: 0 !important; 
                padding: 40px 60px !important;
            }
            
            .menu-btn, .elegant-btn, .elegant-select, .roll-type-toggle, .vis-toggle, .indiv-skill, .indiv-ability, .indiv-dc { 
                background: rgba(0,0,0,0.8) !important; color: #ccc !important; border: 1px solid transparent !important; box-shadow: none !important; transition: all 0.4s ease !important; font-family: var(--rm-font) !important; cursor: pointer;
            }
            .menu-btn { padding: 12px 40px; font-size: 1.4em; text-transform: uppercase; border-radius: 8px; letter-spacing: 3px; min-width: 300px; font-weight: bold; margin-top: 0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align: left; }
            .elegant-btn { padding: 10px 20px; border-radius: 30px; font-size: 1.1em; text-transform: uppercase; display: flex; align-items: center; justify-content: center; gap: 8px; backdrop-filter: blur(4px); font-weight: bold; text-align: center; }
            .roll-type-toggle { padding: 8px 15px; font-size: 0.9em; text-transform: uppercase; border-radius: 8px; font-weight: bold; white-space: nowrap; }
            .vis-toggle { padding: calc(6px * var(--cc-scale)) calc(2px * var(--cc-scale)); margin-top: calc(5px * var(--cc-scale)); font-size: 0.65em; text-transform: uppercase; border-radius: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.5px; height: 28px; line-height: 1; }
            .indiv-skill, .indiv-ability { padding: calc(5px * var(--cc-scale)); border-radius: 4px; height: auto; min-height: 35px; outline: none; }
            .indiv-dc { padding: calc(5px * var(--cc-scale)); border-radius: 4px; font-size: 1.3em; font-weight: bold; text-align: center; outline: none; }
            .elegant-select { padding: 5px 15px; border-radius: 30px; font-size: 1em; height: 45px; outline: none; backdrop-filter: blur(4px); font-weight: bold; max-width: 250px; overflow: hidden; text-overflow: ellipsis; }
            
            .menu-btn:hover:not(.disabled-menu-btn):not(.disabled-artist-element), .elegant-btn:hover:not(.disabled-control):not(.disabled-artist-element), .elegant-select:hover:not(.disabled-artist-element), .roll-type-toggle:hover:not(.active), .vis-toggle:hover:not(.active), .indiv-skill:hover, .indiv-ability:hover, .indiv-dc:hover { 
                background: rgba(0,0,0,0.9) !important; color: white !important; box-shadow: 0 0 20px var(--rm-custom-glow) !important; transform: translateY(-3px); 
            }
            .roll-type-toggle.active, .vis-toggle.active { color: var(--rm-custom-glow) !important; box-shadow: 0 0 15px var(--rm-custom-glow) !important; background: rgba(0,0,0,0.95) !important; }

            #end-btn { color: #ff6666 !important; }
            #end-btn:hover { box-shadow: 0 0 20px #ff6666 !important; color: white !important; }
            #btn-shuffle { color: var(--rm-theme) !important; }
            #btn-shuffle:hover { box-shadow: 0 0 20px var(--rm-theme) !important; color: white !important; }
            
            .disabled-menu-btn, .disabled-control { opacity: 0.3 !important; pointer-events: none !important; filter: grayscale(100%); }

            /* --- ROULETTE WINDOW ADJUSTMENTS --- */
            .roulette-window { padding: 25px 40px !important; z-index: 950 !important; }
            .roulette-window .cc-content-wrapper { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; margin: auto 0; }
            .roulette-mode { align-items: center !important; align-content: center !important; justify-content: center !important; flex: 1; margin-bottom: 10px; }
            
            .roulette-card { margin: auto 0; padding-bottom: 20px; position: relative; z-index: 10; pointer-events: auto; }
            .roulette-card.clickable-phase { z-index: 100; pointer-events: auto !important; cursor: pointer; }
            .roulette-card.clickable-phase:hover .cc-img-wrap { animation: pulsePortrait 1.2s infinite alternate ease-in-out; border-color: #000 !important; box-shadow: 0 0 30px var(--rm-custom-glow); }
            
            .roulette-card.flipped { pointer-events: none !important; }
            .roulette-float-wrap { position: relative; z-index: 5; display: flex; flex-direction: column; align-items: center; }

            .roulette-card .text-info { 
                position: absolute; bottom: -30px; left: 50%; transform: translateX(-50%); z-index: 50; 
                font-size: 1.2em; font-weight: bold; text-shadow: 0 2px 4px black; 
                white-space: normal !important; overflow: visible !important; word-wrap: break-word; text-align: center; line-height: 1.1; width: max-content; max-width: 150%;
            }

            .roulette-winner .cc-img-wrap { border-color: #000 !important; box-shadow: 0 0 50px #00ffff !important; animation: winnerPulse 1s infinite alternate !important; overflow: hidden; position: relative; }
            @keyframes winnerPulse { 0% { transform: scale(1); box-shadow: 0 0 30px #00ffff; } 100% { transform: scale(1.15); box-shadow: 0 0 70px #00ffff; } }
            
            .roulette-winner .text-info {
                color: #00ffff !important; text-shadow: 0 0 15px #00ffff, 0 0 30px #00ffff, 0 0 45px #00ffff !important;
                font-size: 1.8em !important; transform: translateX(-50%) scale(1.1); transition: all 0.5s ease;
                text-align: center; width: 100%; bottom: -40px;
            }
            .roulette-winner .immersive-name-tag {
                color: #00ffff !important; text-shadow: 0 0 15px #00ffff, 0 0 30px #00ffff, 0 0 45px #00ffff !important;
                border-color: #000 !important;
            }

            .cc-img-wrap { 
                position: relative; overflow: hidden; width: calc(180px * var(--cc-scale)); height: calc(260px * var(--cc-scale)); 
                border: 4px solid #000 !important; border-radius: calc(12px * var(--cc-scale)); background: transparent; 
                z-index: 1; transform-origin: center; transition: all 0.3s ease;
            }
            .cc-img-wrap img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 2; pointer-events: none; }

            /* --- RESULT COLOR HIGHLIGHTING (NEW) --- */
            .cc-portrait-card.show-result-colors .cc-img-wrap {
                border-color: var(--result-color) !important;
                box-shadow: 0 0 20px var(--result-color) !important;
            }
            .cc-portrait-card.show-result-colors > .card-tilt-wrapper > .roulette-float-wrap > .text-info,
            .cc-portrait-card.show-result-colors .immersive-name-tag {
                color: var(--result-color) !important;
                text-shadow: 0 0 15px var(--result-color), 0 2px 4px black !important;
            }

            .glass-shimmer { position: absolute; top: 0; left: -150%; width: 150%; height: 100%; background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(0, 255, 255, 0.1) 40%, rgba(255, 255, 255, 0.5) 50%, rgba(0, 255, 255, 0.1) 60%, rgba(255,255,255,0) 100%); transform: skewX(-25deg); animation: shimmerGlass 3.5s infinite; z-index: 25; pointer-events: none; mix-blend-mode: screen; }
            @keyframes shimmerGlass { 0% { left: -150%; } 35% { left: 150%; } 100% { left: 150%; } }

            .nova-explosion {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0);
                width: 100px; height: 100px; background: radial-gradient(circle, #ffffff 0%, #00ffff 40%, transparent 70%);
                border-radius: 50%; z-index: 100; pointer-events: none; mix-blend-mode: screen;
                animation: novaBlast 1s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
            }
            @keyframes novaBlast { 0% { transform: translate(-50%, -50%) scale(0); opacity: 1; } 50% { opacity: 1; } 100% { transform: translate(-50%, -50%) scale(15); opacity: 0; } }

            .magic-explosion { position: absolute; top: 50%; left: 50%; width: 150%; height: 150%; transform: translate(-50%, -50%) scale(0.2); border-radius: 50%; background: radial-gradient(circle, var(--flash-color) 0%, rgba(255,255,255,0) 60%); animation: popExplosion 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; pointer-events: none; z-index: 25; mix-blend-mode: screen; }
            @keyframes popExplosion { 0% { transform: translate(-50%, -50%) scale(0.2); opacity: 1; filter: brightness(2); } 50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.9; filter: brightness(1.5); } 100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; filter: brightness(1); } }

            .fx-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10; }
            .blood-drop { position: absolute; background: #8a0303; width: calc(6px * var(--cc-scale)); height: calc(12px * var(--cc-scale)); border-radius: 50%; top: -10%; animation: dropBlood 1.2s linear infinite; z-index: 15; box-shadow: 0 0 5px red; }
            @keyframes dropBlood { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(300px); opacity: 0; } }
            .gold-sparkle { position: absolute; background: #fff7cc; width: calc(5px * var(--cc-scale)); height: calc(5px * var(--cc-scale)); border-radius: 50%; bottom: 0; box-shadow: 0 0 8px #FFD700; animation: riseGold 1.5s infinite; z-index: 15; }
            @keyframes riseGold { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-300px) scale(2); opacity: 0; } }
            
            .wind-line { position: absolute; width: calc(3px * var(--cc-scale)); height: 150%; background: linear-gradient(to bottom, transparent, var(--wind-color), transparent); box-shadow: 0 0 10px var(--wind-color); animation: flyWind var(--wind-speed) linear infinite; z-index: 20; }
            @keyframes flyWind { 0% { transform: translateY(100%); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(-100%); opacity: 0; } }

            .cc-drag-edge { position: absolute; z-index: 5; }
            .cc-drag-top { top: 0; left: 0; right: 0; height: 50px; border-radius: 15px 15px 0 0; z-index: 40;} 
            .cc-drag-left { top: 0; left: 0; bottom: 0; width: 40px; }
            .cc-drag-right { top: 60px; right: 0; bottom: 0; width: 40px; } 
            .cc-drag-bottom { bottom: 0; left: 0; right: 0; height: 40px; }
            .cc-content-wrapper { position: relative; z-index: 10; width: max-content; min-width: 600px; display: flex; flex-direction: column; align-items: center; }

            @keyframes dropCard { 
                0% { transform: translateY(-1200px) scale(1.5); opacity: 0; } 
                40% { opacity: 1; }
                100% { transform: translateY(0) scale(1); opacity: 1; } 
            }
            .cc-overlay-final .cc-portrait-card { opacity: 0; animation: dropCard 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; transition: margin-top 0.4s ease; }
            
            .delayed-content { opacity: 0; transition: opacity 0.4s ease; }
            .delayed-content.show-content { opacity: 1 !important; }

            .cc-stage { --cc-scale: 1; display: flex; gap: calc(40px * var(--cc-scale)); justify-content: center; align-items: flex-start; width: max-content; max-width: calc(1320px * var(--cc-scale)); margin: 0 auto; flex-wrap: wrap; padding: 10px 20px; perspective: 1000px; }
            
            .cc-portrait-card { position: relative; display: flex; flex-direction: column; align-items: center; width: calc(180px * var(--cc-scale)); font-size: calc(16px * var(--cc-scale)); transition: all 0.3s ease; }
            
            .cc-portrait-card.can-roll { cursor: pointer; transition: all 0.2s; pointer-events: auto; }
            .cc-portrait-card.can-roll:hover .cc-img-wrap { box-shadow: 0 0 30px var(--rm-custom-glow); border-color: #000 !important; animation: pulsePortrait 1.2s infinite alternate ease-in-out; }
            @keyframes pulsePortrait { 0% { transform: scale(1); filter: brightness(1); } 100% { transform: scale(1.08); filter: brightness(1.2); } }

            .cc-portrait-card > .card-tilt-wrapper > .roulette-float-wrap > div.text-info { position: relative; z-index: 10; font-size: 1.3em; margin-bottom: calc(5px * var(--cc-scale)); font-weight: bold; text-shadow: 0 2px 4px black; white-space: normal !important; overflow: visible !important; word-wrap: break-word; text-align: center; line-height: 1.1; } 
            .cc-portrait-card.locked { opacity: 0.4; filter: grayscale(100%); transition: all 0.5s ease; }
            .cc-portrait-card.rolled { pointer-events: none; cursor: default; opacity: 1; filter: none; }

            .init-placement { position: absolute; top: calc(5px * var(--cc-scale)); right: calc(5px * var(--cc-scale)); color: var(--rm-theme); font-size: calc(3em * var(--cc-scale)); font-weight: 900; font-family: var(--rm-font); text-shadow: 0 0 15px var(--rm-theme), 0 4px 10px black, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000; z-index: 25; pointer-events: none; line-height: 1; }

            .cc-overlay-setup #actor-selection-stage .cc-portrait-card.selectable:hover,
            .cc-overlay-setup #individual-stage .indiv-card:hover { transform: scale(1.05); transition: all 0.2s ease-in-out; }
            .cc-overlay-setup #actor-selection-stage .cc-portrait-card.selectable:hover .cc-img-wrap { border-color: #000 !important; box-shadow: 0 0 20px var(--rm-custom-glow); }

            .dice-particle { position: absolute; width: calc(8px * var(--cc-scale)); height: calc(8px * var(--cc-scale)); border-radius: 50%; box-shadow: 0 0 10px var(--flash-color); animation: explodeOut 0.8s cubic-bezier(0.1, 1, 0.3, 1) forwards; z-index: 50; top: calc(30px * var(--cc-scale)); left: 50%; margin-left: calc(-4px * var(--cc-scale)); }
            @keyframes explodeOut { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(calc(var(--tx) * var(--cc-scale)), calc(var(--ty) * var(--cc-scale))) scale(0.2); opacity: 0; } }

            @keyframes numberIllumination {
                0% { transform: scale(0.8); opacity: 0; filter: blur(10px) brightness(3); color: white; text-shadow: 0 0 100px var(--flash-color), 0 0 150px white; }
                50% { transform: scale(1.05); opacity: 1; filter: blur(2px) brightness(1.5); color: white; text-shadow: 0 0 50px var(--flash-color), 0 0 80px white; }
                100% { transform: scale(1); opacity: 1; filter: blur(0px) brightness(1); color: var(--flash-color); text-shadow: 0 4px 10px black, 0 0 20px var(--flash-color); }
            }
            .number-illuminate { animation: numberIllumination 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; color: var(--flash-color) !important; }

            @keyframes portraitFlash { 0% { box-shadow: 0 0 0px var(--flash-color); } 15% { box-shadow: 0 0 60px var(--flash-color), inset 0 0 40px var(--flash-color); border-color: var(--flash-color); } 100% { box-shadow: 0 calc(10px * var(--cc-scale)) calc(30px * var(--cc-scale)) rgba(0,0,0,0.8); } }
            .flash-effect { animation: portraitFlash 1.5s ease-out forwards !important; }

            .gold-text-glow { color: #FFD700 !important; text-shadow: 0 0 15px #FFD700, 0 0 30px #FFD700, 0 0 45px #FFD700 !important; font-weight: 900 !important; }
            
            /* --- NAT 20 VIBRATION FIX --- */
            @keyframes nat20vibrate { 0%, 100% { transform: scale(1.1) translate(0, 0); } 25% { transform: scale(1.1) translate(-3px, 3px); } 50% { transform: scale(1.1) translate(3px, -3px); } 75% { transform: scale(1.1) translate(-3px, -3px); } }
            .nat-20-effect .card-tilt-wrapper { animation: nat20vibrate 0.15s infinite !important; }
            .nat-20-effect .cc-img-wrap { animation: portraitFlash 1.5s ease-out forwards !important; box-shadow: 0 0 80px #FFD700, inset 0 0 50px #FFD700 !important; }

            .cc-skill-info-wrap { position: absolute; bottom: calc(8px * var(--cc-scale)); left: calc(8px * var(--cc-scale)); background: rgba(10,10,10,0.7); border-radius: calc(10px * var(--cc-scale)); padding: calc(4px * var(--cc-scale)) calc(10px * var(--cc-scale)); display: flex; align-items: center; gap: calc(8px * var(--cc-scale)); z-index: 15; backdrop-filter: blur(2px); border: 1px solid rgba(255,255,255,0.2); transition: all 0.3s ease; width: calc(100% - 16px * var(--cc-scale)); max-width: calc(100% - 16px * var(--cc-scale)); overflow: hidden; }
            .cc-skill-icon { color: #B22222; font-size: 1.1em; transition: all 0.3s ease; text-shadow: 0 0 5px black; }
            .cc-skill-label { color: #B22222; font-size: 0.9em; text-transform: uppercase; font-weight: bold; font-family: var(--rm-font); text-shadow: 0 1px 2px black; white-space: nowrap; overflow: visible; display: inline-block; }

            .cc-select-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 255, 0, 0.2); display: none; z-index: 5; pointer-events: none; }
            .selected .cc-select-overlay { display: block; }
            .selected .cc-img-wrap { border-color: #000 !important; box-shadow: 0 0 20px #0f0; }

            .cc-remove-actor { position: absolute; top: calc(-10px * var(--cc-scale)); right: calc(-10px * var(--cc-scale)); background: #8a0303; color: white; border: calc(2px * var(--cc-scale)) solid white; border-radius: 50%; width: calc(30px * var(--cc-scale)); height: calc(30px * var(--cc-scale)); display: flex; align-items: center; justify-content: center; font-weight: bold; cursor: pointer; z-index: 20; box-shadow: 0 0 10px black; transition: transform 0.2s; }
            .cc-remove-actor:hover { transform: scale(1.2); background: #ff0000; }

            .cc-result-area { margin-top: calc(10px * var(--cc-scale)); height: calc(105px * var(--cc-scale)); display: flex; flex-direction: column; align-items: center; justify-content: flex-start; text-align: center; position: relative; z-index: 10; width: 100%; }
            .cc-number-display { font-size: 3.8em; font-weight: 900; line-height: 1; text-shadow: 0 4px 10px black; margin-bottom: 2px; }
            .cc-degree-text { font-size: 1.1em; font-weight: bold; text-transform: uppercase; text-shadow: 0 2px 5px black; margin-bottom: 2px; }
            .cc-d20-display { font-size: 1.2em; color: #bbb; text-shadow: 0 2px 5px black; margin-top: auto; }
            
            .pf-icon { font-size: 4em; font-weight: 900; line-height: 1; text-shadow: 0 4px 10px black; }
            .hidden-icon { font-size: 4.5em; font-weight: 900; color: var(--rm-theme); text-shadow: 0 0 20px var(--rm-theme); animation: pulse 1.5s infinite; margin-top: -5px; }
            .gm-hidden-result { font-size: 1.1em; color: #bbb; margin-top: calc(5px * var(--cc-scale)); font-weight: bold; text-shadow: 0 2px 5px black; letter-spacing: 1px; }
            .q-mark { position: absolute; color: var(--rm-glow); font-size: 3.5em; font-weight: bold; text-shadow: 0 0 15px var(--rm-theme); animation: floatQ 2s infinite ease-in-out; z-index: 15; pointer-events: none; }
            @keyframes floatQ { 0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; } 50% { transform: translateY(-15px) scale(1.2); opacity: 1; } }

            /* --- GM HIDDEN EYE OVERLAY --- */
            .gm-hidden-card-overlay {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                font-size: 6em; color: rgba(255,255,255,0.7); text-shadow: 0 0 15px black;
                z-index: 100; pointer-events: none;
            }

            @keyframes hangDisappointed { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(40px) rotate(-6deg); opacity: 1; } }
            @keyframes floatJoy { 0% { transform: translateY(0); } 100% { transform: translateY(-25px); } }

            .cc-portrait-card.crit-fail { animation: hangDisappointed 3s infinite alternate ease-in-out; z-index: 1; }
            .cc-portrait-card.crit-fail .cc-img-wrap { transform: none; }
            
            .cc-portrait-card.crit-success { animation: floatJoy 2.5s infinite alternate ease-in-out; z-index: 1; }
            .cc-portrait-card.crit-success .cc-img-wrap { transform: none; }
            
            .init-glow.init-tier-1 .cc-img-wrap { box-shadow: 0 0 20px rgba(255,0,0,0.6); }
            .init-glow.init-tier-2 .cc-img-wrap { box-shadow: 0 0 20px rgba(255,136,0,0.6); }
            .init-glow.init-tier-3 .cc-img-wrap { box-shadow: 0 0 25px rgba(0,255,0,0.6); }
            .init-glow.init-tier-4 .cc-img-wrap { box-shadow: 0 0 30px rgba(0,136,255,0.6); animation: floatJoy 2.5s infinite alternate ease-in-out; }
            .init-glow.init-tier-5 .cc-img-wrap { box-shadow: 0 0 40px var(--rm-glow); }
            
            .pulsing { animation: pulse 1.5s infinite ease-in-out; }
            .hidden { display: none !important; }

            .cc-reroll-btn { position: absolute; right: calc(5px * var(--cc-scale)); top: calc(10px * var(--cc-scale)); font-size: calc(1.5em * var(--cc-scale)); color: #00ffff; text-shadow: 0 0 10px #0088ff; cursor: pointer; animation: pulseBlueRepeat 1.5s infinite alternate ease-in-out; z-index: 30; transition: color 0.2s; pointer-events: auto; }
            .cc-reroll-btn:hover { color: white; text-shadow: 0 0 15px white; }
            @keyframes pulseBlueRepeat { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(1.15); opacity: 1; text-shadow: 0 0 20px #00ffff; } }

            .indiv-card { position: relative; overflow: hidden; border: 1px solid var(--rm-border); border-radius: calc(8px * var(--cc-scale)); padding: calc(15px * var(--cc-scale)); display: flex; flex-direction: column; align-items: center; width: calc(180px * var(--cc-scale)); font-size: calc(16px * var(--cc-scale)); box-shadow: 0 4px 15px rgba(0,0,0,0.5); transition: all 0.2s ease-in-out; }
            
            .indiv-skill option, .indiv-ability option, .elegant-select option { background: #222; color: white; }

            .setup-bottom-bar { display: flex; flex-direction: column; align-items: center; gap: 20px; margin-top: 30px; width: 100%; }
            .setup-bottom-controls { display: flex; justify-content: center; align-items: center; gap: 15px; flex-wrap: wrap; }

            .roll-type-container { display:flex; justify-content:center; gap: 15px; margin-bottom: 20px; margin-top: 20px; flex-wrap: wrap; }

            .cc-portrait-card.nat1-effect .portrait-img { filter: grayscale(100%); }
            .cc-portrait-card.nat1-effect .text-info { color: #b055ff !important; text-shadow: 0 0 10px #7a00cc; }
            
            .skull { position: absolute; color: #111; font-size: calc(2em * var(--cc-scale)); text-shadow: 0 0 8px #9b00ff; animation: floatSkull 3s infinite ease-in-out; opacity: 0.8; z-index: 20;}
            .cc-portrait-card.nat1-effect .cc-skill-label, 
            .cc-portrait-card.nat1-effect .cc-skill-icon { color: #b055ff !important; text-shadow: 0 0 10px #7a00cc; }
            .cc-portrait-card.nat1-effect .nat-1-glow { color: #b055ff !important; text-shadow: 0 0 20px #9b00ff, 0 0 30px #7a00cc, 0 0 40px #9b00ff !important; animation: pulseNat1Glow 1.5s infinite ease-in-out; }

            @keyframes floatSkull { 
                0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 0.6; } 
                25% { transform: translate(calc(15px * var(--cc-scale)), calc(-20px * var(--cc-scale))) rotate(10deg) scale(1.1); opacity: 0.8; } 
                50% { transform: translate(calc(-10px * var(--cc-scale)), calc(15px * var(--cc-scale))) rotate(-5deg) scale(0.9); opacity: 0.6; } 
                75% { transform: translate(calc(20px * var(--cc-scale)), calc(10px * var(--cc-scale))) rotate(15deg) scale(1.05); opacity: 0.8; } 
            }
            @keyframes pulseNat1Glow { 0%, 100% { text-shadow: 0 0 20px #9b00ff, 0 0 30px #7a00cc, 0 0 40px #9b00ff; } 50% { text-shadow: 0 0 30px #9b00ff, 0 0 40px #7a00cc, 0 0 50px #9b00ff; } }

            /* --- MY ARTIST CSS --- */
            .my-artist-btn { cursor: pointer; transition: all 0.3s ease; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.8)); }
            .my-artist-btn:hover { animation: artistHoverPulse 1.5s infinite alternate; }
            @keyframes artistHoverPulse {
                0% { transform: translateY(-50%) scale(1.05); filter: drop-shadow(0 0 10px #FFD700) drop-shadow(0 2px 5px rgba(0,0,0,0.8)); }
                100% { transform: translateY(-50%) scale(1.15); filter: drop-shadow(0 0 25px #FFD700) drop-shadow(0 5px 15px rgba(0,0,0,0.9)); }
            }
            .my-artist-mask {
                position: absolute; top:0; left:0; width:100%; height:100%;
                -webkit-mask-image: url('${RollmateAssets.images.myArtist}');
                -webkit-mask-size: contain; -webkit-mask-repeat: no-repeat; pointer-events: none;
                mask-image: url('${RollmateAssets.images.myArtist}');
                mask-size: contain; mask-repeat: no-repeat;
            }
            .artist-star {
                position: absolute; width: 3px; height: 3px; background: white; border-radius: 50%;
                box-shadow: 0 0 8px #fff, 0 0 15px #fff; animation: twinkleStar var(--dur) infinite alternate; pointer-events:none; z-index: 5;
            }
            @keyframes twinkleStar { 0% { opacity: 0.1; transform: scale(0.5); } 100% { opacity: 1; transform: scale(1.8); } }

            @keyframes pulseBlueText {
                0% { text-shadow: 0 0 10px #0088ff, 0 0 20px #0088ff; transform: scale(1); }
                100% { text-shadow: 0 0 20px #00ffff, 0 0 40px #00ffff; transform: scale(1.05); }
            }
            .blue-pulse-text { color: #00ffff; font-weight: bold; font-style: italic; animation: pulseBlueText 1.5s infinite alternate; display: inline-block; }

            @keyframes goldenPulseTitle {
                0% { text-shadow: 0 0 10px #FFD700, 0 0 20px #FF8C00; transform: translateX(-50%) scale(1); }
                100% { text-shadow: 0 0 25px #FFD700, 0 0 50px #FFA500; transform: translateX(-50%) scale(1.05); }
            }
            .artist-title { position: absolute; top: 15px; left: 50%; transform: translateX(-50%); color: #FFD700; margin: 0; font-size: 2.8em; letter-spacing: 3px; z-index: 10; font-weight: 900; animation: goldenPulseTitle 2s infinite alternate; transform-origin: center center; }

            .artist-window-layout {
                width: 1050px !important; height: 750px !important;
                padding: 70px 30px 30px 30px !important; display: flex !important; flex-direction: column !important; gap: 20px; box-sizing: border-box;
                position: fixed !important; top: 50% !important; left: 50% !important; transform: translate(-50%, -50%) scale(1) !important; margin: 0 !important;
            }
            .artist-mode-toggles { display: flex; justify-content: center; gap: 20px; margin-bottom: 10px; width: 100%; z-index: 15;}
            .artist-cols-wrapper { display: flex; flex-direction: row; gap: 20px; width: 100%; height: 100%; overflow: hidden; z-index: 10;}
            .artist-col { flex: 1; display: flex; flex-direction: column; gap: 15px; height: 100%; overflow-y: auto; padding-right: 5px; }

            .disabled-artist-element { pointer-events: none !important; opacity: 0.3; filter: grayscale(100%); transition: all 0.3s; }

            .art-panel { background: rgba(0,0,0,0.7); border: 1px solid var(--rm-border); border-radius: 12px; padding: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.6); backdrop-filter: blur(4px); transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
            .art-panel h3 { margin: 0 0 15px 0; color: var(--rm-theme); font-size: 1.2em; text-transform: uppercase; text-shadow: 0 2px 4px black; border-bottom: 1px solid var(--rm-border); padding-bottom: 5px; text-align: left; }
            
            .art-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; font-size: 0.9em; }
            .art-color-picker { background: none; border: 1px solid #888; border-radius: 4px; cursor: pointer; height: 25px; padding: 0; transition: border-color 0.2s; width: 90px; }
            .art-color-picker:hover { border-color: white; }
            .art-toggle-btn { cursor: pointer; color: #aaa; transition: 0.2s; font-size: 1.2em; }
            .art-toggle-btn:hover, .art-toggle-btn.active { color: var(--rm-custom-glow); text-shadow: 0 0 10px var(--rm-custom-glow); }
            .art-slider { accent-color: violet; width: 100%; cursor: pointer; }
            
            .art-design-item, .art-board-item { 
                height: 55px; border-radius: 8px; margin-bottom: 10px; background-size: cover; background-position: center; 
                border: 2px solid transparent; cursor: pointer; position: relative; transition: all 0.3s; overflow: hidden; 
                display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.5);
            }
            .art-board-item { height: 180px; margin-top: 10px; border-radius: 12px; }
            
            .art-design-item::before, .art-board-item::before { content: ""; position: absolute; inset:0; background: rgba(0,0,0,0.5); transition: 0.3s; }
            .art-design-item:hover::before, .art-design-item.selected-design::before,
            .art-board-item:hover::before, .art-board-item.selected-board::before { background: rgba(0,0,0,0.1); }
            
            .art-design-item:hover, .art-design-item.selected-design,
            .art-board-item:hover, .art-board-item.selected-board { border-color: var(--rm-custom-glow); box-shadow: 0 0 15px var(--rm-custom-glow); transform: scale(1.02); z-index: 5; }
            
            .design-name { position: relative; z-index: 1; color: white; font-weight: bold; text-shadow: 0 2px 5px black; opacity: 0; transition: 0.3s; pointer-events: none; text-align: center; }
            .art-design-item:hover .design-name, .art-design-item.selected-design .design-name { display: none; }
            
            /* DICE STYLE BUTTONS */
            .dice-style-btn { flex: 1; background: rgba(0,0,0,0.8); border: 1px solid transparent; border-radius: 30px; padding: 8px 5px; text-align: center; cursor: pointer; transition: all 0.3s ease; color: #ccc; font-weight: bold; font-size: 0.8em; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
            .dice-style-btn:hover { background: rgba(0,0,0,0.9); color: white; box-shadow: 0 0 15px var(--rm-custom-glow); transform: translateY(-2px); }
            .dice-style-btn.selected-style { border-color: var(--rm-custom-glow); box-shadow: 0 0 15px var(--rm-custom-glow); color: white; background: rgba(0,0,0,0.95); }

            .art-card-item { cursor: pointer; transition: all 0.3s; }
            .art-card-item:hover .cc-img-wrap { border-color: #000 !important; box-shadow: 0 0 15px var(--rm-custom-glow); }
            .art-card-item.selected-card .cc-img-wrap { border-color: #000 !important; box-shadow: 0 0 15px var(--rm-custom-glow); animation: pulseCard 1.5s infinite alternate; }
            
            .dynamic-drop-shadow { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: transparent; border-radius: inherit; z-index: -1; pointer-events: none; opacity: 0; }
            .waiting-deal { opacity: 0 !important; }
            
            @keyframes pulseBattleStart {
                0% { box-shadow: 0 0 15px #FF0000; transform: scale(1); }
                50% { box-shadow: 0 0 40px #FF0000; transform: scale(1.05); }
                100% { box-shadow: 0 0 15px #FF0000; transform: scale(1); }
            }
            .combat-start-btn { color: white !important; background: rgba(138, 3, 3, 0.9) !important; border-color: #ff3333 !important; text-shadow: 0 0 10px white; animation: pulseBattleStart 2s infinite !important; font-size: 1.5em !important; padding: 15px 40px !important; }
            .combat-start-btn:hover { background: rgba(200, 0, 0, 1) !important; box-shadow: 0 0 50px #ff3333 !important; }
        </style>`;

// ── Participant-cards stage ───────────────────────────────────────────────
function buildStage(data) {
  const isGM = _rmCtx().isGM;
  toggleMacroIcon(false);
  updateSystemState();
  const isInit = data.type === "initiative";
  const isRoulette = data.type === "randomTarget";
  const windowClass = isRoulette ? "cc-window roulette-window" : "cc-window";
  const stageClass = isRoulette ? "cc-stage roulette-mode" : "cc-stage";

  let endBtnText = isRoulette
    ? RollmateLang.t("close")
    : isInit
      ? RollmateLang.t("start_combat")
      : RollmateLang.t("finish");
  let endBtnClass = isInit ? "combat-start-btn" : "elegant-btn";

  const isImmersive =
    _rmCtx().userBoardMode === "immersive" && !window.rmTempClassicMode;
  const wrapperClass = isImmersive
    ? "cc-overlay-final board-mode-immersive"
    : "cc-overlay-final board-mode-classic";
  const perfClass = "perf-" + _rmCtx().userPerf;

  const html = `
            <div id="${"rollmate-universal-overlay"}" class="${wrapperClass} ${perfClass}">
                ${generateCSS()}
                ${
                  isImmersive
                    ? `
                    <div class="immersive-bg" style="background-image: url('${RollmateAssets.images.immersiveBg}');"></div>
                    <div class="immersive-fg" style="background-image: url('${RollmateAssets.images.immersiveOverlay}');"></div>
                    <div class="immersive-fg2" style="background-image: url('${RollmateAssets.images.immersiveOverlay2}'); pointer-events: none; z-index: 990;"></div>
                `
                    : ""
                }
                
                <div class="${windowClass}">
                    <div class="cc-window-bg"></div>
                    ${getSettingsHtml(false)}
                    
                    <div class="cc-drag-edge cc-drag-top"></div><div class="cc-drag-edge cc-drag-left"></div>
                    <div class="cc-drag-edge cc-drag-right"></div><div class="cc-drag-edge cc-drag-bottom"></div>
                    
                    ${!isImmersive && isGM && !isRoulette ? `<div id="cc-back-btn" class="immersive-ui-top" title="Back" style="position:absolute;top:20px;left:70px;font-size:1.5em;cursor:pointer;color:rgba(255,255,255,0.7); text-shadow: 0 2px 5px black; transition: color 0.2s; z-index: 99999;"><i class="fas fa-arrow-left"></i></div>` : ""}
                    
                    ${!isImmersive ? `<div class="cc-close immersive-ui-top" style="position:absolute;top:20px;right:25px;font-size:2em;cursor:pointer;color:rgba(255,255,255,0.7); text-shadow: 0 2px 5px black; transition: color 0.2s; z-index: 99999;">✖</div>` : ""}
                    
                    <div class="cc-content-wrapper">
                        <div id="cinematic-stage" class="${stageClass}"></div>
                        
                        ${!isImmersive && isGM && !isRoulette ? `<button id="end-btn" class="${endBtnClass} immersive-ui-bottom" style="margin-top:40px;">${endBtnText}</button>` : ""}
                        ${!isImmersive && isGM && isRoulette ? `<button id="btn-shuffle" class="elegant-btn immersive-ui-bottom" style="margin-top:20px; font-size: 1.8em; padding: 15px 50px;">${RollmateLang.t("spin")}</button>` : ""}
                        ${!isImmersive && isGM && isRoulette ? `<button id="end-btn" class="elegant-btn hidden immersive-ui-bottom" style="margin-top:20px;">${endBtnText}</button>` : ""}
                    </div>
                </div>
                
                ${
                  isImmersive
                    ? `
                <div class="immersive-control-bar">
                    ${isGM && !isRoulette ? `<i class="fas fa-arrow-left ctrl-icon" id="cc-back-btn-immersive" title="Back"></i>` : ""}
                    ${isGM && !isRoulette ? `<button id="end-btn" class="${endBtnClass}">${endBtnText}</button>` : ""}
                    ${isGM && isRoulette ? `<button id="btn-shuffle" class="elegant-btn" style="font-size: 1.5em; padding: 12px 40px;">${RollmateLang.t("spin")}</button>` : ""}
                    ${isGM && isRoulette ? `<button id="end-btn" class="elegant-btn hidden">${endBtnText}</button>` : ""}
                </div>
                <i class="fas fa-times immersive-close-icon cc-close" title="${RollmateLang.t("close")}"></i>
                `
                    : ""
                }
            </div>`;

  $("body").append(html);
  const view = $("#rollmate-universal-overlay");
  makeDraggable(view.find(".cc-window"), view.find(".cc-drag-edge"));
  attachSettingsListeners(view);

  view
    .find(".cc-close")
    .hover(
      function () {
        $(this).css("color", "white");
      },
      function () {
        $(this).css("color", "rgba(255,255,255,0.7)");
      },
    )
    .click(() => cleanUp());

  if (isImmersive) {
    view.find("#rm-settings-btn-immersive").click((e) => {
      e.stopPropagation();
      let panel = view.find("#rm-settings-panel");
      panel.css({
        position: "fixed",
        top: "60px",
        bottom: "auto",
        left: "20px",
        transform: "none",
        "z-index": "9999999",
      });
      panel.toggleClass("hidden");
    });
  }

  let pIds = Object.keys(data.participants);
  const currentPhase =
    canvas.scene.getFlag(RollmateFlags.scope, "roulettePhase") || 0;
  const currentWinnerId = canvas.scene.getFlag(
    RollmateFlags.scope,
    "rouletteWinner",
  );

  let pIndex = 0;
  let cardsHtml = [];

  pIds.forEach((id) => {
    const pData = data.participants[id];
    if (pData.isHidden && !isGM) return;
    const actor = game.actors.get(id);
    if (!actor) return;
    const res = actor.getFlag(RollmateFlags.scope, RollmateFlags.resultKey);
    const isOwner = actor.isOwner || isGM;

    let isCardFlipped =
      isRoulette && currentPhase === 3 && id === currentWinnerId;

    let stateClass = "";
    if (isRoulette) {
      stateClass = "roulette-card";
      if (isCardFlipped) stateClass += " flipped roulette-winner";
      else if (currentPhase >= 2) stateClass += " landed clickable-phase";
      else if (currentPhase === 0) stateClass += " landed";
    } else {
      if (res) {
        if (res.status === "rolling") {
          stateClass = "is-rolling";
        } else {
          stateClass =
            pData.visibility === "hidden" && res.degree !== -1
              ? "rolled"
              : `rolled show-result-colors ${res.cssClass}`;
        }
      } else {
        stateClass = isOwner ? "can-roll selectable" : "locked";
      }
    }

    const faIcon = iconMap[pData.skillKey] || "fa-dice-d20";
    let contentHtml = "";
    let fxHtml = "";
    let skillColor =
      _rmCtx().sysCfg.id === "dnd5e" ? "#B22222" : _rmCtx().sysCfg.themeColor;

    let initialImage =
      (isRoulette && !isCardFlipped) ||
      (!isRoulette && (!res || res.status === "rolling"))
        ? _rmCtx().userCardImg
        : actor.img;
    let innerEffects = "";

    if (!isRoulette && res && res.status !== "rolling") {
      const rerollBtn = isOwner
        ? `<i class="fas fa-redo-alt cc-reroll-btn" title="Repeat" data-id="${id}"></i>`
        : ``;
      if (pData.visibility === "hidden" && res.degree !== -1) {
        let gmText = isGM
          ? `<div class="gm-hidden-result">(${res.text}: ${res.total})</div>`
          : ``;
        contentHtml = `<div class="hidden-icon number-illuminate" style="margin-top:20px;">?</div>${gmText}${rerollBtn}`;
        if (_rmCtx().userPerf !== "min")
          fxHtml = `<div class="q-mark" style="top:20%; left:30%; animation-delay:0s;">?</div><div class="q-mark" style="top:50%; left:70%; animation-delay:0.5s;">?</div><div class="q-mark" style="top:35%; left:45%; animation-delay:1s;">?</div>`;
      } else if (
        pData.visibility === "passfail" &&
        !isGM &&
        res.degree !== -1
      ) {
        let icon = res.degree >= 2 ? "✔" : "✖";
        contentHtml = `<div class="pf-icon number-illuminate pulsing ${res.isNat20 ? "gold-text-glow" : ""} ${res.isNat1 ? "nat-1-glow" : ""}" style="color: ${res.color}; margin-top:15px;">${icon}</div><div class="cc-degree-text pulsing ${res.isNat20 ? "gold-text-glow" : ""} ${res.isNat1 ? "nat-1-glow" : ""}" style="color: ${res.color};">${res.text}</div>${rerollBtn}`;
        skillColor = res.color;
        if (_rmCtx().userPerf !== "min") {
          if (res.isNat1) {
            let skulls = "";
            let skullCount = _rmCtx().userPerf === "mid" ? 5 : 10;
            for (let i = 0; i < skullCount; i++)
              skulls += `<i class="fas fa-skull skull" style="top:${Math.random() * 80 + 10}%; left:${Math.random() * 80 + 10}%; animation-delay:${Math.random() * 2}s"></i>`;
            innerEffects += `<div class="skull-cloud">${skulls}</div>`;
          } else {
            let goldCount = _rmCtx().userPerf === "mid" ? 20 : 40;
            let bloodCount = _rmCtx().userPerf === "mid" ? 15 : 30;
            if (res.degree === 3 && !res.isNat20)
              for (let i = 0; i < goldCount; i++)
                fxHtml += `<div class="gold-sparkle" style="left:${Math.random() * 100}%; animation-delay:${Math.random()}s; box-shadow: 0 0 8px #FFD700; background: #fff7cc;"></div>`;
            if (res.degree === 0 && !res.isNat1)
              for (let i = 0; i < bloodCount; i++)
                fxHtml += `<div class="blood-drop" style="left:${Math.random() * 100}%; animation-delay:${Math.random()}s"></div>`;
          }
        }
      } else {
        contentHtml = `<div class="cc-number-display number-illuminate pulsing ${res.isNat20 ? "gold-text-glow" : ""} ${res.isNat1 ? "nat-1-glow" : ""}" style="color: ${res.color};">${res.total}</div><div class="cc-degree-text pulsing ${res.isNat20 ? "gold-text-glow" : ""} ${res.isNat1 ? "nat-1-glow" : ""}" style="color: ${res.color};">${res.text}</div><div class="cc-d20-display ${res.isNat20 ? "gold-text-glow" : ""} ${res.isNat1 ? "nat-1-glow" : ""}">🎲 ${res.d20}</div>${rerollBtn}`;
        skillColor = res.color;
        if (_rmCtx().userPerf !== "min") {
          if (res.isNat1) {
            let skulls = "";
            let skullCount = _rmCtx().userPerf === "mid" ? 5 : 10;
            for (let i = 0; i < skullCount; i++)
              skulls += `<i class="fas fa-skull skull" style="top:${Math.random() * 80 + 10}%; left:${Math.random() * 80 + 10}%; animation-delay:${Math.random() * 2}s"></i>`;
            innerEffects += `<div class="skull-cloud">${skulls}</div>`;
          } else {
            let goldCount = _rmCtx().userPerf === "mid" ? 20 : 40;
            let bloodCount = _rmCtx().userPerf === "mid" ? 15 : 30;
            let superGoldCount = _rmCtx().userPerf === "mid" ? 40 : 80;
            let windCount = _rmCtx().userPerf === "mid" ? 10 : 20;

            if (res.degree === 3 && !res.isNat20)
              for (let i = 0; i < goldCount; i++)
                fxHtml += `<div class="gold-sparkle" style="left:${Math.random() * 100}%; animation-delay:${Math.random()}s; box-shadow: 0 0 8px #FFD700; background: #fff7cc;"></div>`;
            if (res.degree === 0 && !res.isNat1)
              for (let i = 0; i < bloodCount; i++)
                fxHtml += `<div class="blood-drop" style="left:${Math.random() * 100}%; animation-delay:${Math.random()}s"></div>`;
            if (res.isNat20)
              for (let i = 0; i < superGoldCount; i++)
                fxHtml += `<div class="gold-sparkle" style="left:${Math.random() * 100}%; top:${Math.random() * 100}%; width: ${Math.random() * 8 + 4}px; height: ${Math.random() * 8 + 4}px; animation-delay:${Math.random()}s; animation-duration: ${Math.random() * 1 + 0.5}s; box-shadow: 0 0 20px #FFD700; background: #FFF; position: absolute;"></div>`;
            if (res.cssClass && res.cssClass.includes("init-glow"))
              for (let i = 0; i < windCount; i++) {
                let left = Math.random() * 100;
                let delay = Math.random() * 0.4;
                fxHtml += `<div class="wind-line" style="left:${left}%; animation-delay:${delay}s; --wind-color: ${res.windColor}; --wind-speed: ${res.windSpeed};"></div>`;
              }
          }
        }
      }
    }

    let isFaceDown = isRoulette && currentPhase > 0 && !isCardFlipped;

    // NAMENSKÜRZUNG anwenden
    let finalActorName = window.formatActorName(actor.name);

    let displayName =
      isFaceDown || (isRoulette && !isCardFlipped) ? "" : finalActorName;
    let textOpacity =
      isFaceDown || (isRoulette && !isCardFlipped) ? "display:none;" : "";

    let gmIndicator = "";
    let hiddenOverlay = "";
    if (isGM) {
      if (!isRoulette) {
        if (pData.visibility === "hidden")
          gmIndicator = ` <i class="fas fa-eye-slash" style="color:#aaa; font-size:0.8em;" title="Hidden from players"></i>`;
        if (pData.visibility === "passfail")
          gmIndicator = ` <i class="fas fa-balance-scale" style="color:#aaa; font-size:0.8em;" title="Pass/Fail for players"></i>`;
      }
      if (pData.isHidden)
        hiddenOverlay = `<i class="fas fa-eye-slash gm-hidden-card-overlay delayed-content" style="${textOpacity}"></i>`;
    }

    if (!isRoulette && res && res.status !== "rolling") {
      innerEffects += `<div class="glass-shimmer"></div>`;
    } else if (isRoulette && isCardFlipped) {
      innerEffects += `<div class="glass-shimmer"></div>`;
    }

    cardsHtml.push(`
                    <div class="cc-portrait-card waiting-deal ${stateClass}" data-id="${id}" data-orig-img="${actor.img}" data-orig-name="${actor.name}" ${res ? `data-total="${res.total}" data-d20="${res.d20}"` : ""} ${res ? `style="--result-color: ${res.color};"` : ""}>
                        <div class="card-tilt-wrapper" style="width:100%; display:flex; flex-direction:column; align-items:center;">
                            <div class="roulette-float-wrap">
                                <div class="cc-img-wrap">
                                    ${isInit ? '<div class="init-placement delayed-content"></div>' : ""}
                                    ${hiddenOverlay}<div class="fx-container">${fxHtml}</div>
                                    
                                    <img src="${initialImage}" class="portrait-img" data-real-src="${actor.img}">
                                    
                                    <div class="immersive-name-tag delayed-content" style="${textOpacity}">${displayName}${gmIndicator}</div>
                                    
                                    ${innerEffects}
                                    
                                    ${!isRoulette ? `<div class="cc-skill-info-wrap delayed-content" title="${pData.skillLabel}"><i class="fas ${faIcon} cc-skill-icon" style="color: ${skillColor};"></i><span class="cc-skill-label" style="color: ${skillColor};">${pData.skillLabel}</span></div>` : ""}
                                </div>
                                ${isRoulette ? `<div class="text-info delayed-content" style="${textOpacity}">${displayName}${gmIndicator}</div>` : `<div class="text-info delayed-content" style="${isImmersive ? "" : "margin-top:-285px; margin-bottom:265px;"}">${displayName}${gmIndicator}</div>`}
                                ${isRoulette ? "" : `<div class="cc-result-area delayed-content">${contentHtml}</div>`}
                                ${isRoulette ? '<div class="card-shadow"></div>' : ""}
                            </div>
                        </div>
                    </div>
                `);
    pIndex++;
  });

  view.find("#cinematic-stage").html(cardsHtml.join(""));
  window.fitTextToContainer(".cc-skill-info-wrap", ".cc-skill-label", 0.4);
  window.updateStageScale();
  if (isInit) setTimeout(updateInitOrder, 500);

  let totalDealTime = pIds.length * 400;
  let cardsQuery = view.find(".cc-portrait-card");

  let baseDelay = 100;
  cardsQuery.each(function (index) {
    let card = $(this);
    let tiltWrap = card.find(".card-tilt-wrapper")[0];

    let rot = Math.random() * 6 - 3;
    let slideX = Math.random() * 40 - 20;
    let slideY = Math.random() * 40 - 20;
    let finalRot = rot + (Math.random() * 10 - 5);

    let fallAnimDelay = index * 400;

    setTimeout(() => {
      card.removeClass("waiting-deal");

      tiltWrap.animate(
        [
          { transform: `translateY(-1000px) scale(1.3) rotate(${rot}deg)` },
          { transform: `translateY(0px) scale(1) rotate(${rot}deg)` },
        ],
        {
          duration: 350,
          easing: "cubic-bezier(0.4, 0.0, 0.2, 1)",
          fill: "forwards",
        },
      ).onfinish = () => {
        playRMSnd(`${RollmateAssets.sounds.cardLand}`);
        tiltWrap.animate(
          [
            { transform: `translate(0px, 0px) scale(1) rotate(${rot}deg)` },
            {
              transform: `translate(${slideX}px, ${slideY}px) scale(1) rotate(${finalRot}deg)`,
            },
          ],
          {
            duration: 400,
            easing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
            fill: "forwards",
          },
        );
        tiltWrap.style.transform = `translate(${slideX}px, ${slideY}px) scale(1) rotate(${finalRot}deg)`;
      };
    }, fallAnimDelay + baseDelay);
  });

  if (!isRoulette) {
    setTimeout(
      () => {
        cardsQuery.each(function (index) {
          let card = $(this);
          if (!card.attr("data-total") || card.attr("data-total") == -999) {
            setTimeout(() => {
              playRMSnd(`${RollmateAssets.sounds.flip}`);
              let imgWrap = card.find(".cc-img-wrap");
              imgWrap.css({
                transition: "transform 0.15s ease-in",
                transform: "rotateY(90deg)",
              });
              setTimeout(() => {
                let realSrc = card.find(".portrait-img").data("real-src");
                card.find(".portrait-img").attr("src", realSrc);
                imgWrap.css({
                  transition: "transform 0.15s ease-out",
                  transform: "rotateY(0deg)",
                });
              }, 150);
            }, index * 250);
          }
        });

        let totalFlipTime = pIds.length * 250;
        setTimeout(() => {
          view.find(".delayed-content").addClass("show-content");
        }, totalFlipTime + 200);
      },
      totalDealTime + baseDelay + 400,
    );
  } else {
    if (currentPhase === 0) {
      setTimeout(
        () => {
          view.find(".delayed-content").addClass("show-content");
          window.startRouletteFloatAndMix();
        },
        totalDealTime + baseDelay + 200,
      );
    } else {
      view.find(".delayed-content").addClass("show-content");
      if (currentPhase > 0) view.find("#btn-shuffle").hide();

      if (currentPhase === 1) {
        setTimeout(() => {
          window.startRouletteFloatAndMix();
          window.rmRouletteCards.forEach((c) => (c.landed = false));
          window.playLevitate();
          window.rmShuffleInterval = setInterval(window.doShuffleCards, 200);
        }, 150);
      } else if (currentPhase === 2) {
        window.playHeartbeat();
      }
    }
  }

  if (isGM && isRoulette) {
    view.find("#btn-shuffle").click(async function () {
      const phase =
        canvas.scene.getFlag(RollmateFlags.scope, "roulettePhase") || 0;
      if (phase === 0) {
        await canvas.scene.setFlag(RollmateFlags.scope, "roulettePhase", 1);
      }
    });

    view
      .off("click", ".roulette-card.clickable-phase")
      .on("click", ".roulette-card.clickable-phase", async function () {
        const phase =
          canvas.scene.getFlag(RollmateFlags.scope, "roulettePhase") || 0;
        if (phase === 2) {
          view.find(".roulette-card").removeClass("clickable-phase");
          const clickedId = $(this).data("id");
          await canvas.scene.setFlag(
            RollmateFlags.scope,
            "rouletteWinner",
            clickedId,
          );
          await canvas.scene.setFlag(RollmateFlags.scope, "roulettePhase", 3);
        }
      });
  }

  if (!isRoulette) {
    view.on("click", ".cc-portrait-card.can-roll", function (e) {
      e.stopPropagation();
      const card = $(this);
      card.removeClass("can-roll selectable");

      const id = card.data("id");
      const activeCheck = canvas.scene.getFlag(
        RollmateFlags.scope,
        RollmateFlags.checkKey,
      );

      initWebGLDice(id);
      setTimeout(() => {
        performRoll(
          id,
          activeCheck.participants[id].skillKey,
          activeCheck.participants[id].dc,
        );
      }, 50);
    });

    view.on("click", ".cc-reroll-btn", function (e) {
      e.stopPropagation();
      const id = $(this).data("id");

      if (window.rmActive3DDice && window.rmActive3DDice[id]) {
        window.rmActive3DDice[id].stop();
      }
      window.resetCardForReroll(id);

      const activeCheck = canvas.scene.getFlag(
        RollmateFlags.scope,
        RollmateFlags.checkKey,
      );
      initWebGLDice(id);
      setTimeout(() => {
        performRoll(
          id,
          activeCheck.participants[id].skillKey,
          activeCheck.participants[id].dc,
        );
      }, 50);
    });
  }

  if (isGM) {
    const backHandler = async () => {
      let hasRolled = false;
      if (
        data.type === "randomTarget" &&
        canvas.scene.getFlag(RollmateFlags.scope, "roulettePhase") > 0
      )
        hasRolled = true;
      else {
        for (let id of Object.keys(data.participants)) {
          const actor = game.actors.get(id);
          if (
            actor &&
            actor.getFlag(RollmateFlags.scope, RollmateFlags.resultKey)
          ) {
            hasRolled = true;
            break;
          }
        }
      }
      if (hasRolled) {
        console.log(
          "Rollmate: Zurückgehen gesperrt, es wurde bereits gewürfelt!",
        );
        return;
      }
      await canvas.scene.unsetFlag(RollmateFlags.scope, RollmateFlags.checkKey);
      cleanUp();
      startSetup(
        data.type,
        data.type === "skills" ? 4 : 3,
        Object.keys(data.participants),
      );
    };

    view
      .find("#cc-back-btn")
      .hover(
        function () {
          $(this).css("color", "white");
        },
        function () {
          $(this).css("color", "rgba(255,255,255,0.7)");
        },
      )
      .click(backHandler);
    view.find("#cc-back-btn-immersive").click(backHandler);

    view.find("#end-btn").click(async () => {
      let chatMsgId = canvas.scene.getFlag(
        RollmateFlags.scope,
        RollmateFlags.checkKey,
      )?.chatMsgId;

      if (isInit) {
        if (game.combat) {
          await game.combat.startCombat();
          ui.sidebar.activateTab("combat");
        }
        playRMSnd(`${RollmateAssets.sounds.battleStart}`);
      }

      if (data.type === "randomTarget") {
        await canvas.scene.unsetFlag(RollmateFlags.scope, "rouletteWinner");
        await canvas.scene.unsetFlag(RollmateFlags.scope, "roulettePhase");
        await canvas.scene.unsetFlag(
          RollmateFlags.scope,
          RollmateFlags.checkKey,
        );
        cleanUp();

        if (chatMsgId) {
          setTimeout(() => {
            let m = game.messages.get(chatMsgId);
            if (m) m.delete();
          }, 2000);
        }
        return;
      }

      let publicSummary = "";
      let hiddenSummary = "";
      let rolledCount = 0;
      let hiddenCount = 0;
      for (let id of Object.keys(data.participants)) {
        const pData = data.participants[id];
        const actor = game.actors.get(id);
        const res = actor?.getFlag(
          RollmateFlags.scope,
          RollmateFlags.resultKey,
        );
        if (res) {
          let resultDisplay = "";
          if (pData.visibility === "hidden" && res.degree !== -1) {
            resultDisplay = `<span style="color:#aaa; font-weight: bold; font-style: italic;">??? (Hidden)</span>`;
            hiddenSummary += `<div style="display:flex; justify-content:space-between; font-size:0.95em; padding: 4px 0; border-bottom: 1px solid #444;"><span><b>${actor.name}</b> <span style="color:#aaa; font-size:0.85em;">(${pData.skillLabel})</span></span><span style="color:${res.color}; font-weight: bold;">${res.text} (${res.total})</span></div>`;
            hiddenCount++;
          } else if (pData.visibility === "passfail" && res.degree !== -1) {
            resultDisplay = `<span style="color:${res.color}; font-weight: bold;">${res.degree >= 2 ? "✔ " + RollmateLang.t("result_succ") : "✖ " + RollmateLang.t("result_fail")}</span>`;
          } else {
            resultDisplay = `<span style="color:${res.color}; font-weight: bold;">${res.text} (${res.total})</span>`;
          }
          publicSummary += `<div style="display:flex; justify-content:space-between; font-size:0.95em; padding: 4px 0; border-bottom: 1px solid #444;"><span><b>${actor.name}</b> <span style="color:#aaa; font-size:0.85em;">(${pData.skillLabel})</span></span>${resultDisplay}</div>`;
          rolledCount++;
        }
        await actor?.unsetFlag(RollmateFlags.scope, RollmateFlags.resultKey);
      }
      if (rolledCount > 0)
        ChatMessage.create({
          content: `<div style="padding:15px; background:rgba(0,0,0,0.85); border:2px solid #40E0D0; border-radius:8px; color:white; font-family:var(--rm-font);"><h4 style="color:#40E0D0; font-size:1.2em; margin-top:0; border-bottom:1px solid #40E0D0; padding-bottom:5px;">${RollmateLang.t("resol_title")}</h4>${publicSummary}</div>`,
        });
      if (hiddenCount > 0)
        ChatMessage.create({
          whisper: game.users.filter((u) => u.isGM).map((u) => u.id),
          content: `<div style="padding:15px; background:rgba(0,0,0,0.85); border:2px solid #8a0303; border-radius:8px; color:white; font-family:var(--rm-font);"><h4 style="color:#ff6666; font-size:1.2em; margin-top:0; border-bottom:1px solid #ff6666; padding-bottom:5px;">${RollmateLang.t("secret_title")}</h4>${hiddenSummary}</div>`,
        });
      await canvas.scene.unsetFlag(RollmateFlags.scope, RollmateFlags.checkKey);
      cleanUp();

      if (chatMsgId) {
        setTimeout(() => {
          let m = game.messages.get(chatMsgId);
          if (m) m.delete();
        }, 2000);
      }
    });
  }
}

// ==========================================
// --- START MENU (Universal) ---
// ==========================================

// ── Start menu ────────────────────────────────────────────────────────────
function showStartMenu() {
  const isGM = _rmCtx().isGM;
  cleanUp();
  toggleMacroIcon(false);
  updateSystemState();

  const perfClass = "perf-" + _rmCtx().userPerf;
  const menuHtml = `
            <div id="${"rollmate-universal-overlay"}" class="cc-overlay-setup ${perfClass}">
                ${generateCSS()}
                <div class="cc-window start-menu-container">
                    <div class="cc-window-bg"></div>
                    ${getSettingsHtml(true)}
                    
                    <div class="cc-close immersive-ui-top" style="position:absolute;top:20px;right:25px;font-size:2em;cursor:pointer;color:rgba(255,255,255,0.7); z-index: 99999;">✖</div>
                    
                    <div style="border-radius: 15px; margin-top: 10px; margin-bottom: 25px; text-align: left; width: 100%; padding-left: 20px;">
                        <img src="${_rmCtx().sysCfg.logoImg}" class="start-menu-logo" style="height: 250px; object-fit: contain; transform-origin: left center;">
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 5px; width: 100%; padding-left: 20px;">
                        <div style="display: flex; align-items: center;">
                            <button class="menu-btn" data-mode="skills">${RollmateLang.t("btn_skills")}</button>
                        </div>
                        <div style="display: flex; align-items: center; position: relative;">
                            <button class="menu-btn init-start-btn" data-mode="initiative">${RollmateLang.t("btn_init")}</button>
                            <div id="btn-my-artist" class="my-artist-btn immersive-ui-bottom" title="${RollmateLang.t("art_design")}" style="position: absolute; right: 280px; top: 50%; transform: translateY(-50%); margin: 0; width: 156px; z-index: 100;">
                                <div class="my-artist-mask"></div>
                                <img src="${RollmateAssets.images.myArtist}" style="width:100%; height:auto;">
                                <div id="artist-stars-container"></div>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center;">
                            <button class="menu-btn" data-mode="randomTarget">${RollmateLang.t("btn_random")}</button>
                        </div>
                    </div>

                    <div style="position:absolute; bottom: 20px; left: 50%; transform: translateX(-50%); font-family: var(--rm-font); font-size: 1.1em; color: rgba(255,255,255,0.7); font-weight: bold; text-shadow: 0 2px 4px black; pointer-events:none;">Version 1.0.2 - First Day Edition</div>

                    <div id="btn-fdh-logo" style="position: absolute; bottom: 10px; right: 20px; width: 250px; z-index: 20; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.8)); pointer-events: none; border-radius: 8px;">
                        <img src="${RollmateAssets.images.fdhLogo}" style="width:100%; height:auto; filter: drop-shadow(0 0 10px rgba(255,255,255,0.2));">
                    </div>
                </div>
            </div>`;

  $("body").append(menuHtml);
  const v = $("#rollmate-universal-overlay");
  attachSettingsListeners(v);

  setTimeout(() => {
    const starCont = $("#artist-stars-container");
    if (starCont.length) {
      for (let i = 0; i < 15; i++) {
        let top = Math.random() * 80 + 10;
        let left = Math.random() * 80 + 10;
        let dur = Math.random() * 1.5 + 0.5;
        starCont.append(
          `<div class="artist-star" style="top:${top}%; left:${left}%; --dur:${dur}s;"></div>`,
        );
      }
    }
  }, 100);

  v.find(".cc-close")
    .hover(
      function () {
        $(this).css("color", "white");
      },
      function () {
        $(this).css("color", "rgba(255,255,255,0.7)");
      },
    )
    .click(() => cleanUp());

  v.on("click", ".menu-btn:not(.init-start-btn)", function () {
    startSetup($(this).data("mode"));
  });

  v.on("click", ".init-start-btn", async function () {
    if (isGM && !game.combat) {
      await Combat.create({ scene: canvas.scene.id });
      console.log("Rollmate: Kampfbegegnung gestartet.");
    }
    startSetup($(this).data("mode"));
  });

  v.on("click", "#btn-my-artist", function () {
    showArtistMenu();
  });

  setTimeout(() => window.applyWindowScaling(), 50);
}
// ==========================================
// --- MY ARTIST MENU ---
// ==========================================

// ── MyArtist customisation panel ─────────────────────────────────────────
function showArtistMenu() {
  cleanUp();
  toggleMacroIcon(false);

  const designImgs = [
    RollmateAssets.images.designStallion,
    RollmateAssets.images.designStars,
    RollmateAssets.images.designOculus,
    RollmateAssets.images.designWilderness,
    RollmateAssets.images.designPurple,
    RollmateAssets.images.designSerpent,
    RollmateAssets.images.designStone,
    RollmateAssets.images.designUndead,
    RollmateAssets.images.designWarriors,
    RollmateAssets.images.designWood,
  ];

  const designItemsHtml = designImgs
    .map((url) => {
      let name = decodeURIComponent(url.split("/").pop().replace(".webp", ""));
      let isSelected = _rmCtx().userBgImg === url ? "selected-design" : "";
      return `<div class="art-design-item ${isSelected}" data-bg="${url}" style="background-image: url('${url}');"><span class="design-name">${name}</span></div>`;
    })
    .join("");

  const fontOptions = [
    { val: "'Cinzel', serif", label: "Cinzel" },
    { val: "'Macondo', cursive", label: "Macondo" },
    { val: "'MedievalSharp', cursive", label: "MedievalSharp" },
    { val: "'Uncial Antiqua', cursive", label: "Uncial Antiqua" },
    { val: "'Grenze Gotisch', cursive", label: "Grenze Gotisch" },
    { val: "'Pirata One', system-ui", label: "Pirata One" },
    { val: "'Almendra', serif", label: "Almendra" },
  ]
    .map(
      (f) =>
        `<option value="${f.val}" style="font-family: ${f.val};">${f.label}</option>`,
    )
    .join("");

  const artistHtml = `
            <div id="${"rollmate-universal-overlay"}" class="cc-overlay-setup perf-${_rmCtx().userPerf}">
                ${generateCSS()}
                <div class="cc-window artist-window-layout">
                    <div class="cc-window-bg"></div>
                    <div id="setup-back-btn" class="immersive-ui-top" title="Back to Main Menu" style="position:absolute;top:20px;left:25px;font-size:1.5em;cursor:pointer;color:rgba(255,255,255,0.7); text-shadow: 0 2px 5px black; transition: color 0.2s; z-index: 99999;"><i class="fas fa-arrow-left"></i></div>
                    <div class="cc-close immersive-ui-top" style="position:absolute;top:20px;right:25px;font-size:2em;cursor:pointer;color:rgba(255,255,255,0.7); text-shadow: 0 2px 5px black; transition: color 0.2s; z-index: 99999;">✖</div>
                    
                    <h2 class="artist-title">My Artist</h2>
                    
                    <div class="artist-mode-toggles">
                        <button class="menu-btn" id="mode-immersive" style="width: auto; min-width: 250px; font-size: 1.1em; padding: 10px 20px;">${RollmateLang.t("mode_immersive")}</button>
                        <button class="menu-btn" id="mode-classic" style="width: auto; min-width: 250px; font-size: 1.1em; padding: 10px 20px;">${RollmateLang.t("mode_classic")}</button>
                    </div>

                    <div class="artist-cols-wrapper">
                        <div class="artist-col">
                            <div class="art-panel" id="panel-colours">
                                <h3>${RollmateLang.t("art_colors")}</h3>
                                <div class="art-row">
                                    <span>${RollmateLang.t("art_hover")}</span>
                                    <input type="color" id="art-hover-picker" class="art-color-picker" style="width: 90px;" value="${_rmCtx().userGlow}">
                                </div>
                                <div class="art-row">
                                    <span>${RollmateLang.t("art_particle_color")}</span>
                                    <input type="color" id="art-particle-picker" class="art-color-picker" style="width: 90px;" value="${_rmCtx().userParticleColor}">
                                </div>
                                
                                <h3 style="margin-top:15px; border-top: 1px solid #444; padding-top: 15px;">${RollmateLang.t("art_dice_head")}</h3>
                                <div style="display:flex; gap: 5px; margin-bottom: 15px;">
                                    <div class="dice-style-btn ${_rmCtx().userDiceStyle === "stone" ? "selected-style" : ""}" data-style="stone">${RollmateLang.t("art_dice_style_stone")}</div>
                                    <div class="dice-style-btn ${_rmCtx().userDiceStyle === "coal" || !_rmCtx().userDiceStyle ? "selected-style" : ""}" data-style="coal">${RollmateLang.t("art_dice_style_coal")}</div>
                                    <div class="dice-style-btn ${_rmCtx().userDiceStyle === "wood" ? "selected-style" : ""}" data-style="wood">${RollmateLang.t("art_dice_style_wood")}</div>
                                </div>
                                <div style="text-align: center;">
                                    <button id="btn-test-roll" class="elegant-btn" style="margin: 0 auto; padding: 8px 20px; font-size: 0.9em;">${RollmateLang.t("art_test_roll")}</button>
                                    <div style="margin-top: 10px;"><div class="blue-pulse-text">+2 Dices every month</div></div>
                                </div>
                                
                                <h3 style="margin-top:15px; border-top: 1px solid #444; padding-top: 15px;">${RollmateLang.t("art_card_design")}</h3>
                                <div style="text-align: center;">
                                    <div style="margin-bottom: 10px;"><div class="blue-pulse-text">+3 Cards every month</div></div>
                                    <button id="btn-choose-card" class="elegant-btn" style="margin: 0 auto;">${RollmateLang.t("art_choose_card")}</button>
                                </div>
                            </div>
                            
                            <div class="art-panel" id="panel-fonts">
                                <h3>${RollmateLang.t("art_fonts")}</h3>
                                <select id="art-font-select" class="elegant-select" style="width:100%;">
                                    ${fontOptions}
                                </select>
                            </div>
                            
                            <div class="art-panel" id="panel-sounds" style="display:flex; flex-direction:column;">
                                <h3>${RollmateLang.t("art_sounds")}</h3>
                                <div style="margin:auto; font-size:1.1em; color:#888; font-style:italic;">${RollmateLang.t("art_dev")}</div>
                            </div>

                            <div class="art-panel" id="panel-anim" style="display:flex; flex-direction:column;">
                                <h3>${RollmateLang.t("art_anim")}</h3>
                                <div style="margin:auto; font-size:1.1em; color:#888; font-style:italic;">${RollmateLang.t("art_dev")}</div>
                            </div>
                        </div>
                        
                        <div class="artist-col">
                            <div class="art-panel" style="height: 100%; display: flex; flex-direction: column;">
                                <h3>${RollmateLang.t("mode_immersive")}</h3>
                                <div style="text-align: center; margin-bottom: 15px;">
                                    <div style="color: white; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px; font-size: 1.1em; text-shadow: 0 2px 4px black;">Board Design</div>
                                    <div class="blue-pulse-text">+1 Design every month</div>
                                </div>
                                <div class="art-board-item selected-board" data-board="travellers_quest" style="background-image: url('${RollmateAssets.images.defaultBg}');">
                                    <span class="design-name">Travellers Quest</span>
                                </div>
                            </div>
                        </div>

                        <div class="artist-col">
                            <div class="art-panel" id="panel-design" style="height: 100%; display: flex; flex-direction: column;">
                                <h3>${RollmateLang.t("art_bg_title")}</h3>
                                
                                <div class="art-row" id="row-border" style="width: 100%; justify-content: space-between;">
                                    <span>${RollmateLang.t("art_border")}</span>
                                    <div style="display:flex; gap:10px; align-items:center;">
                                        <i class="fas fa-eye art-toggle-btn ${_rmCtx().userBorderTrans === "transparent" ? "" : "active"}" id="art-border-toggle" title="Toggle Transparency"></i>
                                        <input type="color" id="art-border-picker" class="art-color-picker" style="width: 90px;" value="${_rmCtx().userBorder !== "transparent" ? _rmCtx().userBorder : "#555555"}">
                                    </div>
                                </div>
                                
                                <div class="art-row" style="flex-direction: column; align-items: flex-start; margin-bottom: 15px; width: 100%;">
                                    <span style="margin-bottom:5px; text-transform: uppercase; font-size: 0.9em; color: #ccc;">${RollmateLang.t("art_bg_bright")}: <span id="brightness-val">${_rmCtx().userBrightness}%</span></span>
                                    <input type="range" id="art-brightness-slider" class="art-slider" min="0" max="100" value="${_rmCtx().userBrightness}">
                                </div>
                                <div class="art-row" style="flex-direction: column; align-items: flex-start; margin-bottom: 15px; width: 100%;">
                                    <span style="margin-bottom:5px; text-transform: uppercase; font-size: 0.9em; color: #ccc;">${RollmateLang.t("art_bg_trans")}: <span id="trans-val">${Math.round(_rmCtx().userBgTrans * 100)}%</span></span>
                                    <input type="range" id="art-trans-slider" class="art-slider" min="0" max="100" value="${Math.round(_rmCtx().userBgTrans * 100)}">
                                </div>
                                
                                <div style="flex: 1; padding-right: 5px; overflow-y: auto;">
                                    <div style="text-align: center; margin-bottom: 15px;">
                                        <div style="color: white; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px; font-size: 1.1em; text-shadow: 0 2px 4px black;">Designs</div>
                                        <div class="blue-pulse-text">+5 Designs every Month</div>
                                    </div>
                                    ${designItemsHtml}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;

  $("body").append(artistHtml);
  const v = $("#rollmate-universal-overlay");

  v.find("#art-font-select").val(_rmCtx().userFont);

  function applyBoardMode(mode) {
    if (mode === "classic") {
      v.find("#mode-classic")
        .addClass("active")
        .css("color", "var(--rm-custom-glow)");
      v.find("#mode-immersive").removeClass("active").css("color", "");
      v.find(".art-board-item").addClass("disabled-artist-element");
    } else {
      v.find("#mode-immersive")
        .addClass("active")
        .css("color", "var(--rm-custom-glow)");
      v.find("#mode-classic").removeClass("active").css("color", "");
      v.find(".art-board-item").removeClass("disabled-artist-element");
    }
  }
  applyBoardMode(_rmCtx().userBoardMode);

  v.on("click", "#mode-classic", async function () {
    if (_rmCtx().userBoardMode !== "classic") {
      _rmCtx().userBoardMode = "classic";
      applyBoardMode("classic");
      await game.user.setFlag(
        RollmateFlags.scope,
        "artistBoardMode",
        "classic",
      );
    }
  });

  v.on("click", "#mode-immersive", async function () {
    if (_rmCtx().userBoardMode !== "immersive") {
      _rmCtx().userBoardMode = "immersive";
      applyBoardMode("immersive");
      await game.user.setFlag(
        RollmateFlags.scope,
        "artistBoardMode",
        "immersive",
      );
    }
  });

  v.find("#setup-back-btn, .cc-close")
    .hover(
      function () {
        $(this).css("color", "white");
      },
      function () {
        $(this).css("color", "rgba(255,255,255,0.7)");
      },
    )
    .click(() => {
      showStartMenu();
    });

  v.on("click", ".dice-style-btn", async function () {
    v.find(".dice-style-btn").removeClass("selected-style");
    $(this).addClass("selected-style");
    let style = $(this).data("style");
    _rmCtx().userDiceStyle = style;
    await game.user.setFlag(RollmateFlags.scope, "artistDiceStyle", style);
  });

  v.on("click", "#btn-test-roll", function (e) {
    e.preventDefault();
    const testId = "test_dice_001";

    if (window.rmActive3DDice && window.rmActive3DDice[testId]) {
      window.rmActive3DDice[testId].stop();
    }

    initWebGLDice(testId);
    setTimeout(() => {
      if (window.rmActive3DDice && window.rmActive3DDice[testId]) {
        window.rmActive3DDice[testId].throw();
        window.rmActive3DDice[testId].setResult(20);

        // NACH DEM WURF 2 SEKUNDEN LIEGEN LASSEN UND DANN VERSCHWINDEN (Partikeleffekt & Sound passieren im stop())
        setTimeout(() => {
          if (window.rmActive3DDice && window.rmActive3DDice[testId]) {
            window.rmActive3DDice[testId].stop();
          }
        }, 4800); // 2.8s für den Wurf + 2.0s liegen lassen
      }
    }, 50);
  });

  v.on("click", ".art-design-item", async function () {
    v.find(".art-design-item").removeClass("selected-design");
    $(this).addClass("selected-design");
    let bg = $(this).data("bg");
    document.documentElement.style.setProperty("--rm-bg-img", `url('${bg}')`);
    _rmCtx().userBgImg = bg;
    await game.user.setFlag(RollmateFlags.scope, "artistBgImg", bg);
  });

  v.on(
    "click",
    ".art-board-item:not(.disabled-artist-element)",
    async function () {
      v.find(".art-board-item").removeClass("selected-board");
      $(this).addClass("selected-board");
    },
  );

  v.find("#art-hover-picker").on("input", async function () {
    let col = $(this).val();
    document.documentElement.style.setProperty("--rm-custom-glow", col);
    _rmCtx().userGlow = col;
    await game.user.setFlag(RollmateFlags.scope, "artistGlow", col);
  });

  v.find("#art-border-picker").on("input", async function () {
    let col = $(this).val();
    _rmCtx().userBorder = col;
    if (v.find("#art-border-toggle").hasClass("active")) {
      document.documentElement.style.setProperty("--rm-border", col);
      _rmCtx().userBorderTrans = col;
    }
    await game.user.setFlag(RollmateFlags.scope, "artistBorder", col);
  });

  v.find("#art-particle-picker").on("input", async function () {
    let col = $(this).val();
    _rmCtx().userParticleColor = col;
    await game.user.setFlag(RollmateFlags.scope, "artistParticleColor", col);
  });

  v.find("#art-border-toggle").click(async function () {
    let isActive = $(this).hasClass("active");
    if (isActive) {
      $(this).removeClass("active");
      document.documentElement.style.setProperty("--rm-border", "transparent");
      _rmCtx().userBorderTrans = "transparent";
      await game.user.setFlag(RollmateFlags.scope, "artistBorderTrans", true);
    } else {
      $(this).addClass("active");
      document.documentElement.style.setProperty(
        "--rm-border",
        _rmCtx().userBorder,
      );
      _rmCtx().userBorderTrans = _rmCtx().userBorder;
      await game.user.setFlag(RollmateFlags.scope, "artistBorderTrans", false);
    }
  });

  v.find("#art-font-select").change(async function () {
    let font = $(this).val();
    document.documentElement.style.setProperty("--rm-font", font);
    _rmCtx().userFont = font;
    $(this).css("font-family", font);
    await game.user.setFlag(RollmateFlags.scope, "artistFont", font);
  });

  v.find("#art-brightness-slider").on("input", async function () {
    let val = $(this).val();
    v.find("#brightness-val").text(val + "%");
    document.documentElement.style.setProperty("--rm-brightness", val + "%");
    await game.user.setFlag(RollmateFlags.scope, "artistBrightness", val);
  });

  v.find("#art-trans-slider").on("input", async function () {
    let val = $(this).val();
    let dec = val / 100;
    v.find("#trans-val").text(val + "%");
    document.documentElement.style.setProperty("--rm-bg-trans", dec);
    await game.user.setFlag(RollmateFlags.scope, "artistBgTrans", dec);
  });

  v.on("click", "#btn-choose-card", function () {
    if ($("#art-card-window").length > 0) return;
    const cardUrls = [
      RollmateAssets.images.defaultCard,
      RollmateAssets.images.card1,
      RollmateAssets.images.card2,
      RollmateAssets.images.card3,
      RollmateAssets.images.card4,
      RollmateAssets.images.card5,
      RollmateAssets.images.card6,
    ];

    let cardsHtml = cardUrls
      .map((url) => {
        let isSelected = _rmCtx().userCardImg === url ? "selected-card" : "";
        return `
                        <div class="cc-portrait-card art-card-item ${isSelected}" data-url="${url}" style="width: 150px; flex-shrink: 0;">
                            <div class="cc-img-wrap" style="width: 150px; height: 216px;">
                                <img src="${url}" style="width:100%; height:100%; object-fit:cover; border-radius: 7px;">
                            </div>
                        </div>
                    `;
      })
      .join("");

    const winHtml = `
                    <div id="art-card-window" class="cc-window" style="z-index: 100000; display: flex; flex-direction: column; align-items: center; background: rgba(0,0,0,0.95); border: 2px solid var(--rm-theme);">
                        <div class="cc-drag-edge cc-drag-top"></div><div class="cc-drag-edge cc-drag-left"></div><div class="cc-drag-edge cc-drag-right"></div><div class="cc-drag-edge cc-drag-bottom"></div>
                        <div class="cc-close-card immersive-ui-top" style="position:absolute; top:15px; right:20px; font-size:1.5em; cursor:pointer; color:rgba(255,255,255,0.7); z-index: 55;">✖</div>
                        <h2 style="color:var(--rm-theme); margin-top: 10px; margin-bottom: 20px; text-shadow: 0 2px 4px black; text-transform: uppercase;">${RollmateLang.t("art_choose_card")}</h2>
                        <div class="cc-stage" style="display:flex; flex-wrap: nowrap; gap: 20px; padding: 20px; overflow-x: auto; max-width: 85vw;">
                            ${cardsHtml}
                        </div>
                    </div>
                `;
    $("body").append(winHtml);
    makeDraggable(
      $("#art-card-window"),
      $("#art-card-window").find(".cc-drag-edge"),
    );
  });

  $("body")
    .off("click", ".art-card-item")
    .on("click", ".art-card-item", async function () {
      $(".art-card-item").removeClass("selected-card");
      $(this).addClass("selected-card");
      _rmCtx().userCardImg = $(this).data("url");
      await game.user.setFlag(
        RollmateFlags.scope,
        "artistCardImg",
        _rmCtx().userCardImg,
      );
    });
  $("body")
    .off("click", ".cc-close-card")
    .on("click", ".cc-close-card", function () {
      $("#art-card-window").remove();
    });
  $("body")
    .off("mouseenter", ".cc-close-card")
    .on("mouseenter", ".cc-close-card", function () {
      $(this).css("color", "white");
    })
    .on("mouseleave", ".cc-close-card", function () {
      $(this).css("color", "rgba(255,255,255,0.7)");
    });
}

// ==========================================
// --- START SETUP (Universal) ---
// ==========================================

// ── Roll setup wizard ─────────────────────────────────────────────────────
function startSetup(mode, initialStep = 3, restoreParticipants = null) {
  const isGM = _rmCtx().isGM;
  cleanUp();
  toggleMacroIcon(false);
  updateSystemState();

  let actorsToUse = [];
  if (restoreParticipants) {
    actorsToUse = restoreParticipants
      .map((id) => game.actors.get(id))
      .filter((a) => a);
  }

  let btnText =
    mode === "randomTarget"
      ? RollmateLang.t("btn_start_roulette")
      : mode === "initiative"
        ? RollmateLang.t("roll_it")
        : RollmateLang.t("proceed");

  let typeToggles = `<button class="roll-type-toggle active" data-type="skills">${RollmateLang.t("tab_skills")}</button>
                               <button class="roll-type-toggle" data-type="saves">${RollmateLang.t("tab_saves")}</button>`;
  if (_rmCtx().activeSystem === "dnd5e") {
    typeToggles += `<button class="roll-type-toggle" data-type="abilities">${RollmateLang.t("tab_abilities")}</button><button class="roll-type-toggle" data-type="flat">${RollmateLang.t("tab_flat")}</button>`;
  } else {
    typeToggles += `<button class="roll-type-toggle" data-type="flat">${RollmateLang.t("tab_flat")}</button>`;
  }

  let getSkillList =
    _rmCtx().activeSystem === "dnd5e" ? getSkillList5e : getSkillListPF2;

  let bottomControls = "";
  if (_rmCtx().activeSystem === "pf2e") {
    bottomControls = `
                    <button id="btn-level-dc" class="elegant-btn"><i class="fas fa-level-up-alt"></i> ${RollmateLang.t("level_dc")}</button>
                    <select id="dc-adjustment" class="elegant-select">
                        <option value="0">${RollmateLang.t("dc_adj")}</option><option value="-10">-10</option><option value="-5">-5</option><option value="-2">-2</option><option value="2">+2</option><option value="5">+5</option><option value="10">+10</option>
                    </select>`;
  } else {
    bottomControls = `
                    <select id="difficulty-select" class="elegant-select">
                        <option value="" disabled selected>${RollmateLang.t("adj_diff")}</option>
                        <option value="5">5</option><option value="10">10</option><option value="15">15</option><option value="20">20</option><option value="25">25</option><option value="30">30</option>
                    </select>
                    <select id="adv-adjustment" class="elegant-select">
                        <option value="normal" selected>Normal</option><option value="advantage">Advantage</option><option value="disadvantage">Disadvantage</option>
                    </select>`;
  }

  function showMapWarning() {
    if ($("#rm-map-warning").length > 0) return;
    const warnHtml = `<div id="rm-map-warning" style="position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:rgba(138,3,3,0.95); border:2px solid #ff3333; color:white; font-family:var(--rm-font); padding:20px 40px; border-radius:10px; font-size:1.5em; text-align:center; z-index:9999999; box-shadow:0 0 30px #ff3333; text-shadow:0 2px 5px black; pointer-events:none;"><strong>${RollmateLang.t("map_warning_title")}</strong><br>${RollmateLang.t("map_warning_desc")}</div>`;
    $("body").append(warnHtml);
    setTimeout(() => {
      $("#rm-map-warning").fadeOut(500, function () {
        $(this).remove();
      });
    }, 3500);
  }

  function showImmersiveLimitModal(stepMode, idsToProceed = null) {
    if ($("#rm-immersive-limit-modal").length > 0) return;
    let modalHtml = `
                <div id="rm-immersive-limit-modal" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.8); z-index:9999999; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(5px);">
                    <div style="background:rgba(20,20,20,0.95); border:2px solid #ff3333; border-radius:15px; padding:30px; text-align:center; max-width:500px; color:white; font-family:var(--rm-font); box-shadow:0 0 30px #ff3333;">
                        <h2 style="color:#ff3333; text-shadow:0 2px 4px black; margin-top:0;">${RollmateLang.t("limit_title")}</h2>
                        <p style="font-size:1.2em; margin-bottom:25px;">${RollmateLang.t("limit_desc")}</p>
                        <div style="display:flex; justify-content:center; gap:20px;">
                            <button id="btn-reduce-participants" class="elegant-btn" style="border:1px solid #aaa; font-size:1.1em;">${RollmateLang.t("limit_red")}</button>
                            <button id="btn-temp-classic" class="elegant-btn" style="background:#8a0303; border:1px solid #ff3333; font-size:1.1em;">${RollmateLang.t("limit_class")}</button>
                        </div>
                    </div>
                </div>`;
    $("body").append(modalHtml);

    $("#btn-reduce-participants").click(() => {
      $("#rm-immersive-limit-modal").remove();
    });
    $("#btn-temp-classic").click(async () => {
      _rmCtx().userBoardMode = "classic";
      await game.user.setFlag(
        RollmateFlags.scope,
        "artistBoardMode",
        "classic",
      );
      window.rmTempClassicMode = false;
      $("#rm-immersive-limit-modal").remove();
      if (idsToProceed) proceedToNextStep(stepMode, idsToProceed);
    });
  }

  const perfClass = "perf-" + _rmCtx().userPerf;
  const setupHtml = `
            <div id="${"rollmate-universal-overlay"}" class="cc-overlay-setup ${perfClass}">
                ${generateCSS()}
                <div class="cc-window">
                    <div class="cc-window-bg"></div>
                    ${getSettingsHtml(false)}
                    <div class="cc-drag-edge cc-drag-top"></div><div class="cc-drag-edge cc-drag-left"></div><div class="cc-drag-edge cc-drag-right"></div><div class="cc-drag-edge cc-drag-bottom"></div>
                    <div id="setup-back-btn" class="immersive-ui-top" title="Back" style="position:absolute;top:20px;left:65px;font-size:1.5em;cursor:pointer;color:rgba(255,255,255,0.7); text-shadow: 0 2px 5px black; transition: color 0.2s; z-index: 99999;"><i class="fas fa-arrow-left"></i></div>
                    <div class="cc-close immersive-ui-top" style="position:absolute;top:20px;right:25px;font-size:2em;cursor:pointer;color:rgba(255,255,255,0.7); text-shadow: 0 2px 5px black; transition: color 0.2s; z-index: 99999;">✖</div>
                    <div class="cc-content-wrapper">
                        <div id="setup-step-3" style="position: relative; text-align:center; width:100%; margin-top: 10px;">
                            <div style="font-size: 2em; margin-bottom: 10px; font-weight: 300; text-shadow: 0 2px 5px black; text-transform:uppercase;">${RollmateLang.t("who_title")}</div>
                            <div style="display:flex; justify-content: center; gap: 20px; margin-bottom: 25px; z-index: 50;">
                                <button id="btn-gather-party" class="elegant-btn sys-action-btn" style="font-size: 0.85em; padding: 10px 20px;"><i class="fas fa-users"></i> ${RollmateLang.t("gather_party")}</button>
                                <button id="btn-gather-all" class="elegant-btn sys-action-btn" style="font-size: 0.85em; padding: 10px 20px;"><i class="fas fa-users-cog"></i> ${RollmateLang.t("gather_all")}</button>
                            </div>
                            <div id="actor-selection-stage" class="cc-stage" style="padding-bottom: 0;">
                                ${actorsToUse
                                  .map((a) => {
                                    let sel =
                                      restoreParticipants &&
                                      restoreParticipants.includes(a.id)
                                        ? "selected"
                                        : restoreParticipants
                                          ? ""
                                          : "selected";
                                    let displayName = window.formatActorName(
                                      a.name,
                                    );

                                    // --- NEU: Versteckt-Icon für Tokens ---
                                    let token = canvas.tokens.placeables.find(
                                      (t) => t.actor?.id === a.id,
                                    );
                                    let isHidden = token
                                      ? token.document.hidden
                                      : false;
                                    let hiddenHtml = isHidden
                                      ? `<i class="fas fa-eye-slash" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-size:4em; color:rgba(255,255,255,0.7); text-shadow:0 0 15px black; z-index:30; pointer-events:none;"></i>`
                                      : "";

                                    return `
                                    <div class="cc-portrait-card selectable ${sel}" data-id="${a.id}">
                                        <div class="cc-remove-actor" title="Remove"><i class="fas fa-times"></i></div>
                                        <div class="cc-img-wrap"><div class="cc-select-overlay"></div>${hiddenHtml}<img src="${a.img}"></div>
                                        <div style="margin-top:10px; font-weight:bold; font-size:1.1em; text-shadow: 0 2px 4px black;">${displayName}</div>
                                    </div>`;
                                  })
                                  .join("")}
                            </div>
                            <div id="actor-drop-zone" style="background: rgba(0,0,0,0.4); margin: 30px auto; width: 350px; height: 130px; border: 2px dashed rgba(255,255,255,0.4); border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: all 0.3s; backdrop-filter: blur(4px);">
                                <i class="fas fa-plus" style="font-size: 2.5em; color: rgba(255,255,255,0.6);"></i>
                                <div style="color: rgba(255,255,255,0.6); margin-top: 10px; font-weight: bold; letter-spacing: 1px; text-shadow: 0 2px 4px black; text-transform:uppercase; font-size: 0.9em; padding: 0 10px;">${RollmateLang.t("drop_actor")}</div>
                            </div>
                            <button id="btn-actors-next" class="elegant-btn menu-btn" data-mode="${mode}" style="margin-top: 10px; margin-left: auto; margin-right: auto;">${btnText}</button>
                        </div>
                        
                        <div id="setup-step-4" class="hidden" style="text-align:center; width:100%;">
                            <div style="font-size: 2.5em; margin-bottom: 5px; font-weight: 300; letter-spacing: 1px; text-shadow: 0 2px 5px black; margin-top: 10px; text-transform:uppercase;">${RollmateLang.t("setup_title")}</div>
                            <div class="roll-type-container">${typeToggles}</div>
                            <div id="global-select-wrapper" style="margin-bottom: 20px;">
                                <select id="global-skill-select" class="elegant-select" style="width: 300px; text-align: center;">
                                    <option value="" disabled selected>${RollmateLang.t("sel_global")}</option>
                                    ${getSkillList()
                                      .map(
                                        (s) =>
                                          `<option value="${s.key}">${s.label}</option>`,
                                      )
                                      .join("")}
                                </select>
                            </div>
                            <div id="individual-stage" class="cc-stage" style="align-items: center;"></div>
                            <div class="setup-bottom-bar">
                                <div class="setup-bottom-controls">${bottomControls}</div>
                                <button id="btn-start-final" class="elegant-btn menu-btn" style="font-size: 1.6em; font-weight: bold; padding: 12px 40px; margin-top: 10px;">${RollmateLang.t("roll_it")}</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;

  $("body").append(setupHtml);
  const v = $("#rollmate-universal-overlay");
  makeDraggable(v.find(".cc-window"), v.find(".cc-drag-edge"));
  attachSettingsListeners(v);

  v.find(".cc-close")
    .hover(
      function () {
        $(this).css("color", "white");
      },
      function () {
        $(this).css("color", "rgba(255,255,255,0.7)");
      },
    )
    .click(() => cleanUp());

  v.find("#setup-back-btn")
    .hover(
      function () {
        $(this).css("color", "white");
      },
      function () {
        $(this).css("color", "rgba(255,255,255,0.7)");
      },
    )
    .click(() => {
      if (!v.find("#setup-step-4").hasClass("hidden")) {
        v.find("#setup-step-4").addClass("hidden");
        v.find("#setup-step-3").removeClass("hidden");
      } else {
        cleanUp();
        showStartMenu();
      }
    });

  v.find("#btn-gather-party").click(async function () {
    const stage = v.find("#actor-selection-stage");
    let actors = game.actors.filter(
      (a) => a.hasPlayerOwner && a.type === "character",
    );

    if (mode === "initiative") {
      actors = actors.filter((a) =>
        canvas.tokens.placeables.some((t) => t.actor?.id === a.id),
      );
      await window.rmAddActorsToCombat(actors.map((a) => a.id));
      if (game.combat && ui.sidebar) ui.sidebar.activateTab("combat");
    }

    actors.forEach((actor) => {
      if (stage.find(`.cc-portrait-card[data-id="${actor.id}"]`).length === 0) {
        let displayName = window.formatActorName(actor.name);

        // --- NEU: Versteckt-Icon für Tokens ---
        let token = canvas.tokens.placeables.find(
          (t) => t.actor?.id === actor.id,
        );
        let isHidden = token ? token.document.hidden : false;
        let hiddenHtml = isHidden
          ? `<i class="fas fa-eye-slash" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-size:4em; color:rgba(255,255,255,0.7); text-shadow:0 0 15px black; z-index:30; pointer-events:none;"></i>`
          : "";

        stage.append(`
                            <div class="cc-portrait-card selectable selected" data-id="${actor.id}">
                                <div class="cc-remove-actor" title="Remove"><i class="fas fa-times"></i></div>
                                <div class="cc-img-wrap"><div class="cc-select-overlay"></div>${hiddenHtml}<img src="${actor.img}"></div>
                                <div style="margin-top:10px; font-weight:bold; font-size:1.1em; text-shadow: 0 2px 4px black;">${displayName}</div>
                            </div>
                        `);
      }
    });
    window.updateStageScale();
  });

  v.find("#btn-gather-all").click(async function () {
    const stage = v.find("#actor-selection-stage");
    let actors = canvas.tokens.placeables.map((t) => t.actor).filter((a) => a);
    actors = [...new Set(actors)];

    if (mode === "initiative") {
      await window.rmAddActorsToCombat(actors.map((a) => a.id));
      if (game.combat && ui.sidebar) ui.sidebar.activateTab("combat");
    }

    actors.forEach((actor) => {
      if (stage.find(`.cc-portrait-card[data-id="${actor.id}"]`).length === 0) {
        let displayName = window.formatActorName(actor.name);

        // --- NEU: Versteckt-Icon für Tokens ---
        let token = canvas.tokens.placeables.find(
          (t) => t.actor?.id === actor.id,
        );
        let isHidden = token ? token.document.hidden : false;
        let hiddenHtml = isHidden
          ? `<i class="fas fa-eye-slash" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-size:4em; color:rgba(255,255,255,0.7); text-shadow:0 0 15px black; z-index:30; pointer-events:none;"></i>`
          : "";

        stage.append(`
                            <div class="cc-portrait-card selectable selected" data-id="${actor.id}">
                                <div class="cc-remove-actor" title="Remove"><i class="fas fa-times"></i></div>
                                <div class="cc-img-wrap"><div class="cc-select-overlay"></div>${hiddenHtml}<img src="${actor.img}"></div>
                                <div style="margin-top:10px; font-weight:bold; font-size:1.1em; text-shadow: 0 2px 4px black;">${displayName}</div>
                            </div>
                        `);
      }
    });
    window.updateStageScale();

    if (
      _rmCtx().userBoardMode === "immersive" &&
      stage.find(".selected").length > 10
    ) {
      showImmersiveLimitModal(mode, null);
    }
  });

  v.on("click", "#setup-step-3 .cc-portrait-card", function () {
    $(this).toggleClass("selected");
  });
  v.on("click", ".cc-remove-actor", function (e) {
    e.stopPropagation();
    let card = $(this).closest(".cc-portrait-card");
    if (mode === "initiative") {
      window.rmRemoveActorFromCombat(card.data("id"));
    }
    card.remove();
    window.updateStageScale();
  });

  const dropZone = v.find("#actor-drop-zone");
  dropZone
    .on("dragover", function (e) {
      e.preventDefault();
      $(this).css({
        "border-color": _rmCtx().sysCfg.themeColor,
        background: _rmCtx().sysCfg.glowColor.replace("0.6", "0.2"),
      });
      $(this).find("i, div").css("color", _rmCtx().sysCfg.themeColor);
    })
    .on("dragleave", function (e) {
      e.preventDefault();
      $(this).css({
        "border-color": "rgba(255,255,255,0.4)",
        background: "rgba(0,0,0,0.4)",
      });
      $(this).find("i, div").css("color", "rgba(255,255,255,0.6)");
    })
    .on("drop", async function (e) {
      e.preventDefault();
      $(this).css({
        "border-color": "rgba(255,255,255,0.4)",
        background: "rgba(0,0,0,0.4)",
      });
      $(this).find("i, div").css("color", "rgba(255,255,255,0.6)");
      try {
        const data = JSON.parse(
          e.originalEvent.dataTransfer.getData("text/plain"),
        );
        let actorObj;
        if (data.type === "Combatant")
          actorObj = (await fromUuid(data.uuid))?.actor;
        else if (data.type === "Actor") actorObj = await fromUuid(data.uuid);
        else return;

        if (
          !actorObj ||
          v.find(
            `#actor-selection-stage .cc-portrait-card[data-id="${actorObj.id}"]`,
          ).length > 0
        )
          return;

        if (mode === "initiative") {
          const isOnMap = canvas.tokens.placeables.some(
            (t) => t.actor?.id === actorObj.id,
          );
          if (!isOnMap) {
            showMapWarning();
            return;
          }
          await window.rmAddActorsToCombat([actorObj.id]);
          if (game.combat && ui.sidebar) ui.sidebar.activateTab("combat");
        }

        let displayName = window.formatActorName(actorObj.name);

        // --- NEU: Versteckt-Icon für Tokens ---
        let token = canvas.tokens.placeables.find(
          (t) => t.actor?.id === actorObj.id,
        );
        let isHidden = token ? token.document.hidden : false;
        let hiddenHtml = isHidden
          ? `<i class="fas fa-eye-slash" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-size:4em; color:rgba(255,255,255,0.7); text-shadow:0 0 15px black; z-index:30; pointer-events:none;"></i>`
          : "";

        v.find("#actor-selection-stage").append(`
                        <div class="cc-portrait-card selectable selected" data-id="${actorObj.id}">
                            <div class="cc-remove-actor" title="Remove"><i class="fas fa-times"></i></div>
                            <div class="cc-img-wrap"><div class="cc-select-overlay"></div>${hiddenHtml}<img src="${actorObj.img}"></div>
                            <div style="margin-top:10px; font-weight:bold; font-size:1.1em; text-shadow: 0 2px 4px black;">${displayName}</div>
                        </div>
                    `);
        window.updateStageScale();
      } catch (err) {
        console.error("Drop Error:", err);
      }
    });
  window.updateStageScale();

  const adjustSelectFonts = () => {
    v.find("select").each(function () {
      const textLength = $(this).find("option:selected").text().length;
      if ($(this).hasClass("elegant-select")) {
        if (textLength > 24) $(this).css("font-size", "0.75em");
        else if (textLength > 15) $(this).css("font-size", "0.85em");
        else $(this).css("font-size", "");
      } else {
        if (textLength > 24) $(this).css("font-size", "0.55em");
        else if (textLength > 18) $(this).css("font-size", "0.65em");
        else if (textLength > 12) $(this).css("font-size", "0.75em");
        else $(this).css("font-size", "");
      }
    });
  };
  v.on("change", "select", adjustSelectFonts);

  v.find("#btn-actors-next").click(async function () {
    const stepMode = $(this).data("mode");
    const ids = [];
    v.find("#setup-step-3 .selected").each(function () {
      ids.push($(this).data("id"));
    });
    if (ids.length === 0)
      return ui.notifications.warn(
        "Rollmate: Bitte mindestens einen Teilnehmer wählen.",
      );

    if (_rmCtx().userBoardMode === "immersive" && ids.length > 10) {
      showImmersiveLimitModal(stepMode, ids);
      return;
    } else {
      window.rmTempClassicMode = false;
      proceedToNextStep(stepMode, ids);
    }
  });

  async function proceedToNextStep(execMode, ids) {
    if (execMode === "randomTarget") {
      const participants = {};
      ids.forEach((id) => {
        let isHidden = false;
        if (game.combat) {
          const c = game.combat.combatants.find((cb) => cb.actorId === id);
          if (c) isHidden = c.hidden;
        }
        participants[id] = {
          type: "randomTarget",
          skillLabel: RollmateLang.t("btn_random"),
          isHidden: isHidden,
        };
      });
      const checkData = {
        globalSkillLabel: RollmateLang.t("btn_random"),
        type: "randomTarget",
        participants: participants,
      };

      let msg = await ChatMessage.create({
        content: `<style>.cine-btn{background:rgba(0,0,0,0.8); border-radius:8px; text-align:center; box-shadow:0 0 15px var(--rm-custom-glow); border:2px solid transparent; cursor:pointer; transition: all 0.3s;} .cine-btn:hover{transform: scale(1.05); background: rgba(0,0,0,0.95); box-shadow: 0 0 25px var(--rm-custom-glow); border-color:white;} .cine-btn a{display:block!important; padding:12px; color:#ccc!important; font-weight:900!important; text-decoration:none!important; text-transform:uppercase!important; border:none!important; cursor:pointer; transition:all 0.3s;} .cine-btn:hover a{color:white!important;}</style><div style="padding:15px; background:rgba(0,0,0,0.85); border:2px solid var(--rm-theme); border-radius:8px; text-align:center; color:white; font-family:var(--rm-font); --rm-theme:${_rmCtx().sysCfg.themeColor}; --rm-custom-glow:${_rmCtx().userGlow};"><h3 style="color:#40E0D0; margin-top:0; border-bottom:none; font-size:1.4em;">${RollmateLang.t("started_title")}</h3><p style="font-size:1.1em; margin-bottom:20px; text-transform:uppercase;"><b>${RollmateLang.t("btn_random")}</b></p><div class="cine-btn"><a class="open-rollmate-btn">${RollmateLang.t("open_win")}</a></div><p style="font-size:0.8em; color:#aaa; margin-top:15px; margin-bottom:0;">${RollmateLang.t("click_wheel")}</p></div>`,
      });

      checkData.chatMsgId = msg.id;

      await canvas.scene.unsetFlag(RollmateFlags.scope, "rouletteWinner");
      await canvas.scene.unsetFlag(RollmateFlags.scope, "roulettePhase");
      await canvas.scene.setFlag(
        RollmateFlags.scope,
        RollmateFlags.checkKey,
        checkData,
      );

      cleanUp();
      buildStage(checkData);
    } else if (execMode === "initiative") {
      const participants = {};
      ids.forEach((id) => {
        let isHidden = false;
        if (game.combat) {
          const c = game.combat.combatants.find((cb) => cb.actorId === id);
          if (c) isHidden = c.hidden;
        }
        participants[id] = {
          rollCategory: "initiative",
          skillKey: "initiative",
          skillLabel: RollmateLang.t("init_text"),
          dc: 0,
          visibility: "normal",
          isHidden: isHidden,
        };
      });
      const checkData = {
        globalSkillLabel: RollmateLang.t("init_rolls"),
        type: "initiative",
        participants: participants,
        advMode: "normal",
      };

      let msg = await ChatMessage.create({
        content: `<style>.cine-btn{background:rgba(0,0,0,0.8); border-radius:8px; text-align:center; box-shadow:0 0 15px var(--rm-custom-glow); border:2px solid transparent; cursor:pointer; transition: all 0.3s;} .cine-btn:hover{transform: scale(1.05); background: rgba(0,0,0,0.95); box-shadow: 0 0 25px var(--rm-custom-glow); border-color:white;} .cine-btn a{display:block!important; padding:12px; color:#ccc!important; font-weight:900!important; text-decoration:none!important; text-transform:uppercase!important; border:none!important; cursor:pointer; transition:all 0.3s;} .cine-btn:hover a{color:white!important;}</style><div style="padding:15px; background:rgba(0,0,0,0.85); border:2px solid var(--rm-theme); border-radius:8px; text-align:center; color:white; font-family:var(--rm-font); --rm-theme:${_rmCtx().sysCfg.themeColor}; --rm-custom-glow:${_rmCtx().userGlow};"><h3 style="color:#40E0D0; margin-top:0; border-bottom:none; font-size:1.4em;">${RollmateLang.t("started_title")}</h3><p style="font-size:1.1em; margin-bottom:20px; text-transform:uppercase;"><b>${RollmateLang.t("init_rolls")}</b></p><div class="cine-btn"><a class="open-rollmate-btn">${RollmateLang.t("open_win")}</a></div><p style="font-size:0.8em; color:#aaa; margin-top:15px; margin-bottom:0;">${RollmateLang.t("click_dice")}</p></div>`,
      });

      checkData.chatMsgId = msg.id;
      await canvas.scene.setFlag(
        RollmateFlags.scope,
        RollmateFlags.checkKey,
        checkData,
      );

      cleanUp();
      buildStage(checkData);
    } else {
      let indivHtml = "";
      let initSkillKey = getSkillList()[0].key;

      ids.forEach((id) => {
        const a = game.actors.get(id);
        let options = getSkillList()
          .map((s) => `<option value="${s.key}">${s.label}</option>`)
          .join("");

        let ablSelect = "";
        if (_rmCtx().activeSystem === "dnd5e") {
          let initAbl = defaultAbilities5e[initSkillKey] || "dex";
          let ablOptions = getAbilitiesList5e()
            .map(
              (ab) =>
                `<option value="${ab.key}" ${ab.key === initAbl ? "selected" : ""}>${ab.label}</option>`,
            )
            .join("");
          ablSelect = `<select class="indiv-ability" style="position:relative; z-index:1;">${ablOptions}</select>`;
        }

        let displayName = window.formatActorName(a.name);

        indivHtml += `
                            <div class="indiv-card" data-id="${id}">
                                <div style="position:absolute; top:0; left:0; width:100%; height:100%; background-image:url('${a.img}'); background-size:cover; background-position:center; filter:blur(4px) brightness(0.5); z-index:0; pointer-events:none;"></div>
                                <div style="position:relative; z-index:1; font-weight:bold; margin-bottom: 15px; font-size:1.3em; text-align:center; height: 40px; overflow:hidden; text-shadow: 0 2px 5px black;">${displayName}</div>
                                <select class="indiv-skill" style="position:relative; z-index:1;">${options}</select>
                                ${ablSelect}
                                <div class="indiv-dc-wrapper" style="position:relative; z-index:1; display:flex; align-items:center; width:100%; justify-content:space-between; margin-top: 5px;">
                                    <span style="font-size:1.2em; color:rgba(255,255,255,0.9); text-shadow: 0 1px 3px black;">DC:</span>
                                    <input type="number" class="indiv-dc" value="" data-base-dc="">
                                </div>
                                <button class="vis-toggle" data-type="passfail" style="position:relative; z-index:1;">${RollmateLang.t("pass_fail")}</button>
                                <button class="vis-toggle" data-type="hidden" style="position:relative; z-index:1;">${RollmateLang.t("hidden_gm")}</button>
                            </div>`;
      });
      v.find("#individual-stage").html(indivHtml);
      v.find("#setup-step-3").addClass("hidden");
      v.find("#setup-step-4").removeClass("hidden");
      adjustSelectFonts();
      window.updateStageScale();
      window.autoSizeText(".indiv-skill, .indiv-ability, .vis-toggle", 0.5);
    }
  }

  if (initialStep === 4 && mode === "skills") {
    setTimeout(() => v.find("#btn-actors-next").click(), 50);
  }

  function updateDropdowns(type) {
    v.find(
      "#global-select-wrapper, .indiv-skill, .indiv-dc-wrapper, .vis-toggle",
    ).removeClass("disabled-control");
    let list;

    if (_rmCtx().activeSystem === "dnd5e") {
      if (type === "flat") {
        list = getFlatList5e();
        v.find("#difficulty-select, #adv-adjustment").addClass(
          "disabled-control",
        );
        v.find(".indiv-ability").hide();
      } else if (type === "saves") {
        list = getSaveList5e();
        v.find("#difficulty-select, #adv-adjustment").removeClass(
          "disabled-control",
        );
        v.find(".indiv-ability").hide();
      } else if (type === "abilities") {
        list = getAbilitiesList5e();
        v.find("#difficulty-select, #adv-adjustment").removeClass(
          "disabled-control",
        );
        v.find(".indiv-ability").hide();
      } else {
        list = getSkillList5e();
        v.find("#difficulty-select, #adv-adjustment").removeClass(
          "disabled-control",
        );
        v.find(".indiv-ability").show();
      }
    } else {
      if (type === "flat") {
        list = getFlatListPF2();
        v.find("#btn-level-dc, #dc-adjustment")
          .addClass("disabled-control")
          .val("0");
      } else {
        list = type === "saves" ? getSaveListPF2() : getSkillListPF2();
        v.find("#btn-level-dc, #dc-adjustment").removeClass("disabled-control");
      }
    }

    const options = list
      .map((s) => `<option value="${s.key}">${s.label}</option>`)
      .join("");
    v.find("#global-skill-select").html(
      `<option value="" disabled selected>${RollmateLang.t("sel_global")}</option>` +
        options,
    );
    v.find(".indiv-skill").html(options);

    if (type === "flat") {
      v.find(".indiv-skill").trigger("change");
    } else if (_rmCtx().activeSystem === "dnd5e" && type === "skills") {
      v.find(".indiv-skill").each(function () {
        const selectedKey = $(this).val();
        if (defaultAbilities5e[selectedKey])
          $(this)
            .closest(".indiv-card")
            .find(".indiv-ability")
            .val(defaultAbilities5e[selectedKey]);
      });
    }
    adjustSelectFonts();
  }

  v.on("click", ".roll-type-toggle", function () {
    if ($(this).hasClass("active")) return;
    v.find(".roll-type-toggle").removeClass("active");
    $(this).addClass("active");
    updateDropdowns($(this).data("type"));
  });

  v.find("#global-skill-select").change(function () {
    const selectedKey = $(this).val();
    if (selectedKey) v.find(".indiv-skill").val(selectedKey).trigger("change");
  });

  v.on("change", ".indiv-skill", function () {
    const activeType = v.find(".roll-type-toggle.active").data("type");
    const selectedKey = $(this).val();
    if (!selectedKey) return;
    const card = $(this).closest(".indiv-card");

    if (_rmCtx().activeSystem === "dnd5e") {
      if (activeType === "skills" && defaultAbilities5e[selectedKey]) {
        card.find(".indiv-ability").val(defaultAbilities5e[selectedKey]);
      }
      if (activeType === "flat") {
        let dc = 10;
        card.find(".indiv-dc").val(dc).attr("data-base-dc", dc);
      }
    } else {
      if (activeType === "flat") {
        const actor = game.actors.get(card.data("id"));
        let dc = 15;
        if (selectedKey === "flat_concealed") dc = 5;
        if (selectedKey === "flat_hidden") dc = 11;
        if (selectedKey === "flat_recovery") {
          const dyingValue =
            actor?.system?.attributes?.dying?.value ||
            actor?.itemTypes?.condition?.find((c) => c.slug === "dying")
              ?.value ||
            0;
          dc = 10 + dyingValue;
        }
        card.find(".indiv-dc").val(dc).attr("data-base-dc", dc);
      }
    }
  });

  v.on("click", ".vis-toggle", function () {
    const isActivating = !$(this).hasClass("active");
    $(this).closest(".indiv-card").find(".vis-toggle").removeClass("active");
    if (isActivating) $(this).addClass("active");
  });

  v.find("#btn-level-dc").click(function () {
    v.find(".indiv-card").each(function () {
      const actor = game.actors.get($(this).data("id"));
      const level = actor?.system?.details?.level?.value || 1;
      const newDc = getLevelDCPF2(level);
      $(this).find(".indiv-dc").val(newDc).attr("data-base-dc", newDc);
    });
    v.find("#dc-adjustment").val("0");
    console.log("Rollmate: DCs auf Charakterlevel angepasst.");
  });
  v.find("#dc-adjustment").change(function () {
    const mod = parseInt($(this).val());
    if (isNaN(mod)) return;
    v.find(".indiv-card").each(function () {
      const input = $(this).find(".indiv-dc");
      if (!input.attr("data-base-dc"))
        input.attr("data-base-dc", input.val() || 15);
      input.val(parseInt(input.attr("data-base-dc")) + mod);
    });
  });

  v.find("#difficulty-select").change(function () {
    const newDc = parseInt($(this).val());
    if (isNaN(newDc)) return;
    v.find(".indiv-card").each(function () {
      $(this).find(".indiv-dc").val(newDc).attr("data-base-dc", newDc);
    });
  });

  v.find("#btn-start-final").click(async () => {
    const participants = {};
    let isMixedSkills = false;
    let SkillLabel = "";
    const rollCategory = v.find(".roll-type-toggle.active").data("type");

    v.find(".indiv-card").each(function (index) {
      const id = $(this).data("id");
      const dc = parseInt($(this).find(".indiv-dc").val()) || 15;
      const skillKey = $(this).find(".indiv-skill").val();
      const skillLabel = $(this).find(".indiv-skill option:selected").text();

      let visibility = "normal";
      if ($(this).find('.vis-toggle[data-type="passfail"]').hasClass("active"))
        visibility = "passfail";
      if ($(this).find('.vis-toggle[data-type="hidden"]').hasClass("active"))
        visibility = "hidden";

      if (_rmCtx().activeSystem === "dnd5e") {
        const abilityKey = $(this).find(".indiv-ability").val();
        participants[id] = {
          rollCategory,
          skillKey,
          skillLabel,
          dc,
          visibility,
          abilityKey,
        };
      } else {
        participants[id] = { skillKey, skillLabel, dc, visibility };
      }

      if (index === 0) SkillLabel = skillLabel;
      else if (skillLabel !== SkillLabel) isMixedSkills = true;
    });

    const finalGlobalLabel = isMixedSkills
      ? RollmateLang.t("mixed_rolls")
      : SkillLabel;
    const globalAdv =
      _rmCtx().activeSystem === "dnd5e"
        ? v.find("#adv-adjustment").val() || "normal"
        : "normal";

    const checkData = {
      globalSkillLabel: finalGlobalLabel,
      type: "skills",
      participants: participants,
      advMode: globalAdv,
    };

    let msg = await ChatMessage.create({
      content: `<style>.cine-btn{background:rgba(0,0,0,0.8); border-radius:8px; text-align:center; box-shadow:0 0 15px var(--rm-custom-glow); border:2px solid transparent; cursor:pointer; transition: all 0.3s;} .cine-btn:hover{transform: scale(1.05); background: rgba(0,0,0,0.95); box-shadow: 0 0 25px var(--rm-custom-glow); border-color:white;} .cine-btn a{display:block!important; padding:12px; color:#ccc!important; font-weight:900!important; text-decoration:none!important; text-transform:uppercase!important; border:none!important; cursor:pointer; transition:all 0.3s;} .cine-btn:hover a{color:white!important;}</style><div style="padding:15px; background:rgba(0,0,0,0.85); border:2px solid var(--rm-theme); border-radius:8px; text-align:center; color:white; font-family:var(--rm-font); --rm-theme:${_rmCtx().sysCfg.themeColor}; --rm-custom-glow:${_rmCtx().userGlow};"><h3 style="color:#40E0D0; margin-top:0; border-bottom:none; font-size:1.4em;">${RollmateLang.t("started_title")}</h3><p style="font-size:1.1em; margin-bottom:20px; text-transform:uppercase;"><b>${finalGlobalLabel}</b></p><div class="cine-btn"><a class="open-rollmate-btn">${RollmateLang.t("open_win")}</a></div><p style="font-size:0.8em; color:#aaa; margin-top:15px; margin-bottom:0;">${RollmateLang.t("click_dice")}</p></div>`,
    });

    checkData.chatMsgId = msg.id;
    await canvas.scene.setFlag(
      RollmateFlags.scope,
      RollmateFlags.checkKey,
      checkData,
    );

    cleanUp();
    buildStage(checkData);
  });
}
