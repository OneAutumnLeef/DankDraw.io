## 👩🏻‍💻 DESCRIPTION
Welcome to `DankDraw.io 🎭`, a digital rendition of the classic game of pictionary, where players utilize a chatroom to guess answers and control gameplay. This project was heavily inspired by the popular online game, [**skribbl.io**](https://skribbl.io/).

`DankDraw.io` was made by [@OneAutumnLeef](https://github.com/OneAutumnLeef) (Deraj) and [@Sharankarthick](https://github.com/Sharankarthick) (Sharan Karthick) and [@
SHAN2004-IIIT] (https://github.com/SHAN2004-IIIT) (Shanmathe SA as part of our 2024 Global Game Jam. This whimsical platform merges memes, madness, and web development prowess into a sensational experience.

This game was created with HTML/CSS/JavaScript, with the help of runtime environments/frameworks/etc. such as [Node.js](https://nodejs.org/en), [Express.js](https://expressjs.com/), and [Socket.IO](https://socket.io/) for our backend

⬇️ opening still of `DankDraw.io`
![](1.png)

## 💡 INSTRUCTIONS 
⬇️ `help` command of `skribbl.io`
<br>
<img src="./visuals/help.png" height=750>
* Type commands directly into the chatbox
* After starting a round (with the `start` command)
  * The chat will choose a random player as that round's drawer and will give them a keyword to draw out
  * Using the canvas's different pen colors and widths, the drawer will be given 1 minute to draw out their keyword
  * Using the chat, other players will type their guesses into the chat
  * The first one to guess the word gets a point added to their score!
  * If no one guesses it, the round is null and no one gains a point
 
### Other Details 🌟
* When someone's selected as the drawer, no one else can draw on the canvas. When `start` hasn't been activated, anyone can draw on the canvas
* When you first join the server, you're prompted to make your own username
* The chat announces when a user connects/disconnects
 
##  📦 INSTALLING AND RUNNING 
1. From [OneAutumnLeef/Draworgetdrawn](https://github.com/OneAutumnLeef/Draworgetdrawn), download the following files:
    * `app.js` (the server-facing js code)
    * `index.html`
    * the `public` folder, which includes:
        * `style.css`
        * `script.js`(the client-facing js code)
2. Also make sure to have Node.js and Express.js installed on your device ([link](https://nodejs.org/en/download/current) to installing Node.js, [link](https://expressjs.com/en/starter/installing.html) to installing Express.js)
3. Using your preferred console, type the following:
```
node app.js
```
1. Open the following link on your preferred browser: [https://localhost:3000](https://localhost:3000)

## 🎮 DEMOS 
_intro_
![](1.png)

_instructions_
![](2.png)

gamepage
![](3.png)

`score` feature
![](5.png)
  

  

  <!-- git init
  git status
  git add .
  git commit
  git remote add origin https://github.com/OneAutumnLeef/Draworgetdrawn.git
  git push -u -f origin master -->
