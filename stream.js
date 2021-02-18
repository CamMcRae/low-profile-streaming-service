const fs = require("fs");
const readline = require("readline");
const { exec } = require("child_process");

// node packages
const chalk = require("chalk");

// chalk macros
const verb = chalk.green;
const warn = chalk.keyword("orange");
const cerr = chalk.red;

// main streaming function
const beginStream = (_outputString) => {
  // recursively builds the config string as laid out in settings.json
  const constructString = (_obj) => {
    if (typeof _obj == "string") return _obj;
    const entries = Object.keys(_obj);
    let str = "";
    if (entries.length > 0) {
      for (let entry of entries) {
        if (entry.startsWith("//")) continue; // commented out pieces
        if (entry != "&") str += "-"; // entry is empty
        str += entry.split("-").join(" ").split("&")[0]; // strip everything after '&'
        str += ` ${constructString(_obj[entry])} `;
      }
    }
    return str.replace(/\ +/g, " ");
  };

  // if custom settings doesnt exist, use defaults
  let json_in;
  if (fs.existsSync("./settings_custom.json")) {
    json_in = require("./settings_custom.json");
  } else {
    json_in = require("./settings_default.json");
  }

  let ff_settings = constructString(json_in) + _outputString;
  console.log(verb(ff_settings));

  // cli stdio
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // start readline and pause when ffmpeg outputs
  const proc = exec(`ffmpeg ${ff_settings}`);

  proc.stdout.on("data", (data) => {
    console.log(cerr(`${data}`));
  });

  proc.stderr.on("data", (data) => {
    console.log(`${data}`);
  });

  proc.on("close", (code) => {
    console.log(warn("FFMPEG Stopped"));
    console.log(`Exit code: ${code}`);
    rl.close();
  });

  // scans for stop
  rl.on("line", (_line) => {
    if (_line == "stop") {
      proc.stdin.write("q");
      console.log(`Stopping FFMPEG process...`);
    } else {
      console.log(`Type stop to end ${flags.file ? "recording" : "streaming"}`);
    }
  });
};

module.exports = beginStream;
