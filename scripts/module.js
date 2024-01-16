/* globals
canvas,
game,
Hooks,
ui
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { Settings } from "./settings.js";
import { initializePatching, PATCHER } from "./patching.js";
import { MODULE_ID } from "./const.js";
import { iterateGridUnderLine } from "./util.js";
import { registerGeometry } from "./geometry/registration.js";

// Pathfinding
import { BorderTriangle, BorderEdge } from "./pathfinding/BorderTriangle.js";
import { Pathfinder } from "./pathfinding/pathfinding.js";
import { BreadthFirstPathSearch, UniformCostPathSearch, GreedyPathSearch, AStarPathSearch } from "./pathfinding/algorithms.js";
import { PriorityQueueArray } from "./pathfinding/PriorityQueueArray.js";
import { PriorityQueue } from "./pathfinding/PriorityQueue.js";
import { benchPathfinding } from "./pathfinding/benchmark.js";

// Wall updates for pathfinding
import { SCENE_GRAPH, WallTracer, WallTracerEdge, WallTracerVertex } from "./pathfinding/WallTracer.js";

Hooks.once("init", function() {
  // Cannot access localization until init.
  PREFER_TOKEN_CONTROL.title = game.i18n.localize(PREFER_TOKEN_CONTROL.title);
  registerGeometry();
  game.modules.get(MODULE_ID).api = {
    iterateGridUnderLine,
    PATCHER,

    // Pathfinding
    pathfinding: {
      BorderTriangle,
      BorderEdge,
      Pathfinder,
      BreadthFirstPathSearch,
      UniformCostPathSearch,
      GreedyPathSearch,
      AStarPathSearch,
      PriorityQueueArray,
      PriorityQueue,
      benchPathfinding,
      SCENE_GRAPH
    },

    WallTracer, WallTracerEdge, WallTracerVertex
  };
});

// Setup is after init; before ready.
// setup is called after settings and localization have been initialized,
// but before entities, packs, UI, canvas, etc. has been initialized
Hooks.once("setup", function() {
  Settings.registerKeybindings(); // Should go before registering settings, so hotkey group is defined
  Settings.registerAll();
  initializePatching();
});

// For https://github.com/League-of-Foundry-Developers/foundryvtt-devMode
Hooks.once("devModeReady", ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag(MODULE_ID);
});


// Add Token lock button to token controls to use token elevation when using the ruler.
const PREFER_TOKEN_CONTROL = {
  name: Settings.KEYS.CONTROLS.PREFER_TOKEN_ELEVATION,
  title: `${MODULE_ID}.controls.${Settings.KEYS.CONTROLS.PREFER_TOKEN_ELEVATION}.name`,
  icon: "fa-solid fa-user-lock",
  toggle: true
};

// Add pathfinding button to token controls.
const PATHFINDING_CONTROL = {
  name: Settings.KEYS.CONTROLS.PATHFINDING,
  title: `${MODULE_ID}.controls.${Settings.KEYS.CONTROLS.PATHFINDING}.name`,
  icon:"fa-solid fa-route",
  toggle: true
};

// Render the pathfinding control.
// Render the prefer token control if that setting is enabled.
Hooks.on("getSceneControlButtons", controls => {
  if ( !canvas.scene ) return;
  const tokenTools = controls.find(c => c.name === "token");
  tokenTools.tools.push(PATHFINDING_CONTROL);
  if ( Settings.get(Settings.KEYS.CONTROLS.PREFER_TOKEN_ELEVATION) ) tokenTools.tools.push(PREFER_TOKEN_CONTROL);
});

Hooks.on("canvasInit", function(_canvas) {
  updatePreferTokenControl();
  updatePathfindingControl();
  ui.controls.render(true);
});

Hooks.on("renderSceneControls", async function(controls, _html, _data) {
  // Monitor enabling/disabling of custom controls.
  if ( controls.activeControl !== "token" ) return;

  if ( Settings.get(Settings.KEYS.CONTROLS.PREFER_TOKEN_ELEVATION) ) {
    const toggle = controls.control.tools.find(t => t.name === Settings.KEYS.CONTROLS.PREFER_TOKEN_ELEVATION);
    // Should always find a toggle, but...
    if ( toggle ) await Settings.set(Settings.KEYS.CONTROLS.PREFER_TOKEN_ELEVATION_CURRENT_VALUE, toggle.active);
  }

  const toggle = controls.control.tools.find(t => t.name === Settings.KEYS.CONTROLS.PATHFINDING);
  if ( toggle ) await Settings.set(Settings.KEYS.CONTROLS.PATHFINDING, toggle.active);
});

function updatePreferTokenControl(enable) {
  enable ??= Settings.get(Settings.KEYS.CONTROLS.PREFER_TOKEN_ELEVATION);
  const tokenTools = ui.controls.controls.find(c => c.name === "token");
  const index = tokenTools.tools.findIndex(b => b.name === Settings.KEYS.CONTROLS.PREFER_TOKEN_ELEVATION);
  if ( enable && !~index ) tokenTools.tools.push(PREFER_TOKEN_CONTROL);
  else if ( ~index ) tokenTools.tools.splice(index, 1);
  PREFER_TOKEN_CONTROL.active = Settings.get(Settings.KEYS.CONTROLS.PREFER_TOKEN_ELEVATION_CURRENT_VALUE);
  // Do in the hook instead to avoid repetition: ui.controls.render(true);
}

function updatePathfindingControl(enable) {
  enable ??= Settings.get(Settings.KEYS.CONTROLS.PATHFINDING);
  const tokenTools = ui.controls.controls.find(c => c.name === "token");
  const index = tokenTools.tools.findIndex(b => b.name === Settings.KEYS.CONTROLS.PATHFINDING);
  if ( !~index ) tokenTools.tools.push(PATHFINDING_CONTROL);
  PATHFINDING_CONTROL.active = Settings.get(Settings.KEYS.CONTROLS.PATHFINDING);
  // Do in the hook instead to avoid repetition: ui.controls.render(true);
}

