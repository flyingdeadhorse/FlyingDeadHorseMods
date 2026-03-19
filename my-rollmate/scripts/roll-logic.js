/**
 * MyRollmate – Roll Logic (roll-logic.js)
 *
 * Handles roll-result processing, roulette-card animation sequencing,
 * and per-actor card state management.
 *
 * Exposes (window-level for cross-player network sync):
 *   window.startRouletteFloatAndMix
 *   window.doShuffleCards
 *   window.handleRoulettePhase
 *   window.resetCardForReroll
 *
 * Depends on: config.js, audio.js (playRMSnd)
 * Loaded before: ui-handler.js, main.js
 */

// Session-state accessor – populated by execute() in main.js
function _rmCtx() {
  return window.RollmateCtx || {};
}

// ── Roulette card float & shuffle animations ──────────────────────────────
// --- JS ANIMATION LOOP (Schicksalskarten) ---
window.rmRouletteCards = [];
window.rmSlots = [];
window.rmFloatAnimFrame = null;
window.rmShuffleInterval = null;

window.startRouletteFloatAndMix = function () {
  const view = $("#rollmate-universal-overlay");
  if (view.length === 0) return;

  window.rmSlots = [];
  window.rmRouletteCards = [];

  view.find(".roulette-card").each(function (i) {
    window.rmSlots.push({ x: this.offsetLeft, y: this.offsetTop });
    window.rmRouletteCards.push({
      id: $(this).data("id"),
      baseIdx: i,
      startX: this.offsetLeft,
      startY: this.offsetTop,
      currentSlot: i,
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      landed: true,
      landProgress: 1,
      cardEl: this,
      wrap: $(this).find(".roulette-float-wrap")[0],
      shadow: $(this).find(".card-shadow")[0],
      imgWrap: $(this).find(".cc-img-wrap")[0],
      offset: Math.random() * Math.PI * 2,
      speed: 0.002 + Math.random() * 0.001,
    });
  });

  function loop() {
    let time = Date.now();
    window.rmRouletteCards.forEach((c) => {
      if (!c.wrap || !c.imgWrap) return;
      let lerpSpeed = c.landed ? 0.08 : 0.15;
      c.x += (c.targetX - c.x) * lerpSpeed;
      c.y += (c.targetY - c.y) * lerpSpeed;
      if (c.landed) c.landProgress = Math.min(1, c.landProgress + 0.05);
      else c.landProgress = Math.max(0, c.landProgress - 0.1);

      let floatY =
        (1 - c.landProgress) * (Math.sin(time * c.speed + c.offset) * 18);
      let floatOffset = (1 - c.landProgress) * -120;

      // Z-Index Update
      if (!c.landed) {
        c.cardEl.style.zIndex = 950;
      } else if (c.landProgress >= 0.99) {
        c.cardEl.style.zIndex = "";
      }

      c.wrap.style.transform = `translate(${c.x}px, ${c.y + floatY + floatOffset}px)`;

      // SHADOW FIX
      if (c.landed && c.landProgress >= 0.99) {
        c.imgWrap.style.boxShadow = `0 10px 30px rgba(0,0,0,0.8)`;
        c.imgWrap.style.borderColor = "#000";
        if (c.shadow) c.shadow.style.opacity = "0";
      } else {
        c.imgWrap.style.boxShadow = `0 30px 50px rgba(0,0,0,0.8)`;
        if (c.shadow) {
          let scale = 1 + (1 - c.landProgress) * 0.5;
          c.shadow.style.transform = `translate(${c.x}px, ${c.y}px) scale(${scale})`;
          c.shadow.style.opacity = (1 - c.landProgress) * 0.8;
        }
      }
    });
    window.rmFloatAnimFrame = requestAnimationFrame(loop);
  }
  if (!window.rmFloatAnimFrame) loop();
};

