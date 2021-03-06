﻿// HTML5 Pong Game Template 
// Mickey MacDonald 2013
(function () {
    "use strict";

    WinJS.Binding.optimizeBindingReferences = true;

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;

    var canvas; //Will be linked to the canvas in our default.html page
    var stage; //Is the equivalent of stage in AS3; we'll add "children" to it

    // Game States 
    var gameStates = {
        "Start" : 1,
        "Playing" : 2,
        "GameOver": 3,
        "Paused": 4,
    };

    var currentGameState; // Keeps track of our current game state

    // Graphics //
    var backgroundImage, backgroundBitmap; //The background graphic
    var playerImage, playerBitmap,player2Image, player2Bitmap; //The player paddles graphics
    var ballImage, ballBitmap; //The ball graphic
    var cpuImage, cpuBitmap,cpu2Image, cpu2Bitmap; //The CPU paddles
    var winImage, winBitmap; //The winning popup
    var loseImage, loseBitmap; //The losing popup
    var pausedImage, pausedBitmap; //The Image we show when paused
    var speedUpImage, speedDownImage, speedUpBitmap, speedDownBitmap; //power up images

    // Variables //
    var title; //The games title
    var playerScore; //The main player score
    var cpuScore; //The CPU score
    var cpuSpeed = 4.1; //The speed of the CPU paddle; the faster it is the harder the game is
    var xSpeed = 6; //Used for the ball 
    var ySpeed = 6; //Used for the ball and the player paddle
    var winScore = '10'; //When the player or cpu hit this score the game is over

    var hits;
    var powerUpAvail = true;

    //Calculate display scale factor
    var SCALE_X = 4;
    var SCALE_Y = 4;
    var MARGIN = 25; //Inset from edge of screen

    // Preloader 
    var preload;
    var manifest;

    //SoundJS
    var soundManifest;
    

    app.onactivated = function (args) {
        if (args.detail.kind === activation.ActivationKind.launch) {
            if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated) {
                // TODO: This application has been newly launched. Initialize
                // your application here.
                initialize();
            } else {
                // TODO: This application has been reactivated from suspension.
                // Restore application state here.
            }
            args.setPromise(WinJS.UI.processAll());
        }
    };

    


    function initialize() {
        canvas = document.getElementById("gameCanvas"); // link our canvas to the one in default.html
        canvas.width = window.innerWidth; // Set the canvas width
        canvas.height = window.innerHeight; // Set the canvas height

        stage = new createjs.Stage(canvas); // This creates our stage on the canvas

        // Use PreloadJS to make sure sound & images are loaded
        // before we begin using them this is especially
        // important for large or remote resources
        preload = new createjs.LoadQueue();
        preload.installPlugin(createjs.Sound)

        preload.loadManifest([
                            //Images 
                            { src: "Assets/pause.png", id: "paused" },
                            { src: "Assets/bg.png", id: "bg" },
                            { src: "Assets/paddle.png", id: "cpu" },
                            { src: "Assets/paddle.png", id: "player" },
                            { src: "Assets/paddle2.png", id: "cpu2" },
                            { src: "Assets/paddle2.png", id: "player2" },
                            { src: "Assets/ball.png", id: "ball" },
                            { src: "Assets/win.png", id: "win" },
                            { src: "Assets/lose.png", id: "lose" },
                            { src: "Assets/speedUp.png", id: "speedUp" },
                            { src: "Assets/slowDown.png", id: "speedDown" },
                            //Sounds
                            { src: "Assets/playerScore.mp3", id: "playerScore" },
                            { src: "Assets/enemyScore.mp3", id: "enemyScore" },
                            { src: "Assets/hit.mp3", id: "hit" },
                            { src: "Assets/wall.mp3", id: "wall" },
                            { src: "Assets/speedUp.mp3", id: "speedUpSound" },
                            { src: "Assets/slowDown.mp3", id: "slowDownSound" }
        ]);
        preload.addEventListener("complete", prepareGame);

        //Add our listener to check for state changes in the view, like snap view
        window.addEventListener("resize", onViewStateChanged);
    }


    // This function will setup our game
    // This is where we assign our varibles and add objects to the stage
    function prepareGame() {

        // Set the current state to 'Start'
        currentGameState = gameStates.Start;

        hits = 0;

        // Setup the win/lose and paused graphics
        // We will add them to the stage when needed
        winImage = preload.getResult("win"); // This is how we get the image from preloader
        winBitmap = new createjs.Bitmap(winImage); // This will create a bitmap from our image
        winBitmap.scaleX = SCALE_X; // Scaling our bitmap
        winBitmap.scaleY = SCALE_Y;

        loseImage = preload.getResult("lose");
        loseBitmap = new createjs.Bitmap(loseImage);
        loseBitmap.scaleX = SCALE_X;
        loseBitmap.scaleY = SCALE_Y;

        speedDownImage = preload.getResult("speedDown"); 
        speedDownBitmap = new createjs.Bitmap(speedDownImage);
        speedDownBitmap.scaleX = SCALE_X; 
        speedDownBitmap.scaleY = SCALE_Y;

        speedUpImage = preload.getResult("speedUp");
        speedUpBitmap = new createjs.Bitmap(speedUpImage);
        speedUpBitmap.scaleX = SCALE_X;
        speedUpBitmap.scaleY = SCALE_Y;

        pausedImage = preload.getResult("paused");
        pausedBitmap = new createjs.Bitmap(pausedImage);
        pausedBitmap.scaleX = SCALE_X;
        pausedBitmap.scaleY = SCALE_Y;

        // Draw the background first other items appear on top
        backgroundImage = preload.getResult("bg");
        backgroundBitmap = new createjs.Bitmap(backgroundImage);
        backgroundBitmap.scaleX = SCALE_X;
        backgroundBitmap.scaleY = SCALE_Y;
        stage.addChild(backgroundBitmap); // Add Background to the Stage

        // Game Title //
        title = new createjs.Text("Super Paddle Ball", "30px sans-serif", "#757575");
        title.scaleX = SCALE_X;
        title.scaleY = SCALE_Y;
        title.x = canvas.width * 0.5 - (title.getMeasuredWidth() * SCALE_X) * 0.5;
        title.y = canvas.height * 0.5 - (title.getMeasuredHeight() * SCALE_Y) * 0.5;
        stage.addChild(title); // Add the scores and title to the stage, you can add multiple children at once

        
        // Draw Player paddle
        playerImage = preload.getResult("player");
        playerBitmap = new createjs.Bitmap(playerImage);
        playerBitmap.scaleX = SCALE_X;
        playerBitmap.scaleY = SCALE_Y;
        playerBitmap.x = MARGIN + ((playerImage.width * SCALE_X) * 0.25);
        playerBitmap.y = (canvas.height * 0.5) - playerImage.height;
        stage.addChild(playerBitmap);

        // Draw Player 2nd paddle
        player2Image = preload.getResult("player2");
        player2Bitmap = new createjs.Bitmap(player2Image);
        player2Bitmap.scaleX = SCALE_X;
        player2Bitmap.scaleY = SCALE_Y;
        player2Bitmap.x = (canvas.width * 0.5) - (player2Image.width);
        player2Bitmap.y = (canvas.height - (MARGIN + player2Image.height *2)) - player2Image.height;
        stage.addChild(player2Bitmap);

        // Draw CPU paddle
        cpuImage = preload.getResult("cpu");
        cpuBitmap = new createjs.Bitmap(cpuImage);
        cpuBitmap.scaleX = SCALE_X; 
        cpuBitmap.scaleY = SCALE_Y;
        cpuBitmap.x = (canvas.width - MARGIN) - (cpuImage.width * SCALE_X);
        cpuBitmap.y = (canvas.height * 0.5) - cpuImage.height;
        stage.addChild(cpuBitmap);

        // Draw CPU paddle2
        cpu2Image = preload.getResult("cpu2");
        cpu2Bitmap = new createjs.Bitmap(cpu2Image);
        cpu2Bitmap.scaleX = SCALE_X;
        cpu2Bitmap.scaleY = SCALE_Y;
        cpu2Bitmap.x = (canvas.width * 0.5) + (cpu2Image.width);
        cpu2Bitmap.y = MARGIN - cpu2Image.height;
        stage.addChild(cpu2Bitmap);

        // Draw the Ball
        ballImage = preload.getResult("ball");
        ballBitmap = new createjs.Bitmap(ballImage);
        ballBitmap.scaleX = SCALE_X;
        ballBitmap.scaleY = SCALE_Y;
        ballBitmap.x = (canvas.width * 0.5) - ((ballImage.width * 0.5) * SCALE_X); // Half the canvas minus half the ball width
        ballBitmap.y = (canvas.height * 0.5) - ((ballImage.height * 0.5) * SCALE_Y); // Half the canvas minus half the ball height
        stage.addChild(ballBitmap);

        // Scores //
        playerScore = new createjs.Text('0', 'bold 20px Arial', '#D0CEDE'); // This is how we create text with createjs
        playerScore.scaleX = SCALE_X;
        playerScore.scaleY = SCALE_Y;
        playerScore.x = MARGIN;
        playerScore.y = MARGIN * SCALE_Y;

        cpuScore = new createjs.Text('0', 'bold 20px Arial', '#D0CEDE');
        cpuScore.scaleX = SCALE_X;
        cpuScore.scaleY = SCALE_Y;
        cpuScore.x = canvas.width - (cpuScore.getMeasuredWidth() * SCALE_X) - MARGIN;
        cpuScore.y = MARGIN * SCALE_Y;

        stage.addChild(playerScore, cpuScore);
        stage.update();


        startGame(); // Run our startGame function
    }
    

    function startGame() {
        createjs.Ticker.setFPS(60); // Set the tick rate of our update timer
        createjs.Ticker.addListener(gameLoop); // Add a listener to call our gameloop on every tick
    }

    // Our gameloop, I have broke it into two parts. This is to make it a little easier to read and understand.
    function gameLoop() {
        update();
        draw();
    }


    // The update, this is where our game logic lives
    function update() {

        // Our game state switch
        switch (currentGameState) {

            // The code below is ran while the game is in the 'Start' state
            case gameStates.Start: 

                stage.onClick = null; //This nulls any click input

                // Check for a touch or click
                stage.onClick = function () {
                    currentGameState = gameStates.Playing; // Switch states to playing
                }
                break;

            // The code below is ran while the game is in the 'Playing' state
            case gameStates.Playing:
                display("clear"); //Clear any overlays on screen
                playGame();  // Moved the game play logic code to keep the update easy to read
                break;

            // The code below is ran while the game is in the 'Game Over' state
            case gameStates.GameOver:
                // Check for a touch or click
                stage.onClick = function () {
                    // Clear the scores if any exist
                    playerScore.text = 0;
                    cpuScore.text = 0;
                    display('clear'); // This will clear all the overlays
                    reset();
                    currentGameState = gameStates.Start; // Switch states to start
                }
                break;
            case gameStates.Paused:
                display("paused"); //Display the paused overlay
                break;

                
        }        
    }

    // Our draw function
    function draw() {
        //EaselJS makes this easy for us, just update the stage
        stage.update();
    }


    // The gameplay logic, moved to its own function to make it easier to read
    function playGame() {

        if (hits > 1 && hits % 3 == 0 && powerUpAvail) {

            var randomPower = Math.floor(Math.random() * 3);

            switch (randomPower) {
                case 1:
                    var randomX = Math.floor(Math.random() * canvas.width);
                    var randomY = Math.floor(Math.random() * canvas.height);
                    speedUpBitmap.x = randomX;
                    speedUpBitmap.y = randomY;
                    stage.addChild(speedUpBitmap);
                    powerUpAvail = false;
                    hits = 0;
                    break;
                case 2:
                    var randomX = Math.floor(Math.random() * canvas.width);
                    var randomY = Math.floor(Math.random() * canvas.height);
                    speedDownBitmap.x = randomX;
                    speedDownBitmap.y = randomY;
                    stage.addChild(speedDownBitmap);
                    powerUpAvail = false;
                    hits = 0;
                    break;
            }

        }

        if (hits > 1 && hits % 10 == 0 && !powerUpAvail) {
            stage.removeChild(speedDownBitmap);
            stage.removeChild(speedDownBitmap);
            powerUpAvail = true;
        }

                
        //Check for input
        stage.onMouseMove = movePaddle;

        // Ball Movement 

        ballBitmap.x = ballBitmap.x + xSpeed;
        ballBitmap.y = ballBitmap.y + ySpeed;

        // Cpu Movement

        if (cpuBitmap.y < ballBitmap.y) {
            cpuBitmap.y = cpuBitmap.y + cpuSpeed;
            
        }
        else if (cpuBitmap.y > ballBitmap.y) {
            cpuBitmap.y = cpuBitmap.y - cpuSpeed;
            
        }

        if (cpu2Bitmap.x < ballBitmap.x) {
            cpu2Bitmap.x = cpu2Bitmap.x + cpuSpeed;
        }
        else if (cpu2Bitmap.x > ballBitmap.x) {
            cpu2Bitmap.x = cpu2Bitmap.x - cpuSpeed;
        }

        // Wall Collision //
        //Up
        if ((ballBitmap.y) < 0) {
            playerScore.text = parseInt(playerScore.text + 1);
            reset();
            createjs.Sound.play('playerScore');
        };

        //down
        if (ballBitmap.y > canvas.height - (ballImage.height * SCALE_Y)) {
            cpuScore.text = parseInt(cpuScore.text + 1);
            reset();
            createjs.Sound.play('enemyScore');
        };


        // CPU Score //

        if ((ballBitmap.x) < 0) {
            xSpeed = -xSpeed;
            cpuScore.text = parseInt(cpuScore.text + 1);
            reset();
            createjs.Sound.play('enemyScore');
        }

        // Player Score //

        if (ballBitmap.x > canvas.width - ballImage.width * SCALE_X) {
            xSpeed = -xSpeed;
            playerScore.text = parseInt(playerScore.text + 1);
            reset();
            createjs.Sound.play('playerScore');
        }

        var intersection = ndgmr.checkRectCollision(ballBitmap, cpuBitmap);
        if (intersection) {
            xSpeed *= -1;
            createjs.Sound.play('hit');
            hits++;
        }

        intersection = ndgmr.checkRectCollision(ballBitmap, cpu2Bitmap);
        if (intersection) {
            ySpeed *= -1;
            createjs.Sound.play('hit');
            hits++;
        }

        intersection = ndgmr.checkRectCollision(ballBitmap, playerBitmap);
        if (intersection) {
            xSpeed *= -1;
            createjs.Sound.play('hit');
            hits++;
        }

        intersection = ndgmr.checkRectCollision(ballBitmap, player2Bitmap);
        if (intersection) {
            ySpeed *= -1;
            createjs.Sound.play('hit');
            hits++;
        }

        intersection = ndgmr.checkRectCollision(ballBitmap, speedUpBitmap);
        if (intersection) {
            
            stage.removeChild(speedUpBitmap);
            speedUpBitmap.x = -200;
            speedUpBitmap.y = -900;
            xSpeed *=2;
            ySpeed *=2;
            createjs.Sound.play('speedUpSound');
            powerUpAvail = true;
            hits = 0;
        }

        intersection = ndgmr.checkRectCollision(ballBitmap, speedDownBitmap);
        if (intersection) {

            stage.removeChild(speedDownBitmap);
            speedDownBitmap.x = -200;
            speedDownBitmap.y = -900;
            xSpeed /=2;
            ySpeed /=2;
            createjs.Sound.play('slowDownSound');
            powerUpAvail = true;
            hits = 0;
        }
    
      
        // Stop Paddle from going out of canvas //
        if (playerBitmap.y >= canvas.height - (playerImage.height * SCALE_Y)) {
            playerBitmap.y = canvas.height - (playerImage.height * SCALE_Y);
        }
        if (player2Bitmap.x >= canvas.width - (player2Image.width * SCALE_X)) {
            player2Bitmap.x = canvas.width - (player2Image.width * SCALE_X);
        }


        // Check for Win //

        if (playerScore.text == winScore) {
            display('win');
        }

        // Check for Lose //

        if (cpuScore.text == winScore) {
            display('lose');
        }
    }
    
    function movePaddle(e) {
        // Player Movement
        playerBitmap.y = e.stageY;
        player2Bitmap.x = e.stageX;
    }

    // Reset, this will set the paddle and ball to their starting place
    function reset() {
                
        hits = 0;
        xSpeed = 6;
        ySpeed = 6;

        stage.onMouseMove = null; // Clears movement input

        playerBitmap.x = MARGIN + ((playerImage.width * SCALE_X) * 0.25);
        playerBitmap.y = (canvas.height * 0.5) - (playerImage.height);

        player2Bitmap.x = (canvas.width * 0.5) - (player2Image.width);
        player2Bitmap.y = (canvas.height - (MARGIN + player2Image.height * 2)) - player2Image.height;

        cpuBitmap.x = (canvas.width - MARGIN) - (cpuImage.width * SCALE_X);
        cpuBitmap.y = (canvas.height * 0.5) - (cpuImage.height);

        cpu2Bitmap.x = (canvas.width * 0.5) + (cpu2Image.width);
        cpu2Bitmap.y = MARGIN - cpu2Image.height;

        ballBitmap.x = (canvas.width * 0.5) - ((ballImage.width * 0.5) * SCALE_X); 
        ballBitmap.y = (canvas.height * 0.5) - ((ballImage.height * 0.5) * SCALE_Y); 
    }
    


    // This function will display our overlays and clear them when needed
    function display(e) {
        
        stage.onMouseMove = null;

        switch (e) {
            case 'win':
                winBitmap.x = (canvas.width * 0.5) - (winImage.width * 2);
                winBitmap.y = (canvas.height * 0.5) - (winImage.height * 2);
                stage.addChild(winBitmap);
                e = null;
                currentGameState = gameStates.GameOver;
                break;


            case 'lose':
                loseBitmap.x = (canvas.width * 0.5) - (winImage.width * 2);
                loseBitmap.y = (canvas.height * 0.5) - (winImage.height * 2);
                e = null;
                stage.addChild(loseBitmap);
 
                currentGameState = gameStates.GameOver;
                break;

            case 'paused':
                pausedBitmap.x = 0;
                pausedBitmap.y = 0;
                e = null;
                stage.addChild(pausedBitmap);
                break;

            case 'clear':
                e = null;
                stage.removeChild(loseBitmap);
                stage.removeChild(winBitmap);
                stage.removeChild(pausedBitmap);
                break;
        }
    }

    //This Function will check if the view state is snapped. 
    //If it is we set our gamestate to paused. 
    function onViewStateChanged() {
        var viewStates = Windows.UI.ViewManagement.ApplicationViewState, msg;
        var newViewState = Windows.UI.ViewManagement.ApplicationView.value;

        if (newViewState === viewStates.snapped) {
            currentGameState = gameStates.Paused;
        } 
    }

    app.oncheckpoint = function (args) {
        // TODO: This application is about to be suspended. Save any state
        // that needs to persist across suspensions here. You might use the
        // WinJS.Application.sessionState object, which is automatically
        // saved and restored across suspension. If you need to complete an
        // asynchronous operation before your application is suspended, call
        // args.setPromise().
    };

    document.addEventListener("DOMContentLoaded", initialize, false);

    app.start();
})();
