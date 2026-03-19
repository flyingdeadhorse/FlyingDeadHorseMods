/**
 * MyRollmate – Main Entry Point (main.js)
 *
 * Defines window.RollmateUniversal.execute():
 *   1. Preloads the wood texture asset
 *   2. Loads Three.js and Cannon.js from the local lib/ directory
 *   3. Registers reactive Foundry hooks (scene controls, actor sync)
 *   4. Detects the active game system and reads per-user settings
 *   5. Populates window.RollmateCtx for all sub-modules
 *   6. Opens the Start Menu
 *
 * Also registers persistent module hooks via initRollmateHooks() which
 * runs once when Foundry VTT is ready.
 *
 * Load order:
 *   config.js → lang.js → audio.js → 3d-engine.js
 *   → roll-logic.js → ui-handler.js → main.js
 */

/**
 * MyRollmate - Premium Edition
 * Version 1.0.2
 */

window.RollmateUniversal = {
  execute: async function () {
    const overlayId = "rollmate-universal-overlay";
    const flagScope = "world";
    const flagKey = "cinematicGroupCheck";
    const resultKey = "cinematicRollResult";

    const isGM = game.user.isGM;

    // --- BILDER VORLADEN ---
    if (!window.rmWoodTextureImg) {
      try {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = RollmateAssets.images.woodTexture;
        await new Promise((resolve) => {
          img.onload = () => {
            window.rmWoodTextureImg = img;
            resolve();
          };
          img.onerror = () => {
            console.warn("Rollmate: Failed to load wood texture.");
            resolve();
          };
        });
      } catch (e) {}
    }

    // --- 3D ENGINE LADEN ---
    async function loadScript(url) {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${url}"]`)) return resolve();
        const script = document.createElement("script");
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    if (!window.rm3DLibsLoaded) {
      console.log("Rollmate: Lade echte 3D-Engine...");
      try {
        await loadScript(RollmateAssets.lib.threejs);
        await loadScript(RollmateAssets.lib.cannonjs);
        window.rm3DLibsLoaded = true;
      } catch (e) {
        return console.error(
          "Rollmate: Fehler beim Laden der 3D-Bibliotheken.",
        );
      }
    }

    if (!window.rmUniversalSceneControlsHook) {
      Hooks.on("renderSceneControls", (app, html) => {
        if (html.find(".rollmate-main-btn").length === 0) {
          const btn = $(
            `<li class="scene-control rollmate-main-btn" title="Rollmate Universal"><i class="fas fa-dice"></i></li>`,
          );
          btn.on("click", () => {
            window.RollmateUniversal.execute();
          });
          html.append(btn);
        }
      });
      window.rmUniversalSceneControlsHook = true;
      ui.controls.render();
    }
    window.formatActorName = function (name) {
      if (name && name.length > 16 && name.includes(" ")) {
        return name.split(" ")[0];
      }
      return name;
    };

    // --- NEU: COMBAT HELPER ---
    window.rmAddActorsToCombat = async function (actorIds) {
      if (!game.combat || !game.user.isGM) return;
      const toAdd = [];
      for (let id of actorIds) {
        const token = canvas.tokens.placeables.find((t) => t.actor?.id === id);
        if (token && !game.combat.combatants.find((c) => c.actorId === id)) {
          toAdd.push({
            tokenId: token.id,
            actorId: id,
            hidden: token.document.hidden,
          });
        }
      }
      if (toAdd.length > 0)
        await game.combat.createEmbeddedDocuments("Combatant", toAdd);
    };

    window.rmRemoveActorFromCombat = async function (actorId) {
      if (!game.combat || !game.user.isGM) return;
      const combatant = game.combat.combatants.find(
        (c) => c.actorId === actorId,
      );
      if (combatant) await combatant.delete();
    };

    if (!window.rmUniversalSceneHook) {
      Hooks.on("updateScene", (scene, data) => {
        if (
          hasProperty(
            data,
            `flags.${RollmateFlags.scope}.-=${RollmateFlags.checkKey}`,
          )
        )
          cleanUp();
        if (
          hasProperty(
            data,
            `flags.${RollmateFlags.scope}.${RollmateFlags.checkKey}`,
          )
        ) {
          if (
            !game.user.isGM &&
            $("#rollmate-universal-overlay").length === 0
          ) {
            window.RollmateUniversal.execute();
          }
        }
        if (hasProperty(data, `flags.${RollmateFlags.scope}.roulettePhase`)) {
          const phase = getProperty(
            data,
            `flags.${RollmateFlags.scope}.roulettePhase`,
          );
          const winnerId = canvas.scene.getFlag(
            RollmateFlags.scope,
            "rouletteWinner",
          );
          if (window.handleRoulettePhase)
            window.handleRoulettePhase(phase, winnerId);
        }
      });
      window.rmUniversalSceneHook = true;
    }

    if (!window.rmUniversalActorHook) {
      Hooks.on("updateActor", (actor, changes, options, userId) => {
        if (
          hasProperty(
            changes,
            `flags.${RollmateFlags.scope}.${RollmateFlags.resultKey}`,
          )
        ) {
          const result = actor.getFlag(
            RollmateFlags.scope,
            RollmateFlags.resultKey,
          );
          if (result && $("#rollmate-universal-overlay").length > 0) {
            if (result.status === "rolling") {
              if (typeof window.resetCardForReroll === "function")
                window.resetCardForReroll(actor.id);

              // GLOBALE 3D-WÜRFEL SYNCHRONISATION FÜR ALLE SPIELER
              if (game.user.id !== userId) {
                if (typeof window.initWebGLDiceFunc === "function") {
                  window.initWebGLDiceFunc(actor.id);
                  setTimeout(() => {
                    if (
                      window.rmActive3DDice &&
                      window.rmActive3DDice[actor.id]
                    ) {
                      window.rmActive3DDice[actor.id].throw();
                      window.rmActive3DDice[actor.id].setResult(result.d20);
                    }
                  }, 50);
                }
              }
            } else if (typeof animateCardResult === "function") {
              animateCardResult(actor.id, result);
            }
          }
        }
      });
      window.rmUniversalActorHook = true;
    }

    function cleanUp() {
      window.rmTempClassicMode = false;
      window.rmCustomBox = null;
      if (window.rmActive3DDice) {
        Object.values(window.rmActive3DDice).forEach((d) => d.stop && d.stop());
        window.rmActive3DDice = {};
      }
      const canvasEl = document.getElementById("rm-global-3d-canvas");
      if (canvasEl) canvasEl.remove();
      window.rm3DEngine = null;

      if (window.stopAllRouletteFloat) window.stopAllRouletteFloat();
      window.stopLevitate();
      window.stopHeartbeat();
      if (window.rmShuffleInterval) clearInterval(window.rmShuffleInterval);
      if (window.rmFloatAnimFrame) {
        cancelAnimationFrame(window.rmFloatAnimFrame);
        window.rmFloatAnimFrame = null;
      }
      $("#rollmate-universal-overlay").remove();
      $("#rm-immersive-limit-modal").remove();
      $(window).off(".ccDrag");
      $(document).off("click.langDropdown");

      toggleMacroIcon(true);
    }
    window.rmCleanUp = cleanUp;

    // --- SYSTEM-ERKENNUNG ---
    let activeSystem = game.system.id === "pf2e" ? "pf2e" : "dnd5e";

    const updateSystemState = () => {
      activeSystem = game.system.id === "pf2e" ? "pf2e" : "dnd5e";
      sysCfg = getSysConfig();
    };

    const getSysConfig = () => {
      if (activeSystem === "pf2e")
        return {
          id: "pf2e",
          name: "Pathfinder 2",
          themeColor: "#FFD700",
          glowColor: "rgba(255,215,0,0.6)",
          logoImg: RollmateAssets.images.pf2Logo,
        };
      if (activeSystem === "dnd5e")
        return {
          id: "dnd5e",
          name: "Dungeons and Dragons 5",
          themeColor: "#FF5722",
          glowColor: "rgba(255, 87, 34, 0.6)",
          logoImg: RollmateAssets.images.dnd5Logo,
        };
    };
    let sysCfg = getSysConfig();

    // --- CUSTOM DESIGN flags ---
    const gmUser =
      game.users.find((u) => u.isGM && u.active) ||
      game.users.find((u) => u.isGM) ||
      game.user;

    let userBgImg =
      gmUser.getFlag(flagScope, "artistBgImg") ?? RollmateAssets.images.defaultBg;
    let userGlow = gmUser.getFlag(flagScope, "artistGlow") ?? "#0088ff";

    let userBorder = gmUser.getFlag(flagScope, "artistBorder") ?? "#555555";
    let savedBorderTrans = gmUser.getFlag(flagScope, "artistBorderTrans");
    let userBorderTrans =
      savedBorderTrans === false ? userBorder : "transparent";

    let userFont = gmUser.getFlag(flagScope, "artistFont") ?? "'Cinzel', serif";

    let userDiceStyle = gmUser.getFlag(flagScope, "artistDiceStyle") ?? "stone";
    let userParticleColor =
      gmUser.getFlag(flagScope, "artistParticleColor") ?? "#0088ff";

    let userBrightness = gmUser.getFlag(flagScope, "artistBrightness") ?? 100;
    let userBgTrans = gmUser.getFlag(flagScope, "artistBgTrans") ?? 1.0;
    let userCardImg =
      gmUser.getFlag(flagScope, "artistCardImg") ?? RollmateAssets.images.defaultCard;

    let userBoardMode =
      gmUser.getFlag(flagScope, "artistBoardMode") ?? "immersive";
    let userPerf = game.user.getFlag(flagScope, "rollmatePerformance") ?? "max";

    // ── Populate shared session context (used by all sub-modules) ──────
    window.RollmateCtx = {
      overlayId: "rollmate-universal-overlay",
      flagScope: RollmateFlags.scope,
      flagKey: RollmateFlags.checkKey,
      resultKey: RollmateFlags.resultKey,
      isGM,
      gmUser,
      sysCfg,
      activeSystem,
      userBgImg,
      userGlow,
      userBorder,
      userBorderTrans,
      userFont,
      userBrightness,
      userBgTrans,
      userCardImg,
      userDiceStyle,
      userParticleColor,
      userBoardMode,
      userPerf,
    };

    // ── Language module ───────────────────────────────────────────────
    if (window.RollmateLang) {
      window.RollmateLang.changeLang(
        game.user.getFlag(RollmateFlags.scope, "rollmateLanguage") || "en",
      );
    }

    // ── 3D dice engine ────────────────────────────────────────────────
    if (typeof setupGlobal3DEngine === "function") {
      await setupGlobal3DEngine();
    }

    // ── Open Start Menu / restore active session ──────────────────────────
    const activeCheckInstance = canvas.scene.getFlag(
      RollmateFlags.scope,
      RollmateFlags.checkKey,
    );
    if (!isGM) {
      if (!activeCheckInstance)
        return console.warn("Rollmate: Keine aktive Würfelrunde gefunden!");
      if (
        typeof buildStage === "function" &&
        $("#rollmate-universal-overlay").length === 0
      )
        buildStage(activeCheckInstance);
    } else {
      if (activeCheckInstance) {
        if (
          typeof buildStage === "function" &&
          $("#rollmate-universal-overlay").length === 0
        )
          buildStage(activeCheckInstance);
      } else {
        if (typeof showStartMenu === "function") showStartMenu();
      }
    }
  },
};

// ── Persistent module hooks ───────────────────────────────────────────────
function initRollmateHooks() {
  $(document)
    .off("click.rmOpen")
    .on("click.rmOpen", ".open-rollmate-btn", function (e) {
      e.preventDefault();
      window.RollmateUniversal.execute();
    });

  if (!window.rollmateAutoOpenActive) {
    Hooks.on("createChatMessage", (message) => {
      if (message.content && message.content.includes("open-rollmate-btn")) {
        if (game.user.isGM) return;
        setTimeout(() => {
          window.RollmateUniversal.execute();
        }, 500);
      }
    });
    window.rollmateAutoOpenActive = true;
  }

  if (!window.rmUniversalTokenHook) {
    Hooks.on("controlToken", (token, controlled) => {
      const view = $("#rollmate-universal-overlay");
      if (view.length === 0) return;
      const stage = view.find("#actor-selection-stage");
      if (stage.length === 0) return;

      const actor = token.actor;
      if (!actor) return;
      if (!game.user.isGM && !actor.hasPlayerOwner) return;

      let card = stage.find(`.cc-portrait-card[data-id="${actor.id}"]`);
      if (controlled) {
        if (card.length === 0) {
          let displayName = window.formatActorName(actor.name);

          // --- NEU: Versteckt-Icon für Tokens ---
          let isHidden = token.document.hidden || false;
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
          if (window.updateStageScale) window.updateStageScale();
        } else {
          card.addClass("selected");
        }
      }
    });
    window.rmUniversalTokenHook = true;
  }

  if (!window.rmCombatSyncActive) {
    Hooks.on("createCombatant", (combatant) => {
      const view = $("#rollmate-universal-overlay");
      const stage = view.find("#actor-selection-stage");
      if (stage.length === 0) return;

      const actor = combatant.actor;
      if (!actor) return;

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
        if (window.updateStageScale) window.updateStageScale();
      }
    });

    Hooks.on("deleteCombatant", (combatant) => {
      const view = $("#rollmate-universal-overlay");
      const stage = view.find("#actor-selection-stage");
      if (stage.length === 0) return;

      const actor = combatant.actor;
      if (!actor) return;

      const card = stage.find(`.cc-portrait-card[data-id="${actor.id}"]`);
      if (card.length > 0) {
        card.remove();
        if (window.updateStageScale) window.updateStageScale();
      }
    });
    window.rmCombatSyncActive = true;
  }

  if (game.user.isGM) {
    const launcherId = "rollmate-floating-launcher";
    const styleId = "rollmate-launcher-style";
    const posKey = "rollmateLauncherPos";

    if ($(`#${launcherId}`).length === 0) {
      let savedPos = game.user.getFlag(RollmateFlags.scope, posKey);
      if (!savedPos || isNaN(savedPos.top) || isNaN(savedPos.left)) {
        savedPos = {
          top: window.innerHeight / 2 - 25,
          left: window.innerWidth / 2 - 25,
        };
      } else {
        savedPos.left = Math.max(
          0,
          Math.min(savedPos.left, window.innerWidth - 65),
        );
        savedPos.top = Math.max(
          0,
          Math.min(savedPos.top, window.innerHeight - 65),
        );
      }

      const launcherColor = "#FFD700";

      const style = `
                <style id="${styleId}">
                    #${launcherId} { position: fixed; width: 80px; height: 80px; z-index: 999999; cursor: grab; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: transform 0.1s ease; }
                    #${launcherId}:active { cursor: grabbing; }
                    .rm-start-icon { width: 100%; height: 100%; pointer-events: none; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.8)); transition: filter 0.2s ease, transform 0.2s ease; object-fit: contain; }
                    #${launcherId}:hover .rm-start-icon { filter: drop-shadow(0 0 15px ${launcherColor}) drop-shadow(0 4px 6px rgba(0,0,0,0.8)) brightness(1.2); transform: scale(1.1); }
                </style>
            `;
      $("head").append(style);

      const html = `<div id="${launcherId}" style="top: ${savedPos.top}px; left: ${savedPos.left}px;" title="Rollmate Universal"><img src="${RollmateAssets.images.startIcon}" class="rm-start-icon"></div>`;
      $("body").append(html);

      const btn = $(`#${launcherId}`);
      let isMouseDown = false;
      let isDragging = false;
      let hasMoved = false;
      let startX, startY, initialLeft, initialTop;

      btn.on("mousedown", function (e) {
        if (e.button !== 0) return;
        e.preventDefault();
        isMouseDown = true;
        isDragging = false;
        hasMoved = false;
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = parseInt(btn.css("left")) || 0;
        initialTop = parseInt(btn.css("top")) || 0;
      });

      $(window).on("mousemove.rmLauncher", function (e) {
        if (!isMouseDown) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (!isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
          isDragging = true;
        }

        if (!isDragging) return;

        hasMoved = true;
        btn.css({ left: initialLeft + dx + "px", top: initialTop + dy + "px" });
      });

      $(window).on("mouseup.rmLauncher", async function (e) {
        if (!isMouseDown) return;
        isMouseDown = false;

        if (isDragging && hasMoved) {
          hasMoved = false;
          isDragging = false;
          await game.user.setFlag(RollmateFlags.scope, posKey, {
            left: parseInt(btn.css("left")),
            top: parseInt(btn.css("top")),
          });
        } else if (!isDragging && e.target.closest(`#${launcherId}`)) {
          window.RollmateUniversal.execute();
        }
      });
    }
  }
}

if (game.ready) {
  initRollmateHooks();
} else {
  // ── Module entry point ────────────────────────────────────────────────────
  Hooks.once("ready", initRollmateHooks);
}
