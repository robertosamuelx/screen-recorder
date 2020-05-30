const videoElement = document.querySelector('video');
const videoSelectBtn = document.getElementById('videoSelectBtn');
const { desktopCapturer , remote} = require('electron');
const { Menu } = remote;
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const recorderTime = document.getElementById('recorderTime');

let time;
stopBtn.disabled = true;
videoSelectBtn.onclick = e => getVideoSources();

async function getVideoSources(){
    const inputSources = await desktopCapturer.getSources({
        types: ['window','screen']
    });

    const videoOptionsMenu = Menu.buildFromTemplate(
        inputSources.map(source => {
            return {
                label: source.name,
                click: () => selectSource(source)
            }
        })
    );

    videoOptionsMenu.popup();
}

let mediaRecorder;
const recordedChunks = [];


async function selectSource(source){
    videoSelectBtn.innerText = source.name;

    const constraints = {
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: source.id
            }
        }
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    

    videoElement.srcObject = stream;
    videoElement.style.maxWidth = '800px';
    videoElement.style.maxHeight = '600px';
    videoElement.play();

    const options = { mimeType: 'video/webm; codecs=vp9'};
    mediaRecorder = new MediaRecorder(stream,options);

    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.onstop = handleStop;
}

let interval;



startBtn.onclick = e => {
    let notification = new Notification('Gravando...');
  mediaRecorder.start();
  startBtn.innerText = 'Gravando...';
  startBtn.disabled = true;
  stopBtn.disabled = false;
  time = Date.now();
    interval = setInterval(()=>{
        recorderTime.innerText = `Tempo de gravação: ${ parseInt((Date.now() - time) / 1000)} segundos`;
    },1000);
};



stopBtn.onclick = e => {
    let notification = new Notification('Gravação encerrada!');
  mediaRecorder.stop();
  startBtn.disabled = false;
  stopBtn.disabled = true;
  startBtn.innerText = 'Iniciar';
  recorderTime.innerText = 'Tempo de gravação: 0 segundos';
  clearInterval(interval);
};

function handleDataAvailable(e){
    recordedChunks.push(e.data);
}

const { dialog } = remote;
const { writeFile } = require('fs');
async function handleStop(e){
    const blob = new Blob(recordedChunks, {
        type: 'video/webm; codecs=vp9'
    });

    const buffer = Buffer.from(await blob.arrayBuffer());

    let data = Intl.DateTimeFormat( 'pt-BR', {day: 'numeric',month:'long',year:'numeric'}).format(Date.now());
    let { filePath } = await dialog.showSaveDialog({
        buttonLabel: 'Salvar video',
        defaultPath: `${data}.webm`
    });

    if(!filePath.includes('.webm')){
        filePath = filePath + '.webm'
    }

    writeFile(filePath,buffer,() => alert('video salvo'));

    while(recordedChunks.length > 0)
        recordedChunks.pop();
}