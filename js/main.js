var SCREEN_WIDTH;
var SCREEN_HEIGHT;
// the distance from the center in each direction the map extends
var MAP_SIDE_LENGTH = 5000;
var MINIMAP_SIDE_LENGTH = 200;

var FPS = 1000 / 60;
var numLoading;

var images = {
    sun: 'images/sun.png',
    mercury: 'images/mercury.png',
    venus: 'images/venus.png',
    earth: 'images/earth.png',
    mars: 'images/mars.png',
    jupiter: 'images/jupiter.png',
    saturn: 'images/saturn.png',
    uranus: 'images/uranus.png',
    neptune: 'images/neptune.png',
    starfield: 'images/starfield.jpg'
};

var keys = {
    up: 0,
    down: 0,
    left: 0,
    right: 0
};

function handleKeyEvent(state, e) {
    switch(e.which) {
        case 37:
            keys.left = state;
            break;
        case 38:
            keys.up = state;
            break;
        case 39:
            keys.right = state;
            break;
        case 40:
            keys.down = state;
            break;
    }
}

function loadImages(callback) {
    numLoading = 0;
    $.each(images, function(key, filename) {
        if (typeof filename === 'string') {
            numLoading++;
            images[key] = new Image();
            images[key].src = filename;
            $(images[key]).load(function () {
                numLoading--;
                if (numLoading == 0) {
                    callback();
                }
            });
        }
    });
}


// theta is in radians, orbit_speed is in theta/frame
function Planet(name, starting_theta, orbit_distance, orbit_speed) {
    return {
        theta: starting_theta,
        orbit_distance: orbit_distance,
        orbit_speed: orbit_speed,

        x: 0,
        y: 0,

        name: name,
        image: images[name],
        width: images[name].width,
        height: images[name].height,

        update: function() {
            this.theta += this.orbit_speed;
            //TODO - normalize this angle - while larger than 2pi subtract 2pi

            this.x = Math.floor(Math.cos(this.theta) * this.orbit_distance);
            this.y = Math.floor(Math.sin(this.theta) * this.orbit_distance);
        },
        draw: function(ctx, camera) {
            ctx.drawImage(this.image, (this.x - this.width / 2) - camera.x, (this.y - this.height / 2) - camera.y);
            // Only draw this object if it is on screen
            // TODO only draw planets if they are on screen, wouldn't be necessary
            //if (camera.x < this.x + this.width &&
            //    camera.x > this.x &&
            //    camera.y < this.y + this.height &&
            //    camera.y > this.y)
            //{
            //}
        }
    }
}

function Camera() {
    return {
        x: -(SCREEN_WIDTH / 2),
        y: -(SCREEN_HEIGHT / 2),
        scroll_speed: 50,

        update: function () {
            this.x += (keys.right - keys.left) * this.scroll_speed;
            this.y += (keys.down - keys.up) * this.scroll_speed;

            // Don't let the camera go beyond the map
            if (this.x < -MAP_SIDE_LENGTH / 2) this.x = -MAP_SIDE_LENGTH / 2;
            if (this.x + SCREEN_WIDTH > MAP_SIDE_LENGTH / 2) this.x = (MAP_SIDE_LENGTH / 2) - SCREEN_WIDTH;
            if (this.y < -MAP_SIDE_LENGTH / 2) this.y = -MAP_SIDE_LENGTH / 2;
            if (this.y + SCREEN_HEIGHT > MAP_SIDE_LENGTH / 2) this.y = (MAP_SIDE_LENGTH / 2) - SCREEN_HEIGHT;
        }
    }
}

function drawMinimap(ctx, camera, planets) {
    var shrinkFactor = (MAP_SIDE_LENGTH / MINIMAP_SIDE_LENGTH);
    ctx.strokeStyle = 'white';
    ctx.strokeRect(SCREEN_WIDTH - MINIMAP_SIDE_LENGTH, 
                   SCREEN_HEIGHT - MINIMAP_SIDE_LENGTH,
                   SCREEN_WIDTH,
                   SCREEN_HEIGHT);

    for (var i = 0; i < planets.length; i++) {
        // TODO make each planet a different color
        // draw the planets
        var plotX = planets[i].x / shrinkFactor;
        var plotY = planets[i].y / shrinkFactor;
        ctx.beginPath();
        ctx.arc(Math.floor(SCREEN_WIDTH - (MINIMAP_SIDE_LENGTH / 2) + plotX),
                Math.floor(SCREEN_HEIGHT - (MINIMAP_SIDE_LENGTH / 2) + plotY), 
                2, 0, 2 * Math.PI, false);
        ctx.fillStyle = "white";
        ctx.fill();

        // draw a rectangle around the screen
        var cameraX = SCREEN_WIDTH - (MINIMAP_SIDE_LENGTH / 2 ) + (camera.x / shrinkFactor);
        var cameraY = SCREEN_HEIGHT - (MINIMAP_SIDE_LENGTH / 2 ) + (camera.y / shrinkFactor);
            
        ctx.strokeStyle = 'white';
        ctx.strokeRect(Math.floor(cameraX),
                       Math.floor(cameraY),
                       Math.floor(SCREEN_WIDTH / shrinkFactor),
                       Math.floor(SCREEN_HEIGHT / shrinkFactor));
    }
}


