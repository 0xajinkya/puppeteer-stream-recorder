const { launch, getStream, wss } = require("puppeteer-stream");
const fs = require("fs");
const { exec } = require("child_process");

const webmFile = __dirname + "/test1.webm";
const mp4File = __dirname + "/test1.mp4";
const gifFile = __dirname + "/test1.gif";

let startTime;
let recordingStarted = false;

function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        reject(error);
      } else {
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
        resolve();
      }
    });
  });
}

async function convertAndAddMetadata(inputFile, outputMp4, outputGif) {
  const mp4Command = `ffmpeg -i ${inputFile} -c:v libx264 -b:v 5M -maxrate 5M -bufsize 10M -vf "scale=1920:1080,format=yuv420p,fps=60" -c:a aac -metadata title="Sample Video" -metadata description="This is a sample video with metadata" ${outputMp4}`;
  console.log(`Executing MP4 command: ${mp4Command}`);
  await execPromise(mp4Command);

  const gifCommand = `ffmpeg -i ${inputFile} -vf "fps=10,scale=1920:-1:flags=lanczos" -c:v gif -f gif ${outputGif}`;
  console.log(`Executing GIF command: ${gifCommand}`);
  await execPromise(gifCommand);
}

function logTimestamp(label) {
  const currentTime = Date.now();
  const elapsed = (currentTime - startTime) / 1000;
  console.log(`${label}: ${elapsed.toFixed(2)} seconds`);
}

async function test() {
  const browser = await launch({
    executablePath: "/usr/bin/brave-browser",
    headless: false,
    defaultViewport: {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    },
  });
  const page = await browser.newPage();
  await page.goto("http://localhost:5173");

  if (recordingStarted) return;
  recordingStarted = true;
  startTime = Date.now();
  logTimestamp("Recording started");

  const stream = await getStream(page, {
    audio: true,
    video: true,
    mimeType: "video/webm;codecs=vp9,opus",
  });

  const streamChunks = [];

  stream.on("data", function (data) {
    if (!startTime) {
      startTime = Date.now();
      logTimestamp("First data chunk received");
    }
    streamChunks.push(data);
  });

  stream.on("close", async () => {
    logTimestamp("Stream closed");
    const buffer = Buffer.concat(streamChunks);
    logTimestamp("Starting file save");
    fs.writeFileSync(webmFile, buffer);
    logTimestamp("File save completed");

    await convertAndAddMetadata(webmFile, mp4File, gifFile);
    console.log("Conversion and metadata addition completed");

    fs.unlinkSync(webmFile);
  });

  async function checkForEndOrSuggestions() {
    const endSuggestions = await page.evaluate(() => {
      return !!document.getElementById("complex-div-id");
    });

    console.log(endSuggestions ? "Found" : "Not found");
    if (endSuggestions) {
      setTimeout(async () => {
        await stream.destroy();
        logTimestamp("Finished recording due to video end or suggestions.");
        await browser.close();
        (await wss).close();
      }, 1000);
    } else {
      setTimeout(checkForEndOrSuggestions, 1000);
    }
  }

  checkForEndOrSuggestions();
}

test();
