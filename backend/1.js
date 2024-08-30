const { launch, getStream, wss } = require("puppeteer-stream");
const fs = require("fs");

const file = fs.createWriteStream(__dirname + "/test1.webm");

let startTime;

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
  await page.goto("https://youtu.be/aO3BEkFj9As?si=N792dxEKX5tUuMHE");

  const stream = await getStream(page, {
    audio: true,
    video: true,
    mimeType: "video/webm;codecs=vp9,opus",
  });

  stream.on("data", function (data) {
    if (!startTime) {
      startTime = Date.now();
      logTimestamp("First data chunk received");
    }
    file.write(data);
  });

  stream.on("close", () => {
    logTimestamp("Stream closed");
    file.close();
    logTimestamp("File saved")
  });

  async function checkForEndOrSuggestions() {
    const hasSuggestions = await page.evaluate(() => {
      return document.querySelector(".ytp-videowall-still") !== null;
    });

    const isVideoEnded = await page.evaluate(() => {
      const video = document.querySelector("video");
      return video && video.ended;
    });

    if (hasSuggestions || isVideoEnded) {
      setTimeout(async () => {
        await stream.destroy();
        logTimestamp("Finished recording due to video end or suggestions.");
        await browser.close();
        (await wss).close();
      }, 1000); // Ensure there's a small delay before stopping
    } else {
      setTimeout(checkForEndOrSuggestions, 1000);
    }
  }

  checkForEndOrSuggestions();
}

test();
