// default packages
const util = require("util");
const fs = require("fs");
const readline = require("readline");
const path = require("path");
const {
  exec,
  spawn,
  fork
} = require("child_process");

// node packages
const dotenv = require("dotenv").config();
const chalk = require("chalk");
require("json5/lib/register"); // register json5 files

// modules
const {
  prompt,
  getFileName
} = require("./util");

// chalk macros
const verb = chalk.green;
const warn = chalk.keyword("orange");
const cerr = chalk.red;

// cli flags
const flags = {
  verbose: false,
  file: false,
  streamKey: -1,
};

// read cli args on start
(() => {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "-v": // verbose
        flags.verbose = true;
        break;
      case "-f": // file output
        flags.file = true;
        break;
      case "-k": // stream key
        flags.streamKey = args[i++];
        break;
    }
  }
  const str = Object.entries(flags)
    .map((e) => (e[1] ? `${e[0]}: ${e[1]}` : ""))
    .filter(Boolean)
    .join(", ");
  if (str) console.log(warn(`Started process with ${str}`));
})();

const fileOutput = async () => {
  return new Promise(async (resolve, reject) => {
    let dir = await prompt("Save directory (output)?");
    if (!dir) dir = "output";

    let fileName = await prompt("File name?");
    fileName = getFileName(`/${dir}`, `${fileName}.mp4`, true).replace(
      /\\/g,
      "/"
    );
    // remove initial /
    if (fileName.startsWith("/")) {
      fileName = fileName.substr(1);
    }
    console.log(warn(`Output file: ${fileName}`));

    // create output directory
    if (!fs.existsSync(path.join(__dirname, dir))) {
      fs.mkdirSync(dir);
      if (flags.verbose) console.log(verb(`Created directory ${dir}`));
    }

    // create output string
    // let outputSettings = `-f mp4 ${fileName}`
    resolve(fileName);
  });
};

const streamOutput = async () => {
  return new Promise(async (resolve, reject) => {
    // get user inputs
    let ingestServer = {};
    let streamKey = flags.streamKey;

    const res = await prompt("Youtube Ingest Server?");

    if (res && !res.startsWith("y")) {
      ingestServer.main = await prompt("Other Ingest Server (with key)?");
    } else {
      // default to youtube stream
      // get ingest server
      ingestServer = require("./ingest_servers.json5").youtube;
      // get stream key
      if (streamKey == -1) {
        // if no streamkey entered on start
        if (process.env.streamKey) {
          streamKey = process.env.streamKey;
        } else {
          streamKey = await prompt("Enter Stream Key:");
        }
      }
      for (let key in ingestServer) {
        ingestServer[key] = ingestServer[key].replace("%d", streamKey);
      }
    }

    console.log(warn(`Selected ingest servers:\nMain: ${ingestServer.main}\nBackup: ${ingestServer.backup}`));

    // create output string
    let outputSettings = `-f flv ${ingestServer.main}`;
    resolve(outputSettings);
  });
};

// main streaming function
const beginStream = (_outputString) => {
  // recursively builds the config string as laid out in settings.json
  const constructString = (_obj) => {
    if (typeof _obj == "string") {
      const type = _obj.match(/(a|v)\w+_device+/g);
      if (!type) return _obj;
      type.forEach((e) => {
        _obj = _obj.replace(e, `"${require("./user_settings.json")[e]}"`);
      });
      return _obj;
    }
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
  let json_in
  if (fs.existsSync('./settings_custom.json')) {
    json_in = require("./settings_custom.json");
  } else {
    json_in = require("./settings_default.json");
  }

  let ff_settings = constructString(json_in) + _outputString;
  if (flags.verbose) console.log(verb(ff_settings));

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

const start = async () => {
  // if file output wasnt a flag, ask
  if (!flags.file) {
    const res = await prompt("Stream output?");
    if (res && !res.startsWith("y")) {
      console.log(verb("File output selected."));
      flags.file = true;
    } else {
      console.log(verb("Stream output selected."));
    }
  }

  // setup proper service
  const outputString = flags.file ? await fileOutput() : await streamOutput();
  console.log(`Output String: ${outputString}`);
  await prompt(warn(`Press enter to continue`));
  beginStream(outputString);
};

start();