window.doShuffleCards = function () {
  if (window.rmSlots.length === 0) return;
  let indices = window.rmRouletteCards.map((c, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  window.rmRouletteCards.forEach((c, i) => {
    c.currentSlot = indices[i];
    c.targetX = window.rmSlots[c.currentSlot].x - c.startX;
    c.targetY = window.rmSlots[c.currentSlot].y - c.startY;
  });
};

// ── Card state reset & initiative-order update ────────────────────────────
window.resetCardForReroll = function (actorId) {
  const view = $("#rollmate-universal-overlay");
  if (view.length === 0) return;
  const card = view.find(`.cc-portrait-card[data-id="${actorId}"]`);
  if (card.length === 0) return;

  card.removeClass(
    "rolled crit-fail crit-success failure success init-glow init-tier-1 init-tier-2 init-tier-3 init-tier-4 init-tier-5 nat-20-effect nat1-effect",
  );
  card
    .find(
      ".glass-shimmer, .magic-explosion, .dice-particle, .wind-line, .gold-sparkle, .blood-drop, .q-mark, .skull-cloud, .skull, .nova-explosion",
    )
    .remove();
  card.find(".cc-result-area").empty();
  card.attr("data-total", -999);
  card.attr("data-d20", -999);
  card.addClass("is-rolling");
  updateInitOrder();
};

function updateInitOrder() {
  const activeCheck = canvas.scene.getFlag(
    RollmateFlags.scope,
    RollmateFlags.checkKey,
  );
  if (!activeCheck || activeCheck.type !== "initiative") return;
  const view = $("#rollmate-universal-overlay");
  let cards = [];
  view.find(".cc-portrait-card").each(function () {
    const el = $(this);
    const total = parseInt(el.attr("data-total")) || -999;
    const d20 = parseInt(el.attr("data-d20")) || -999;
    cards.push({ el, total, d20 });
  });
  cards.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return b.d20 - a.d20;
  });
  cards.forEach((c, i) => {
    c.el.css("order", i);
    if (c.total !== -999)
      c.el
        .find(".init-placement")
        .text(i + 1)
        .css("opacity", 1);
  });
}

