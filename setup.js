// default packages
const util = require("util");
const fs = require("fs");
const readline = require("readline");
const path = require("path");

// node packages
const dotenv = require("dotenv").config();
const chalk = require("chalk");
const sysInfo = require("systeminformation")

// modules
const {
  prompt,
  getFileName
} = require("./util");

// chalk macros
const verb = chalk.green;
const warn = chalk.keyword("orange");
const cerr = chalk.red;

// get display info
const systemSetup = async () => {
  const gInfo = await sysInfo.graphics()
  return gInfo.displays.map((e) => {
    return {
      main: e.main,
      pos: {
        x: e.positionX,
        y: e.positionY
      },
      res: {
        x: e.resolutionX,
        y: e.resolutionY
      }
    }
  })
}

const writeConfig = async (_obj) => {
  let str = Object.entries(_obj)
    .map((e) => (e[1] ? `${e[0]}: ${e[1]}` : ""))
    .filter(Boolean)
    .join("\n  ");
  if (str) console.log(warn(`Config:\n  ${str}`));

  const res = await prompt("Confirm overwrite custom config?")
  let skeleton = require('./settings_default.json')
  skeleton["f-gdigrab"] = _obj
  fs.writeFileSync("./settings_custom.json", JSON.stringify(skeleton), 'utf8');
  console.log(warn("Successfully created config"));
}

const start = async () => {

  let config = require('./settings_setup.json')

  const useDefaults = await prompt("Use default settings?")
  if (useDefaults.startsWith("y")) {
    console.log(warn("Using default settings"));
    config = require('./settings_default.json')["f-gdigrab"]
    writeConfig(config);
    return;
  }

  console.log(warn("Querying displays..."));

  // display queries and selection
  let display = 1;
  let displays = await systemSetup();
  console.log(`Detected ${displays.length} display${displays.length > 1 ? "s:" : ""}`);
  if (displays.length > 1) {
    for (let i = 0; i < displays.length; i++) {
      const d = displays[i]
      console.log(warn(`Display ${i+1}${d.main ? " (main)" : ""}:`));
      console.log(`  Resolution:\n    x: ${d.res.x}\n    y: ${d.res.y}`);
      console.log(`  Position:\n    x: ${d.pos.x}\n    y: ${d.pos.y}`);
    }
    const res = await prompt("Select the display to be recorded:\n")

    if (res <= 0 || res > displays.length) {
      console.log(cerr("Invalid selection, exiting"));
      return
    }
    display = res - 1;
  }

  console.log(warn(`Display ${display + 1} selected`));

  // maybe update to select a portion of the screen
  config.video_size = `${displays[display].res.x}x${displays[display].res.y}`
  config.offset_x = displays[display].pos.x
  config.offset_y = displays[display].pos.y

  // framerate and show region
  config.framerate = await prompt("Framerate (30)?\n")
  const showRegion = await prompt("Show region (n)?\n")
  if (showRegion.startsWith("y")) config.show_region = 1

  // scaled output selection
  const res = await prompt("Scale video output?\n")
  if (res || res.startsWith("y")) {
    const xDim = await prompt("x-axis dimension?\n")
    config.vf = config.vf.replace("%d", xDim)
  } else {
    config.vf = config.vf.replace("%d", "-1")
  }
  writeConfig(config);
}

start()