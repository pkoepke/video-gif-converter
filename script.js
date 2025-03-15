// From the actual documentation
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

ffmpeg = new FFmpeg();
//ffmpeg.on("log", ({ message }) => { console.log(message); }); // If ffmpeg calls its log method, log that to the console.
ffmpeg.on("log", getVideoFps); // ffmpeg.wasm doesn't provide a good way to get FPS, so we have to parse its logs for that info.
ffmpeg.on("progress", ({ progress, time }) => { document.getElementById('progress').textContent = `${(progress * 100).toFixed(2)} %, time: ${(time / 1000000).toFixed(2)}s`; }); // Show progress on the page.

import mediaInfoFactory from 'mediainfo.js';
let mediainfo = '';

(async () => {
  const baseURL = 'https://unpkg.com/@ffmpeg/core/dist/umd'

  /*  const baseURL = './';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}ffmpeg-core.wasm`, 'application/wasm')
  });*/

  //const baseURL = "."

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  //const mediainfo = await mediaInfoFactory();
  mediainfo = await mediaInfoFactory(({
    locateFile: function (path, scriptDirectory) {
      // Customize the path here.
      return "./MediaInfoModule.wasm"; // Replace with your actual path.
    }
  }));

})()


const transcode = async () => {

  const file = await document.getElementById("fileInput").files[0] ? await document.getElementById("fileInput").files[0] : await processFetchedFile(); // With a default file for easy testing.
  //const file = await document.getElementById("fileInput").files[0];
  if (!file) { return }
  const { name } = file;
  const outputFileType = document.getElementById('outputType').value;
  document.getElementById('output').firstChild.replaceWith(document.createElement('span'));
  await ffmpeg.writeFile(name, await fetchFile(file));
  document.getElementById('progress').textContent = 'Transcoding started';
  console.log(`${new Date().toLocaleTimeString()} Transcoding started`);
  await ffmpeg.exec(['-i', name, '-pix_fmt', 'yuv420p', `output.${outputFileType}`]); // Adding -pix_fmt yuv420p so Firefox can play the video.
  document.getElementById('progress').textContent = 'Transcoding ended';
  console.log(`${new Date().toLocaleTimeString()} Transcoding ended`);
  const data = await ffmpeg.readFile(`output.${outputFileType}`);
  if (outputFileType == 'gif') {
    const imgTag = document.createElement('img');
    imgTag.src = URL.createObjectURL(new Blob([data.buffer], { type: 'image/gif' }));
    imgTag.id = 'outputImg';
    document.getElementById('output').firstChild.replaceWith(imgTag);
  } else {
    const sourceTag = document.createElement('source');
    sourceTag.src = URL.createObjectURL(new Blob([data.buffer], { type: `video/${outputFileType}` }));
    const videoTag = document.createElement('video');
    videoTag.setAttribute('controls', '');
    videoTag.appendChild(sourceTag);
    videoTag.id = 'outputVideo';
    document.getElementById('output').firstChild.replaceWith(videoTag);
  }
}

async function createFileFromUrl(url, filename, mimeType) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new File([blob], filename, { type: mimeType });
  } catch (error) {
    console.error("Error fetching or creating file:", error);
    return null;
  }
}

// For testing only - useful if I want to have a default video so I don't have to select one every time.
async function processFetchedFile() {
  //const fileUrl = "./thanks-i-hate-it.mp4";
  const fileUrl = "./lindsay-ellis-thanks-i-hate-it-reencoded.mp4";
  const fileName = "thanks-i-hate-it.mp4";
  const fileMimeType = "video/mp4";
  const myFile = await createFileFromUrl(fileUrl, fileName, fileMimeType);
  handleInput(new Event('noFileProvided'), myFile);
  return myFile;
}

const handleInput = (event, file) => { // This can be called either by choosing a file, or by clicking Begin conversion. In the latter case the File parameter will be empty so we'll get the file from the file picker.
  if (!file) { file = document.getElementById('fileInput').files[0]; }
  document.getElementById('output').firstChild.replaceWith(document.createElement('span'));
  if (file.type == 'image/gif') {
    const imgTag = document.createElement('img');
    imgTag.src = URL.createObjectURL(file);
    imgTag.id = 'inputImg';
    imgTag.classList.add('centered');
    imgTag.classList.add('centereText');
    document.getElementById('originalFile').firstChild.replaceWith(imgTag);
  } else {
    const sourceTag = document.createElement('source');
    sourceTag.src = URL.createObjectURL(file);
    const videoTag = document.createElement('video');
    videoTag.setAttribute('controls', '');
    videoTag.appendChild(sourceTag);
    videoTag.id = ('inputVideo');
    videoTag.classList.add('centered');
    videoTag.classList.add('centereText');
    document.getElementById('originalFile').firstChild.replaceWith(videoTag);
    videoTag.addEventListener('loadedmetadata', getInputDetails);
  } 3

}

const getInputDetails = async (e) => {
  const videoTag = e.target;
  document.getElementById('inputLength').textContent = `${videoTag.duration}s`;
  document.getElementById('inputResolution').textContent = `${videoTag.videoHeight} x ${videoTag.videoWidth}`;
}

async function getVideoFps(message) {
  if (message.message.includes("fps,")) {
    let fps = message.message.split(',');
    fps = fps.filter((str) => { return str.includes('fps') });
    console.log(fps);
    document.getElementById('inputFps').textContent = `${fps}`;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('startTranscode').addEventListener('click', transcode);
  document.getElementById('chooseFile').addEventListener('click', () => {
    document.getElementById('fileInput').click();
  });
  document.getElementById('fileInput').addEventListener('change', (e) => { handleInput(e); });
});