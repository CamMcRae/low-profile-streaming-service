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

// modules
const {
  prompt,
  getFileName
} = require("./util");

const beginStream = require('./stream.js')

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
      ingestServer = require("./ingest_servers.json").youtube;
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