var socket = io();
/*


code for game functionality ⬇️


*/

const name = prompt("Please enter your name:");

socket.emit('sendName', name);
socket.emit('userJoined', name);  // emit 'userJoined' event when a user joins

const timerElement = document.getElementById('timer');
let timerDuration = 60;
let timerInterval;
let timerStopped = false;

let wordList = [];
let wordChosen = '';

let playerCount = 0;
let joinedPlayers = [];

function updateTimer() {
  const minutes = Math.floor(timerDuration / 60);
  const seconds = timerDuration % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  timerElement.textContent = formattedTime;
}

function startTimer() {
  timerInterval = setInterval(() => {
      if ((timerDuration > 0) && !(timerStopped)) {
          timerDuration--;
          updateTimer();
      } else {
          clearInterval(timerInterval);
      }
  }, 1000);
}

socket.on('stopTimer', () => {
  timerStopped = true;
});

// listen for the joined players list from the server
socket.on('joinedPlayers', (players) => {
  joinedPlayers = players;
});

socket.on('startGame', () => {
  timerStopped = false;
  timerDuration = 60;
  startTimer();
});

/*


code for chat ⬇️


*/

const form = document.getElementById('form');
const input = document.getElementById('input');
const messagesContainer = document.getElementById('messages-container');
const messages = document.getElementById('messages');

form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value) {
        socket.emit('chat message', { name, message: input.value });
        input.value = '';
    }
});

socket.on('chat message', (data) => {
    const item = document.createElement('li');
    const bubbleClass = data.name === name ? 'bubble sent' : 'bubble';
    const messageClass = data.isJoinMessage ? 'join-bubble' : bubbleClass;
    item.innerHTML = `
        <div class="name-bubble">${data.name}</div>
        <div class="${messageClass}">${data.message}</div>
    `;
    messages.appendChild(item);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

});

/*


code for canvas feature ⬇️


*/

// setting up some helpful shortcut variables
var myCanvas = document.querySelector('canvas');
var myContext = myCanvas.getContext('2d');

var myColor = "#000000"; // setting default as black, will update when color picked changes

myCanvas.height = .7 * window.innerHeight; // making it 80% the height/width
myCanvas.width = .7 * window.innerWidth;

let drawing = false; // checking to see if user is drawing

// init some coordinates
let posX = 0;
let posY = 0;

let brushSize = 5;

document.getElementById('brushSmall').addEventListener('click', () => {
  brushSize = 1;
});

document.getElementById('brushMedium').addEventListener('click', () => {
  brushSize = 4.75;
});

document.getElementById('brushLarge').addEventListener('click', () => {
  brushSize = 8.5;
});

myCanvas.addEventListener('mousedown', (e) => {
  socket.emit('checkIfCanDraw', {event: e});
});

socket.on('canDraw', (data) => {
  init(data.event); // sets mouse position
  drawing = true; // is drawing!! bc mouse is down
})

myCanvas.addEventListener('mouseup', () => {
  drawing = false;
});

myCanvas.addEventListener('mousemove', (e) => {
  draw(e);
});

function init(e) {
  posX = e.offsetX;
  posY = e.offsetY;
}

function draw(e) {
  if (drawing) {
    myContext.beginPath();
    myContext.moveTo(posX, posY);
    myContext.lineTo(e.offsetX, e.offsetY);
    myContext.lineWidth = brushSize; // Set the brush size
    myContext.stroke();
    myContext.closePath();

    socket.emit('drawn', {
      posX: posX,
      posY: posY,
      offsetX: e.offsetX,
      offsetY: e.offsetY,
      color: myColor,
      brushSize: brushSize // Include brush size in the emitted data
    });
  }
}

// when the server emits the 'drawn' event
socket.on('drawn', (data) => {
  myContext.strokeStyle = `${data.color}`;
  myContext.lineWidth = data.brushSize; // Set the received brush size

  myContext.beginPath();
  myContext.moveTo(data.posX, data.posY);
  myContext.lineTo(data.offsetX, data.offsetY);
  myContext.stroke();
  myContext.closePath();

  posX = data.offsetX;
  posY = data.offsetY;
});

// color button code!

// setting up button shortcut variables
const blackBtn = document.getElementById('black');
const redBtn = document.getElementById('red');
const orangeBtn = document.getElementById('orange');
const yellowBtn = document.getElementById('yellow');
const greenBtn = document.getElementById('green');
const blueBtn = document.getElementById('blue');
const purpleBtn = document.getElementById('purple');
const pinkBtn = document.getElementById('pink');
const clearBtn = document.getElementById('clear');


// for the clear button
clearBtn.addEventListener('click', () => {
  myContext.clearRect(0,0,myCanvas.width,myCanvas.height);

  socket.emit('cleared'); // trigger 'clear' event!
});

// when receiving clear event
socket.on('cleared', () => {
  myContext.clearRect(0,0,myCanvas.width,myCanvas.height); // same thing as the regular 'onclick' event
});

// for every color button
blackBtn.addEventListener('click', () => { // when clicked,
  myColor = '#000000'; // update the myColor variable (so the info can be shared in 'drawn')
  myContext.strokeStyle = '#000000'; // and actually change the pen color!
});

redBtn.addEventListener('click', () => {
  myColor = '#FAA0A0';
  myContext.strokeStyle = '#FAA0A0';
});

orangeBtn.addEventListener('click', () => {
  myColor = '#FFC69A';
  myContext.strokeStyle = '#FFC69A';
});

yellowBtn.addEventListener('click', () => {
  myColor = '#F8EC7C';
  myContext.strokeStyle = '#F8EC7C';
});

greenBtn.addEventListener('click', () => {
  myColor = '#D0F2C7';
  myContext.strokeStyle = '#D0F2C7';
});

blueBtn.addEventListener('click', () => {
  myColor = '#BAEBE5';
  myContext.strokeStyle = '#BAEBE5';
});

purpleBtn.addEventListener('click', () => {
  myColor = '#E1CAF8';
  myContext.strokeStyle = '#E1CAF8';
});

pinkBtn.addEventListener('click', () => {
  myColor = '#F4C9DE';
  myContext.strokeStyle = '#F4C9DE';
});


// Function to handle taking a picture via webcam
function takePicture() {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
          const video = document.createElement('video');
          video.srcObject = stream;
          video.onloadedmetadata = () => {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imageURL = canvas.toDataURL('image/png');
              sendImage(imageURL);
              video.srcObject.getTracks().forEach(track => track.stop());
          };
          video.play();
      })
      .catch((error) => {
          console.error('Error accessing webcam:', error);
      });
}

// Function to handle sending an image in the chat
function sendImage(imageURL) {
  const messageData = {
      name: name,
      message: `<img src="${imageURL}" style="max-width: 200px;">`, // Embed image in message
      isJoinMessage: false
  };
  socket.emit('chat message', messageData);
}

// Event listener for Take Picture button
document.getElementById('takePicButton').addEventListener('click', () => {
  takePicture();
});

// Event listener for Choose Image button
document.getElementById('chooseImageButton').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = function () {
          const imageURL = reader.result;
          sendImage(imageURL);
      };
  }
});

