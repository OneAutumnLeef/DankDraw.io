const express = require('express');
const { createServer } = require('http');
const { join } = require('path');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server);

// array of words
const wordList = ['apple', 'banana', 'orange', 'grape', 'strawberry', 'watermelon', 'soda',
'happy', 'snow', 'computer', 'tree', 'treehouse', 'clock', 'soup', 'bed'];
const joinedPlayers = [];
let playerScores = {};

// global variables
let gameInPlay = false;
let wordChosen;
let timerInterval;
let timerDuration = 60;
let chosenPlayer = '';

// doing this so the html can access the stylesheet/client-facing code
app.use(express.static(join(__dirname, 'public')));

// use index.html as the 'home page'
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

function startTimer() {
    timerInterval = setInterval(() => {
        if (timerDuration > 0) {
            timerDuration--;
            io.emit('updateTimer', timerDuration);
        } else {
            clearInterval(timerInterval);
            io.emit('chat message', { name: 'Skribblio', message: 'Oops! No one got it!', isJoinMessage: true });
            resetGame();
        }
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    io.emit('stopTimer');
}

function resetGame() {
    gameInPlay = false;
    wordChosen = '';
    timerDuration = 60;
}

// connect
io.on('connection', (socket) => {
    console.log('a user connected');

    // listen for user's name
    socket.on('sendName', (name) => {
        socket.username = name; // store user's name in the socket object
        joinedPlayers.push(name); // add player to the joinedPlayers list
        playerScores[`${name}`] = 0;
        io.emit('joinedPlayers', joinedPlayers); // emit updated list to all users
    });

    // emit a message when a new user joins
    socket.on('userJoined', (name) => {
        io.emit('chat message', { name: 'Skribblio', message: `${name} has joined!`, isJoinMessage: true });
    });

    socket.on('checkIfCanDraw', (data) => {
        if ((chosenPlayer === '') || (chosenPlayer === socket.username)) {
            socket.emit('canDraw', data);
        }
    })

    // listen for chat messages
    socket.on('chat message', (data) => {
    console.log(`${socket.username} said: ${data.message}`);
    io.emit('chat message', { name: socket.username, message: data.message });

    if (data.message.toLowerCase() === "start") {
        gameInPlay = true;

        const randomIndex = Math.floor(Math.random() * joinedPlayers.length);
        chosenPlayer = joinedPlayers[randomIndex];

        const randomIndex2 = Math.floor(Math.random() * wordList.length);
        wordChosen = wordList[randomIndex2];

        io.sockets.sockets.forEach((socket) => {
            if (socket.username === chosenPlayer) {
                io.to(socket.id).emit('chat message', {name: "Skribblio", message: `your word is: ${wordChosen}`, isJoinMessage: true});
            } else {
                io.to(socket.id).emit('chat message', {name: "Skribblio", message: `${chosenPlayer} is drawing!`, isJoinMessage: true});
            }
        });

        io.emit('startGame');

        // Start the timer when the game starts
        startTimer();
    }

    if ((data.message.toLowerCase() === wordChosen) && (gameInPlay)) {
        chosenPlayer = '';
        
        let temp_user = socket.username;

        playerScores[temp_user] ++;

        io.emit('chat message', {name: "Skribblio", message: `the correct word was ${wordChosen}. ${temp_user} guessed it first, giving them a total of ${playerScores[temp_user]} points!`, isJoinMessage: true});

        // Stop the timer when the correct word is guessed
        stopTimer();
    }

    if (data.message.toLowerCase() === 'score') {
    // Emit scores to the requesting client
        const scoreMessage = Object.entries(playerScores)
            .map(([user, score]) => `<strong>${user}</strong>: ${score} points`)
            .join('<br>');

        socket.emit('chat message', { name: 'Skribblio', message: scoreMessage, isJoinMessage: true });
    }

    if (data.message.toLowerCase() === 'help') {
        let commands = "here's a list of commands: <br><br><strong>start</strong> - start a new round of gameplay<br><strong>score</strong> - see each player's current score";
        socket.emit('chat message', {name: 'Skribblio', message: commands, isJoinMessage: true})
    }

});

    // disconnect
    socket.on('disconnect', () => {
        console.log(`${socket.username} disconnected`);
        const index = joinedPlayers.indexOf(socket.username);

        if (index !== -1) {
            joinedPlayers.splice(index, 1); // remove player from the joinedPlayers list
            io.emit('joinedPlayers', joinedPlayers); // emit updated list to all users
            io.emit('chat message', { name: 'Skribblio', message: `${socket.username} has left :(`, isJoinMessage: true });
        }

        let temp_user = socket.username;
        delete playerScores.temp_user;
    });

    // when something is drawn on the canvas
    socket.on('drawn', (data) => {
        io.emit('drawn', data); // just sending the data back
    });

    // when a user presses the 'clear' button
    socket.on('cleared', () => {
        io.emit('cleared');
    });
});

server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
});
