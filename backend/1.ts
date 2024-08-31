import { launch, getStream, wss } from "puppeteer-stream";
import fs from "fs";
import { exec } from "child_process";
import path from "path";

const webmFile = path.join(__dirname, "test1.webm");
const mp4File = path.join(__dirname, "test1.mp4");
const gifFile = path.join(__dirname, "test1.gif");

let startTime: number;
let recordingStarted = false;

function execPromise(command: string): Promise<void> {
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

async function convertAndAddMetadata(
  inputFile: string,
  outputMp4: string,
  outputGif: string
): Promise<void> {
  const mp4Command = `ffmpeg -i ${inputFile} -c:v libx264 -b:v 5M -maxrate 5M -bufsize 10M -vf "scale=1920:1080,format=yuv420p,fps=60" -c:a aac -metadata title="Sample Video" -metadata description="This is a sample video with metadata" ${outputMp4}`;
  console.log(`Executing MP4 command: ${mp4Command}`);
  await execPromise(mp4Command);

  const gifCommand = `ffmpeg -i ${inputFile} -vf "fps=10,scale=1920:-1:flags=lanczos" -c:v gif -f gif ${outputGif}`;
  console.log(`Executing GIF command: ${gifCommand}`);
  await execPromise(gifCommand);
}

function logTimestamp(label: string): void {
  const currentTime = Date.now();
  const elapsed = (currentTime - startTime) / 1000;
  console.log(`${label}: ${elapsed.toFixed(2)} seconds`);
}

async function test(): Promise<void> {
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
  await page.goto(
    "https://embed-staging.getsmartcue.com/IHL9GNT9/export?force_autoplay=1&force_voiceover=1&no_loop=1&force_autoplay=1"
  );

//   async function waitForPlayIcon(): Promise<void> {
//     const maxRetries = 10; // Maximum number of retries
//     let retries = 0;

//     while (retries < maxRetries) {
//       try {
//         const iconExists = await page.evaluate(() => {
//           return !!document.getElementById("play-icon");
//         });

//         if (iconExists) {
//           console.log("Play icon appeared. Starting recording...");
//           startRecording();
//           break;
//         } else {
//           retries++;
//           console.log(
//             `Retry ${retries}/${maxRetries}: Play icon not found, retrying...`
//           );
//           await delay(1000);
//         }
//       } catch (e) {
//         retries++;
//         console.log(
//           `Retry ${retries}/${maxRetries}: An error occurred, retrying...`,
//           e
//         );
//       }
//     }

//     if (retries >= maxRetries) {
//       console.log(
//         "Play icon did not appear within the retry limit. Exiting..."
//       );
//       await browser.close();
//     }
//   }

//   function delay(ms: number): Promise<void> {
//     return new Promise((resolve) => setTimeout(resolve, ms));
//   }

  async function startRecording(): Promise<void> {
    if (recordingStarted) return;
    recordingStarted = true;
    startTime = Date.now();
    logTimestamp("Recording started");

    const stream = await getStream(page, {
      audio: true,
      video: true,
      mimeType: "video/webm;codecs=vp9,opus",
    });

    const streamChunks: Buffer[] = [];

    stream.on("data", (data: Buffer) => {
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

      //   fs.unlinkSync(webmFile);
    });

    async function waitForAutoplayEndAndStop(): Promise<void> {
      const endSuggestions = await page.waitForSelector("#autoplay-ended", {
        timeout: 0
      });
      logTimestamp(
        "Autoplay ended detected. Stopping recording after 250 ms..."
      );
      if (endSuggestions) {
        setTimeout(async () => {
          await stream.destroy();
          logTimestamp("Finished recording due to video end or suggestions.");
          await browser.close();
          (await wss).close();
        }, 1000);
      } else {
        setTimeout(waitForAutoplayEndAndStop, 1000);
      }
    }

    waitForAutoplayEndAndStop();
  }

  async function clickAutoplayButton(): Promise<void> {
    try {
      await page.waitForSelector("#autoplay-button", {
        visible: true,
        timeout: 0,
      });
      console.log("Autoplay button appeared. Clicking...");
      await page.click("#autoplay-button");
    } catch (e) {
      console.log("Autoplay button did not appear. Exiting...");
      await browser.close();
      return;
    }
    startRecording();
    // waitForPlayIcon();
  }

  clickAutoplayButton();
}

test();