// ── Roulette phase sequencer (synced across all connected players) ────────
window.handleRoulettePhase = function (phase, winnerId) {
  const view = $("#rollmate-universal-overlay");
  if (view.length === 0) return;
  const cards = view.find(".cc-portrait-card");
  const winnerCard = winnerId ? cards.filter(`[data-id="${winnerId}"]`) : null;

  if (phase === 1) {
    view.find("#btn-shuffle").fadeOut(300);
    if (window.rmShuffleInterval) clearInterval(window.rmShuffleInterval);
    window.playLevitate();

    let delay = 0;
    cards.each(function (i) {
      let card = $(this);
      let cId = card.data("id");

      card
        .find(".card-tilt-wrapper")
        .css({ transform: "rotate(0deg)", transition: "transform 0.3s ease" });

      setTimeout(() => {
        playRMSnd(`${RollmateAssets.sounds.flip}`);
        card.find(".portrait-img").attr("src", _rmCtx().userCardImg);
        card.find(".text-info, .immersive-name-tag").css("opacity", 0);
        let rmCard = window.rmRouletteCards.find((c) => c.id === cId);
        if (rmCard) rmCard.landed = false;
      }, delay);
      delay += 150;
    });

    setTimeout(() => {
      window.rmShuffleInterval = setInterval(window.doShuffleCards, 200);
      let soundEnabled =
        game.user.getFlag(RollmateFlags.scope, "rollmateSoundEnabled") ?? true;
      let vol = game.user.getFlag(RollmateFlags.scope, "rollmateVolume") ?? 1.0;

      if (soundEnabled) {
        let shuffleAudio = new Audio(`${RollmateAssets.sounds.shuffle}`);
        shuffleAudio.volume = vol;
        shuffleAudio.play().catch((e) => console.log(e));

        if (isGM) {
          shuffleAudio.onended = async () => {
            if (
              (canvas.scene.getFlag(RollmateFlags.scope, "roulettePhase") ||
                0) === 1
            ) {
              await canvas.scene.setFlag(
                RollmateFlags.scope,
                "roulettePhase",
                2,
              );
            }
          };
        }
      } else {
        if (isGM) {
          setTimeout(async () => {
            if (
              (canvas.scene.getFlag(RollmateFlags.scope, "roulettePhase") ||
                0) === 1
            ) {
              await canvas.scene.setFlag(
                RollmateFlags.scope,
                "roulettePhase",
                2,
              );
            }
          }, 4000);
        }
      }
    }, delay + 200);
  } else if (phase === 2) {
    if (window.rmShuffleInterval) clearInterval(window.rmShuffleInterval);
    window.stopLevitate();

    window.rmRouletteCards.forEach((c) => {
      c.targetX = window.rmSlots[c.currentSlot].x - c.startX;
      c.targetY = window.rmSlots[c.currentSlot].y - c.startY;
    });

    let delay = 0;
    let totalCards = cards.length;
    cards.each(function (index) {
      let card = $(this);
      let cId = card.data("id");

      setTimeout(() => {
        let rmCard = window.rmRouletteCards.find((c) => c.id === cId);
        if (rmCard) rmCard.landed = true;

        let rot = Math.random() * 6 - 3;
        card
          .find(".card-tilt-wrapper")
          .css({
            transform: `rotate(${rot}deg)`,
            transition:
              "transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          });

        card.removeClass("flipped").addClass("landed");
        playRMSnd(`${RollmateAssets.sounds.cardLand}`);

        if (index === totalCards - 1) {
          setTimeout(() => {
            if (window.rmFloatAnimFrame) {
              cancelAnimationFrame(window.rmFloatAnimFrame);
              window.rmFloatAnimFrame = null;
            }

            window.rmRouletteCards.forEach((c) => {
              let cardEl = view.find(`.roulette-card[data-id="${c.id}"]`);
              cardEl.css("order", c.currentSlot);
              $(c.wrap).css("transform", "none");

              $(c.imgWrap).css({ "box-shadow": "0 10px 30px rgba(0,0,0,0.8)" });
              $(c.imgWrap).css({ "border-color": "#000" });
              if (c.shadow) $(c.shadow).css("opacity", "0");
            });

            view.find(".roulette-card").addClass("clickable-phase");
          }, 250);
        }
      }, delay);

      delay += 150;
    });

    setTimeout(() => {
      if (
        (canvas.scene.getFlag(RollmateFlags.scope, "roulettePhase") || 0) === 2
      ) {
        window.playHeartbeat();
      }
    }, delay + 600);
  } else if (phase === 3) {
    window.stopHeartbeat();
    if (!winnerCard || winnerCard.length === 0) return;

    cards.removeClass("clickable-phase");
    winnerCard.addClass("flipped roulette-winner");

    playRMSnd(`${RollmateAssets.sounds.revealEx}`);

    winnerCard
      .find(".card-tilt-wrapper")
      .css({ transform: "rotate(0deg)", transition: "transform 0.3s ease" });

    let winName = window.formatActorName(winnerCard.data("orig-name"));
    winnerCard.find(".text-info, .immersive-name-tag").text(winName);
    winnerCard
      .find(".text-info, .immersive-name-tag, .gm-hidden-card-overlay")
      .css("display", "");
    winnerCard
      .find(".text-info, .immersive-name-tag, .gm-hidden-card-overlay")
      .css("opacity", 1);

    let imgWrap = winnerCard.find(".cc-img-wrap");
    let realSrc = winnerCard.data("orig-img");
    winnerCard.find(".portrait-img").attr("src", realSrc);

    imgWrap.append(`<div class="nova-explosion"></div>`);
    imgWrap.append(`<div class="glass-shimmer"></div>`);

    if (game.user.isGM) {
      view.find("#end-btn").removeClass("hidden");
    }
  }
};

// ── Roll execution ────────────────────────────────────────────────────────
async function performRoll(actorId, skillKey, dc) {
  const actor = game.actors.get(actorId);
  if (!actor) return;
  const activeCheck = canvas.scene.getFlag(
    RollmateFlags.scope,
    RollmateFlags.checkKey,
  );
  const pData = activeCheck.participants[actorId];

  let roll;
  let msg;

  const safeMod = (val) => {
    if (val && typeof val === "object") {
      if (val.total !== undefined) return Number(val.total) || 0;
      if (val.value !== undefined) return Number(val.value) || 0;
      if (val.mod !== undefined) return Number(val.mod) || 0;
      return 0;
    }
    let n = Number(val);
    return isNaN(n) ? 0 : n;
  };

  let dummyNode = document.createElement("button");
  let dummyEvent =
    typeof MouseEvent !== "undefined"
      ? new MouseEvent("click", { bubbles: true, cancelable: true })
      : new Event("click");
  Object.defineProperty(dummyEvent, "target", { value: dummyNode });
  Object.defineProperty(dummyEvent, "currentTarget", { value: dummyNode });

  try {
    if (_rmCtx().activeSystem === "dnd5e") {
      const advMode = activeCheck.advMode || "normal";
      const abilityKey = pData.abilityKey;
      const rollCategory = pData.rollCategory || "skills";
      const isV3 =
        game.system.id === "dnd5e" &&
        foundry.utils.isNewerVersion(game.system.version, "2.9.9");

      if (skillKey === "initiative") {
        if (typeof actor.getInitiativeRoll === "function") {
          let initOptions = {
            advantage: advMode === "advantage",
            disadvantage: advMode === "disadvantage",
          };
          roll = await actor.getInitiativeRoll(initOptions);
        } else if (actor.system?.attributes?.init?.roll) {
          let mod = safeMod(
            actor.system.attributes.init.total ??
              actor.system.attributes.init.mod,
          );
          let formula = "1d20";
          if (advMode === "advantage") formula = "2d20kh";
          if (advMode === "disadvantage") formula = "2d20kl";
          roll = new Roll(`${formula} + ${mod}`);
        } else {
          let mod = safeMod(actor.system?.attributes?.init?.mod);
          let formula =
            advMode === "advantage"
              ? "2d20kh"
              : advMode === "disadvantage"
                ? "2d20kl"
                : "1d20";
          roll = new Roll(`${formula} + ${mod}`);
        }

        if (!roll.total) await roll.evaluate({ async: true });
        if (game.combat) {
          let combatants = game.combat.combatants.filter(
            (c) => c.actorId === actor.id,
          );
          for (let c of combatants)
            await game.combat.setInitiative(c.id, roll.total);
        }
      } else if (
        skillKey === "flat_straight" ||
        rollCategory === "flat" ||
        pData.type === "flat"
      ) {
        let formula = "1d20";
        if (advMode === "advantage") formula = "2d20kh";
        if (advMode === "disadvantage") formula = "2d20kl";
        roll = new Roll(formula);
        await roll.evaluate({ async: true });
        let flavorName = RollmateLang.t("flat_straight");
        await roll.toMessage({
          speaker: ChatMessage.getSpeaker({ actor: actor }),
          flavor: `<strong>${flavorName}</strong>`,
        });
      } else {
        let config = {
          advantage: advMode === "advantage",
          disadvantage: advMode === "disadvantage",
          normal: advMode === "normal",
          fastForward: true,
          event: dummyEvent,
        };
        let dialog = { configure: false };
        let message = { create: true };

        if (skillKey === "flat_death") {
          if (typeof actor.rollDeathSave === "function") {
            msg = await actor.rollDeathSave(config, dialog, message);
          } else if (actor.system?.attributes?.death) {
            msg = await actor.system.attributes.death.roll(config);
          }
        } else if (rollCategory === "saves") {
          if (typeof actor.rollSave === "function") {
            msg = await actor.rollSave(
              { ability: skillKey, ...config },
              dialog,
              message,
            );
          } else if (typeof actor.rollAbilitySave === "function") {
            if (isV3) {
              config.ability = skillKey;
              msg = await actor.rollAbilitySave(config, dialog, message);
            } else {
              msg = await actor.rollAbilitySave(skillKey, config);
            }
          } else if (actor.system?.abilities?.[skillKey]?.rollSave) {
            msg = await actor.system.abilities[skillKey].rollSave(config);
          } else {
            let mod = safeMod(actor.system?.abilities?.[skillKey]?.save);
            msg = new Roll(`1d20 + ${mod}`).evaluate({ async: true });
          }
        } else if (rollCategory === "abilities") {
          if (typeof actor.rollAbilityTest === "function") {
            msg = await actor.rollAbilityTest(
              { ability: skillKey, ...config },
              dialog,
              message,
            );
          } else if (typeof actor.rollAbilityCheck === "function") {
            if (isV3) {
              config.ability = skillKey;
              msg = await actor.rollAbilityCheck(config, dialog, message);
            } else {
              msg = await actor.rollAbilityCheck(skillKey, config);
            }
          } else if (actor.system?.abilities?.[skillKey]?.roll) {
            msg = await actor.system.abilities[skillKey].roll(config);
          } else {
            let mod = safeMod(actor.system?.abilities?.[skillKey]?.mod);
            msg = new Roll(`1d20 + ${mod}`).evaluate({ async: true });
          }
        } else {
          if (typeof actor.rollSkill === "function") {
            if (isV3 || typeof actor.rollAbilityTest === "function") {
              config.skill = skillKey;
              if (abilityKey) config.ability = abilityKey;
              msg = await actor.rollSkill(config, dialog, message);
            } else {
              if (abilityKey) config.ability = abilityKey;
              msg = await actor.rollSkill(skillKey, config);
            }
          } else if (actor.system?.skills?.[skillKey]?.roll) {
            if (abilityKey) config.ability = abilityKey;
            msg = await actor.system.skills[skillKey].roll(config);
          } else {
            let mod = safeMod(actor.system?.skills?.[skillKey]?.total);
            msg = new Roll(`1d20 + ${mod}`).evaluate({ async: true });
          }
        }
        roll = msg instanceof Roll ? msg : msg?.rolls?.[0] || msg?.roll;
        if (!roll && Array.isArray(msg) && msg[0] instanceof Roll)
          roll = msg[0];
      }

      if (!roll) {
        let f =
          advMode === "advantage"
            ? "2d20kh"
            : advMode === "disadvantage"
              ? "2d20kl"
              : "1d20";
        roll = new Roll(f);
        await roll.evaluate({ async: true });
        await roll.toMessage({
          speaker: ChatMessage.getSpeaker({ actor: actor }),
          flavor: `<strong>${pData.skillLabel}</strong>`,
        });
      }
    } else if (_rmCtx().activeSystem === "pf2e") {
      if (skillKey === "initiative") {
        if (actor.initiative && typeof actor.initiative.roll === "function") {
          msg = await actor.initiative.roll({
            event: dummyEvent,
            skipDialog: true,
          });
        } else if (actor.system?.attributes?.initiative?.roll) {
          msg = await actor.system.attributes.initiative.roll({
            event: dummyEvent,
            skipDialog: true,
          });
        } else {
          let mod = safeMod(
            actor.system?.attributes?.initiative?.totalModifier,
          );
          roll = new Roll(`1d20 + ${mod}`);
          await roll.evaluate({ async: true });
          if (game.combat) {
            let combatants = game.combat.combatants.filter(
              (c) => c.actorId === actor.id,
            );
            for (let c of combatants)
              await game.combat.setInitiative(c.id, roll.total);
          }
        }
      } else if (skillKey.startsWith("flat_")) {
        if (
          skillKey === "flat_recovery" &&
          typeof actor.rollRecovery === "function"
        ) {
          msg = await actor.rollRecovery({ event: dummyEvent });
        } else {
          roll = new Roll("1d20");
          await roll.evaluate({ async: true });
          let flavorName =
            skillKey === "flat_recovery"
              ? RollmateLang.t("flat_recovery")
              : RollmateLang.t("tab_flat");
          await roll.toMessage({
            speaker: ChatMessage.getSpeaker({ actor: actor }),
            flavor: `<strong>${flavorName}</strong>`,
          });
        }
      } else {
        let rollTarget;
        if (skillKey === "perception")
          rollTarget = actor.perception || actor.system.attributes.perception;
        else if (["fortitude", "reflex", "will"].includes(skillKey))
          rollTarget = actor.saves[skillKey];
        else rollTarget = actor.skills[skillKey];

        if (rollTarget && typeof rollTarget.roll === "function") {
          msg = await rollTarget.roll({ event: dummyEvent, skipDialog: true });
        }

        if (!msg) {
          roll = new Roll("1d20");
          await roll.evaluate({ async: true });
          await roll.toMessage({
            speaker: ChatMessage.getSpeaker({ actor: actor }),
            flavor: `<strong>${pData.skillLabel}</strong>`,
          });
        }
      }
      if (msg) roll = msg instanceof Roll ? msg : msg?.rolls?.[0] || msg?.roll;
    }

    if (!roll) return;
    const total = roll.total;
    const d20 =
      roll.dice.find((d) => d.faces === 20)?.total || roll.terms[0].total;

    if (window.rmActive3DDice[actorId]) {
      window.rmActive3DDice[actorId].throw();
      window.rmActive3DDice[actorId].setResult(d20);
    }

    let degree = 1;
    if (_rmCtx().activeSystem === "dnd5e") {
      if (skillKey === "initiative") degree = -1;
      else {
        degree = total >= dc ? 2 : 1;
        if (d20 === 20) degree = 3;
        else if (d20 === 1) degree = 0;
      }
    } else {
      if (skillKey === "initiative") degree = -1;
      else {
        if (total >= dc + 10) degree = 3;
        else if (total >= dc) degree = 2;
        else if (total <= dc - 10) degree = 0;
        if (d20 === 20) degree = Math.min(3, degree + 1);
        else if (d20 === 1) degree = Math.max(0, degree - 1);
      }
    }

    let isNat20 = d20 === 20;
    let isNat1 = d20 === 1;

    let finalDegree = degree;
    let finalColor =
      ["#FF0000", "#FF8800", "#00FF00", "#0088ff"][degree] || "#ffffff";
    let finalText =
      degree === -1
        ? RollmateLang.t("init_text")
        : [
            RollmateLang.t("result_crit_fail"),
            RollmateLang.t("result_fail"),
            RollmateLang.t("result_succ"),
            RollmateLang.t("result_crit_succ"),
          ][degree];
    let cssBase =
      degree === -1
        ? ""
        : ["crit-fail", "failure", "success", "crit-success"][degree];

    let resData = {
      total,
      d20,
      degree: finalDegree,
      isNat20,
      isNat1,
      timestamp: Date.now(),
    };

    if (skillKey === "initiative") {
      if (d20 <= 5) {
        resData.color = "#ff0000";
        resData.cssClass = "init-tier-1 init-glow";
        resData.windColor = "rgba(255,0,0,1)";
        resData.windSpeed = "1.5s";
      } else if (d20 <= 10) {
        resData.color = "#ff8800";
        resData.cssClass = "init-tier-2 init-glow";
        resData.windColor = "rgba(255,136,0,1)";
        resData.windSpeed = "1.0s";
      } else if (d20 <= 15) {
        resData.color = "#00ff00";
        resData.cssClass = "init-tier-3 init-glow";
        resData.windColor = "rgba(0,255,0,1)";
        resData.windSpeed = "0.6s";
      } else if (d20 <= 19) {
        resData.color = "#0088ff";
        resData.cssClass = "init-tier-4 init-glow";
        resData.windColor = "rgba(0,136,255,1)";
        resData.windSpeed = "0.3s";
      } else {
        resData.color = "#FFD700";
        resData.cssClass = "init-tier-5 init-glow nat-20-effect";
        resData.windColor = "#FFD700";
        resData.windSpeed = "0.15s";
        resData.isNat20 = true;
      }
      if (d20 === 1) {
        resData.isNat1 = true;
        resData.color = "#b055ff";
        resData.cssClass = "nat1-effect";
      }
      resData.text = RollmateLang.t("init_text");
    } else {
      if (isNat20) {
        finalDegree = 3;
        finalColor = "#FFD700";
        finalText = RollmateLang.t("result_crit_succ");
        cssBase = "crit-success nat-20-effect";
      } else if (isNat1) {
        finalDegree = 0;
        finalColor = "#b055ff";
        finalText = RollmateLang.t("result_crit_fail");
        cssBase = "crit-fail nat1-effect";
      }
      if (finalDegree === 0 && !isNat1) {
        finalColor = "#8a0303";
      }

      resData.degree = finalDegree;
      resData.color = finalColor;
      resData.text = finalText;
      resData.cssClass = cssBase;
    }

    await actor.setFlag(RollmateFlags.scope, RollmateFlags.resultKey, {
      status: "rolling",
      d20: d20,
      timestamp: Date.now(),
    });

    // Die Zeit bis zur Aufdeckung wird dynamisch um die Queue-Position verlängert
    let queueDelay = 0;
    if (window.rmThrowQueue && window.rmThrowQueue.length > 0) {
      queueDelay = window.rmThrowQueue.length * 500;
    }

    // Warte, bis der Würfel real gerollt und gesettled ist (etwas kürzer für snappiness)
    setTimeout(async () => {
      resData.status = "done";
      await actor.setFlag(
        RollmateFlags.scope,
        RollmateFlags.resultKey,
        resData,
      );
    }, 2800 + queueDelay);
  } catch (err) {
    console.error("Rollmate Universal Roll Error: ", err);
  }
}

// ==========================================
// --- ANIMIERE KARTEN ERGEBNIS ---
// ==========================================

// ── Card result animation ─────────────────────────────────────────────────
function animateCardResult(actorId, result) {
  const view = $("#rollmate-universal-overlay");
  if (view.length === 0) return;
  const card = view.find(`.cc-portrait-card[data-id="${actorId}"]`);
  if (card.length === 0 || card.hasClass("rolled")) return;

  const activeCheck = canvas.scene.getFlag(
    RollmateFlags.scope,
    RollmateFlags.checkKey,
  );
  const pData = activeCheck.participants[actorId];

  // "show-result-colors" entfernen falls noch vorhanden
  card.removeClass(
    "selectable locked can-roll crit-fail crit-success failure success init-glow init-tier-1 init-tier-2 init-tier-3 init-tier-4 init-tier-5 nat-20-effect nat1-effect is-rolling show-result-colors",
  );
  card
    .find(
      ".glass-shimmer, .magic-explosion, .dice-particle, .wind-line, .gold-sparkle, .blood-drop, .q-mark, .skull-cloud, .skull, .nova-explosion",
    )
    .remove();

  const area = card.find(".cc-result-area");
  const fx = card.find(".fx-container");
  const imgWrap = card.find(".cc-img-wrap");
  const skillIcon = card.find(".cc-skill-icon");
  const skillLabel = card.find(".cc-skill-label");

  area.empty();

  setTimeout(() => {
    if (result.degree === 3 || result.isNat20) {
      playRMSnd(`${RollmateAssets.sounds.krit}`);
    } else if (result.degree === 0 || result.isNat1) {
      playRMSnd(`${RollmateAssets.sounds.fail}`);
    } else {
      playRMSnd(`${RollmateAssets.sounds.reveal}`);
    }

    card.attr("data-total", result.total);
    card.attr("data-d20", result.d20);

    imgWrap[0].style.setProperty("--flash-color", result.color);
    imgWrap.addClass("flash-effect");

    // --- NEU: FARBIGES LEUCHTEN FÜR RAHMEN & NAME ANWENDEN ---
    card[0].style.setProperty("--result-color", result.color);
    card.addClass("show-result-colors");

    if (_rmCtx().userPerf !== "min") {
      imgWrap.append(`<div class="glass-shimmer"></div>`);
      imgWrap.append(
        `<div class="magic-explosion" style="--flash-color: ${result.color}; display: block;"></div>`,
      );
    }

    let particleHtml = "";
    let pCount =
      _rmCtx().userPerf === "min" ? 0 : _rmCtx().userPerf === "mid" ? 10 : 20;
    for (let i = 0; i < pCount; i++) {
      let angle = Math.random() * Math.PI * 2;
      let dist = 60 + Math.random() * 80;
      let tx = Math.cos(angle) * dist;
      let ty = Math.sin(angle) * dist;
      particleHtml += `<div class="dice-particle" style="--tx:${tx}px; --ty:${ty}px; --flash-color:${result.color};"></div>`;
    }

    const isOwner = game.actors.get(actorId)?.isOwner || isGM;
    const rerollBtn = isOwner
      ? `<i class="fas fa-redo-alt cc-reroll-btn" title="Repeat" data-id="${actorId}"></i>`
      : ``;

    if (pData.visibility === "hidden" && result.degree !== -1) {
      let gmText = isGM
        ? `<div class="gm-hidden-result">(${result.text}: ${result.total})</div>`
        : ``;
      area.append(
        `${particleHtml}<div class="hidden-icon number-illuminate" style="margin-top:20px;">?</div>${gmText}${rerollBtn}`,
      );
      if (_rmCtx().userPerf !== "min")
        fx.html(
          `<div class="q-mark" style="top:20%; left:30%; animation-delay:0s;">?</div><div class="q-mark" style="top:50%; left:70%; animation-delay:0.5s;">?</div><div class="q-mark" style="top:35%; left:45%; animation-delay:1s;">?</div>`,
        );
      card.addClass("rolled");
    } else if (
      pData.visibility === "passfail" &&
      !isGM &&
      result.degree !== -1
    ) {
      let icon = result.degree >= 2 ? "✔" : "✖";
      area.append(
        `${particleHtml}<div class="pf-icon number-illuminate pulsing ${result.isNat20 ? "gold-text-glow" : ""} ${result.isNat1 ? "nat-1-glow" : ""}" style="color: ${result.color}; margin-top:15px;">${icon}</div><div class="cc-degree-text pulsing ${result.isNat20 ? "gold-text-glow" : ""} ${result.isNat1 ? "nat-1-glow" : ""}" style="color: ${result.color};">${result.text}</div>${rerollBtn}`,
      );
      skillIcon.css("color", result.color);
      skillLabel.css("color", result.color);
      card.addClass(result.cssClass).addClass("rolled");

      if (_rmCtx().userPerf !== "min") {
        if (result.isNat1) {
          let skulls = "";
          let skullCount = _rmCtx().userPerf === "mid" ? 5 : 10;
          for (let i = 0; i < skullCount; i++)
            skulls += `<i class="fas fa-skull skull" style="top:${Math.random() * 80 + 10}%; left:${Math.random() * 80 + 10}%; animation-delay:${Math.random() * 2}s"></i>`;
          imgWrap.append(`<div class="skull-cloud">${skulls}</div>`);
        } else {
          let goldCount = _rmCtx().userPerf === "mid" ? 20 : 40;
          let bloodCount = _rmCtx().userPerf === "mid" ? 15 : 30;
          if (result.degree === 3 && !result.isNat20)
            for (let i = 0; i < goldCount; i++)
              fx.append(
                `<div class="gold-sparkle" style="left:${Math.random() * 100}%; animation-delay:${Math.random()}s; box-shadow: 0 0 8px #FFD700; background: #fff7cc;"></div>`,
              );
          if (result.degree === 0 && !result.isNat1)
            for (let i = 0; i < bloodCount; i++)
              fx.append(
                `<div class="blood-drop" style="left:${Math.random() * 100}%; animation-delay:${Math.random()}s"></div>`,
              );
        }
      }
    } else {
      area.append(
        `${particleHtml}<div class="cc-number-display number-illuminate pulsing ${result.isNat20 ? "gold-text-glow" : ""} ${result.isNat1 ? "nat-1-glow" : ""}" style="color: ${result.color};">${result.total}</div><div class="cc-degree-text pulsing ${result.isNat20 ? "gold-text-glow" : ""} ${result.isNat1 ? "nat-1-glow" : ""}" style="color: ${result.color};">${result.text}</div><div class="cc-d20-display ${result.isNat20 ? "gold-text-glow" : ""} ${result.isNat1 ? "nat-1-glow" : ""}">🎲 ${result.d20}</div>${rerollBtn}`,
      );
      skillIcon.css("color", result.color);
      skillLabel.css("color", result.color);
      card.addClass(result.cssClass).addClass("rolled");

      if (_rmCtx().userPerf !== "min") {
        if (result.isNat1) {
          let skulls = "";
          let skullCount = _rmCtx().userPerf === "mid" ? 5 : 10;
          for (let i = 0; i < skullCount; i++)
            skulls += `<i class="fas fa-skull skull" style="top:${Math.random() * 80 + 10}%; left:${Math.random() * 80 + 10}%; animation-delay:${Math.random() * 2}s"></i>`;
          imgWrap.append(`<div class="skull-cloud">${skulls}</div>`);
        } else {
          let goldCount = _rmCtx().userPerf === "mid" ? 20 : 40;
          let bloodCount = _rmCtx().userPerf === "mid" ? 15 : 30;
          let superGoldCount = _rmCtx().userPerf === "mid" ? 40 : 80;
          let windCount = _rmCtx().userPerf === "mid" ? 10 : 20;

          if (result.degree === 3 && !result.isNat20)
            for (let i = 0; i < goldCount; i++)
              fx.append(
                `<div class="gold-sparkle" style="left:${Math.random() * 100}%; animation-delay:${Math.random()}s; box-shadow: 0 0 8px #FFD700; background: #fff7cc;"></div>`,
              );
          if (result.degree === 0 && !result.isNat1)
            for (let i = 0; i < bloodCount; i++)
              fx.append(
                `<div class="blood-drop" style="left:${Math.random() * 100}%; animation-delay:${Math.random()}s"></div>`,
              );
          if (result.isNat20)
            for (let i = 0; i < superGoldCount; i++)
              fx.append(
                `<div class="gold-sparkle" style="left:${Math.random() * 100}%; top:${Math.random() * 100}%; width: ${Math.random() * 8 + 4}px; height: ${Math.random() * 8 + 4}px; animation-delay:${Math.random()}s; animation-duration: ${Math.random() * 1 + 0.5}s; box-shadow: 0 0 20px #FFD700; background: #FFF; position: absolute;"></div>`,
              );
          if (result.cssClass && result.cssClass.includes("init-glow"))
            for (let i = 0; i < windCount; i++) {
              let left = Math.random() * 100;
              let delay = Math.random() * 0.4;
              fx.append(
                `<div class="wind-line" style="left:${left}%; animation-delay:${delay}s; --wind-color: ${result.windColor}; --wind-speed: ${result.windSpeed};"></div>`,
              );
            }
        }
      }
    }

    updateInitOrder();
    window.fitTextToContainer(".cc-skill-info-wrap", ".cc-skill-label", 0.4);
  }, 100); // Kürzere Verzögerung für schnelleres visuelles Feedback
}

// Build-stage rendering lives in scripts/ui-handler.js.