function drawStarfield(ctx, camera) {
    var starfield = images['starfield'];
    var starfieldLength = starfield.width * 2;
    var scalingFactor = MINIMAP_SIDE_LENGTH / starfieldLength;

    var drawX = -(starfieldLength * scalingFactor) + scalingFactor * (-starfieldLength + (-camera.x + (starfieldLength / 2)));
    var drawY = -(starfieldLength * scalingFactor) + scalingFactor * (-starfieldLength + (-camera.y + (starfieldLength / 2)));

    console.log(drawX + ', ' + drawY);

    //x = -2500 draw at 0
    //x = -1000 draw at -1500
    //x = 0 draw at -2500
    //x = 2500 draw at -5000


    ctx.drawImage(starfield, drawX, drawY);
    ctx.drawImage(starfield, drawX + starfield.width, drawY);
    ctx.drawImage(starfield, drawX, drawY + starfield.height);
    ctx.drawImage(starfield, drawX + starfield.width, drawY + starfield.height);
}


$(document).ready(function(){
    SCREEN_WIDTH = $(window).width() - 10;
    SCREEN_HEIGHT = $(window).height() - 10;


    var $canvas = $('<canvas id="game">').attr('width', SCREEN_WIDTH).attr('height', SCREEN_HEIGHT);
    $('body').append($canvas);
    var ctx = $('#game').get(0).getContext('2d');


    $(document).keyup(function(e) {handleKeyEvent(0, e);});
    $(document).keydown(function(e) {handleKeyEvent(1, e);});

    loadImages(function() {

        var planets = [
            Planet('sun', 0.0, 0, 0),
            //Planet('mercury', Math.random() * 2 * Math.PI,  300, Math.PI * 0.001),
            //Planet('venus',   Math.random() * 2 * Math.PI,  450, Math.PI * 0.001),
            //Planet('earth',   Math.random() * 2 * Math.PI,  630, Math.PI * 0.001),
            //Planet('mars',    Math.random() * 2 * Math.PI,  810, Math.PI * 0.001),
            //Planet('jupiter', Math.random() * 2 * Math.PI, 1050, Math.PI * 0.001),
            //Planet('saturn',  Math.random() * 2 * Math.PI, 1400, Math.PI * 0.001),
            //Planet('uranus',  Math.random() * 2 * Math.PI, 1750, Math.PI * 0.001),
            //Planet('neptune', Math.random() * 2 * Math.PI, 2100, Math.PI * 0.001),
            Planet('mercury', Math.random() * 2 * Math.PI,  300, Math.PI * 0.001),
            Planet('venus',   Math.random() * 2 * Math.PI,  400, Math.PI * 0.001),
            Planet('earth',   Math.random() * 2 * Math.PI,  500, Math.PI * 0.001),
            Planet('mars',    Math.random() * 2 * Math.PI,  600, Math.PI * 0.001),
            Planet('jupiter', Math.random() * 2 * Math.PI, 700, Math.PI * 0.001),
            Planet('saturn',  Math.random() * 2 * Math.PI, 850, Math.PI * 0.001),
            Planet('uranus',  Math.random() * 2 * Math.PI, 1000, Math.PI * 0.001),
            Planet('neptune', Math.random() * 2 * Math.PI, 1150, Math.PI * 0.001),
        ];

        var camera = Camera();

        var mainLoop = function() {
            // Show the loading screen if we are still loading things
            if (numLoading > 0) {
                ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
                ctx.fillText("Definitely Loading...", 50, 50);
            }


            // Update everything
            camera.update();
            for (var i = 0; i < planets.length; i++) {
                planets[i].update();
            }

            // Draw everything
            ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
            drawStarfield(ctx, camera);
            for (var i = 0; i < planets.length; i++) {
                planets[i].draw(ctx, camera);
            }
            drawMinimap(ctx, camera, planets);

            setTimeout(mainLoop, FPS);
        };
        setTimeout(mainLoop, FPS);
    });
});
