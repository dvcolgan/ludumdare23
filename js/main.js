var SCREEN_WIDTH;
var SCREEN_HEIGHT;
// the distance from the center in each direction the map extends
var MAP_SIDE_LENGTH = 5000;
var MINIMAP_SIDE_LENGTH = 200;

var ctx;

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
    starfield: 'images/starfield.jpg',
    player: 'images/player.png'
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
function Planet(name, starting_theta, orbit_distance, mass) {
    return {
        theta: starting_theta,
        orbit_distance: orbit_distance,
        orbit_speed: Math.PI * 0.001,
        mass: mass,

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
        draw: function(camera) {

            ctx.beginPath()
            ctx.arc(-camera.x, -camera.y, this.orbit_distance, 0, 2 * Math.PI, false);
            ctx.strokeStyle = '#444';
            ctx.stroke();
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
    };
}

function Player() {
    return {
        x: -500,
        y: -500,
        dx: 0.0,
        dy: 0.0,
        image: images['player'],
        width: images['player'].width,
        height: images['player'].height,

        update: function(planets) {
            // Apply gravity from all planets
            for (var i = 0; i < planets.length; i++) {
                var planet = planets[i];

                // All x, y coordinates are in the center of the object
                var distX = Math.abs(this.x - planet.x);
                var distY = Math.abs(this.y - planet.y);

                var dist = Math.sqrt((this.x - planet.x) * (this.x - planet.x) + (this.y - planet.y) * (this.y - planet.y));

                var force = planet.mass * 1000 / (dist * dist);

                var theta = Math.atan2(distX, distY);

                var forceX = Math.sin(theta) * force;
                var forceY = Math.cos(theta) * force;


                //if (dist - this.width / 2 < planet.width / 2) {
                //    // We are inside the planet - apply an opposite force
                //    forceX *= -1.0;
                //    forceY *= -1.0;
                //    this.dx = 0;
                //    this.dy = 0;
                //}
                if (dist - this.width / 2 < planet.width / 2) {
                    // We are inside the planet - don't apply anymore force
                    forceX = 0.0;
                    forceY = 0.0;
                }
                if (this.x > planet.x) this.dx -= forceX;
                if (this.x < planet.x) this.dx += forceX;
                if (this.y > planet.y) this.dy -= forceY;
                if (this.y < planet.y) this.dy += forceY;

            }

            this.dx += (keys.right - keys.left) * 1;
            this.dy += (keys.down - keys.up) * 1;


            if (this.dx > 20) this.dx = 20;
            if (this.dx < -20) this.dx = -20;
            if (this.dy > 20) this.dy = 20;
            if (this.dy < -20) this.dy = -20;

            this.x += this.dx;
            this.y += this.dy;

            // TODO If we are colliding with a planet, don't go further
            //for (var i = 0; i < planets.length; i++) {
            //}

            // If we are going off the edge of the map, don't go further
            if (this.x < -MAP_SIDE_LENGTH / 2 + this.width / 2) this.x = -MAP_SIDE_LENGTH / 2 + this.width / 2;
            if (this.x > MAP_SIDE_LENGTH / 2 - this.width / 2) this.x = MAP_SIDE_LENGTH / 2 - this.width / 2;
            if (this.y < -MAP_SIDE_LENGTH / 2 + this.height / 2) this.y = -MAP_SIDE_LENGTH / 2 + this.height / 2;
            if (this.y > MAP_SIDE_LENGTH / 2 - this.height / 2) this.y = MAP_SIDE_LENGTH / 2 - this.height / 2;

        },
        draw: function(camera) {
            ctx.drawImage(this.image, (this.x - this.width / 2) - camera.x, (this.y - this.height / 2) - camera.y);
            ctx.beginPath();
            ctx.arc((this.x) - camera.x,
                    (this.y) - camera.y,
                    this.width / 2, 0, 2 * Math.PI, false);
            ctx.fillStyle = "white";
            ctx.fill();
        }
    };
}

function bodyInPlanet(body, planets) {
    var intersectingPlanet = null;
    for (var i = 0; i < planets.length; i++) {
        var planet = planets[i];

        var distSq = (body.x - planet.x) * (body.x - planet.x) + (body.y - planet.y) * (body.y + planet.y);
        if (distSq < (body.width / 2 + planet.width / 2) * (body.width / 2 + planet.width / 2)) {
            return planet;
        }
    }
    return null;
}

function Alien(startX, startY) {
    return {
        x: startX,
        y: startY,
        dx: 0.0,
        dy: 0.0,
        image: images['alien'],
        frames: 3,
        curFrame: 0,
        width: images['alien'].width,
        height: images['alien'].height,

        update: function(planets) {
            // Apply gravity from all planets
            for (var i = 0; i < planets.length; i++) {
                var planet = planets[i];

                // All x, y coordinates are in the center of the object
                var distX = Math.abs(this.x - planet.x);
                var distY = Math.abs(this.y - planet.y);

                var dist = Math.sqrt((this.x - planet.x) * (this.x - planet.x) + (this.y - planet.y) * (this.y - planet.y));

                var force = planet.mass * 1000 / (dist * dist);

                var theta = Math.atan2(distX, distY);

                var forceX = Math.sin(theta) * force;
                var forceY = Math.cos(theta) * force;


                //if (dist - this.width / 2 < planet.width / 2) {
                //    // We are inside the planet - apply an opposite force
                //    forceX *= -1.0;
                //    forceY *= -1.0;
                //    this.dx = 0;
                //    this.dy = 0;
                //}
                if (dist - this.width / 2 < planet.width / 2) {
                    // We are inside the planet - don't apply anymore force
                    forceX = 0.0;
                    forceY = 0.0;
                }
                if (this.x > planet.x) this.dx -= forceX;
                if (this.x < planet.x) this.dx += forceX;
                if (this.y > planet.y) this.dy -= forceY;
                if (this.y < planet.y) this.dy += forceY;

            }

            // TODO cast a ray out in front and the first thing it hits without going over the limit, go the other way
            var rayX = this.x;
            var rayY = this.y;
            for (var i = 0; i < 10; i++) {
                rayX += this.dx;
                rayY += this.dy;

                ctx.moveTo(this.x, this.y);
                ctx.lineTo(rayX, rayY);
                ctx.strokeStyle = 'red';
                ctx.stroke();
                
                var planet = bodyInPlanet(this, planets);
                if (planet) {
                    var side = (rayX - this.x) * (planet.y - this.y) - (rayY - this.y) * (planet.x - this.x);
                    console.log(side);
                }
            }

            this.dx += (keys.right - keys.left) * 1;
            this.dy += (keys.down - keys.up) * 1;

            if (this.dx > 20) this.dx = 20;
            if (this.dx < -20) this.dx = -20;
            if (this.dy > 20) this.dy = 20;
            if (this.dy < -20) this.dy = -20;

            this.x += this.dx;
            this.y += this.dy;

            // If we are going off the edge of the map, don't go further
            if (this.x < -MAP_SIDE_LENGTH / 2 + this.width / 2) this.x = -MAP_SIDE_LENGTH / 2 + this.width / 2;
            if (this.x > MAP_SIDE_LENGTH / 2 - this.width / 2) this.x = MAP_SIDE_LENGTH / 2 - this.width / 2;
            if (this.y < -MAP_SIDE_LENGTH / 2 + this.height / 2) this.y = -MAP_SIDE_LENGTH / 2 + this.height / 2;
            if (this.y > MAP_SIDE_LENGTH / 2 - this.height / 2) this.y = MAP_SIDE_LENGTH / 2 - this.height / 2;

        },
        draw: function(camera) {
            ctx.drawImage(this.image, (this.x - this.width / 2) - camera.x, (this.y - this.height / 2) - camera.y);
        }
    };
}

function Camera() {
    return {
        x: -(SCREEN_WIDTH / 2),
        y: -(SCREEN_HEIGHT / 2),
        dampening_factor: 0.2,

        update: function (player) {
            var destX = player.x - SCREEN_WIDTH / 2;
            var destY = player.y - SCREEN_HEIGHT / 2;

            this.x += this.dampening_factor * (destX - this.x);
            this.y += this.dampening_factor * (destY - this.y);

            // Don't let the camera go beyond the map
            if (this.x < -MAP_SIDE_LENGTH / 2) this.x = -MAP_SIDE_LENGTH / 2;
            if (this.x + SCREEN_WIDTH > MAP_SIDE_LENGTH / 2) this.x = (MAP_SIDE_LENGTH / 2) - SCREEN_WIDTH;
            if (this.y < -MAP_SIDE_LENGTH / 2) this.y = -MAP_SIDE_LENGTH / 2;
            if (this.y + SCREEN_HEIGHT > MAP_SIDE_LENGTH / 2) this.y = (MAP_SIDE_LENGTH / 2) - SCREEN_HEIGHT;
        }
    };
}

function drawMinimap(camera, planets) {
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


function drawStarfield(camera) {
    var starfield = images['starfield'];
    var starfieldLength = starfield.width * 2;
    var scalingFactor = MINIMAP_SIDE_LENGTH / starfieldLength;

    var drawX = -(starfieldLength * scalingFactor) + scalingFactor * (-starfieldLength + (-camera.x + (starfieldLength / 2)));
    var drawY = -(starfieldLength * scalingFactor) + scalingFactor * (-starfieldLength + (-camera.y + (starfieldLength / 2)));

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
    ctx = $('#game').get(0).getContext('2d');


    $(document).keyup(function(e) {handleKeyEvent(0, e);});
    $(document).keydown(function(e) {handleKeyEvent(1, e);});

    loadImages(function() {

        var planets = [
            //Planet('mercury', Math.random() * 2 * Math.PI,  300, Math.PI * 0.001),
            //Planet('venus',   Math.random() * 2 * Math.PI,  450, Math.PI * 0.001),
            //Planet('earth',   Math.random() * 2 * Math.PI,  630, Math.PI * 0.001),
            //Planet('mars',    Math.random() * 2 * Math.PI,  810, Math.PI * 0.001),
            //Planet('jupiter', Math.random() * 2 * Math.PI, 1050, Math.PI * 0.001),
            //Planet('saturn',  Math.random() * 2 * Math.PI, 1400, Math.PI * 0.001),
            //Planet('uranus',  Math.random() * 2 * Math.PI, 1750, Math.PI * 0.001),
            //Planet('neptune', Math.random() * 2 * Math.PI, 2100, Math.PI * 0.001),
            Planet('sun', 0.0, 0, 100),
            Planet('mercury', Math.random() * 2 * Math.PI,  300, 10),
            Planet('venus',   Math.random() * 2 * Math.PI,  400, 20),
            Planet('earth',   Math.random() * 2 * Math.PI,  500, 20),
            Planet('mars',    Math.random() * 2 * Math.PI,  600, 20),
            Planet('jupiter', Math.random() * 2 * Math.PI, 700,  70),
            Planet('saturn',  Math.random() * 2 * Math.PI, 850,  50),
            Planet('uranus',  Math.random() * 2 * Math.PI, 1000, 40),
            Planet('neptune', Math.random() * 2 * Math.PI, 1150, 40)
        ];

        var wave = 1;
        var aliens = [];

        var camera = Camera();

        var player = Player();

        var mainLoop = function() {
            // Show the loading screen if we are still loading things
            if (numLoading > 0) {
                ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
                ctx.fillText("Definitely Loading...", 50, 50);
            }


            // Update everything
            player.update(planets);
            camera.update(player);
            for (var i = 0; i < planets.length; i++) {
                planets[i].update();
            }
            //alienSpawner(

            // Draw everything
            ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
            drawStarfield(camera);
            for (var i = 0; i < planets.length; i++) {
                planets[i].draw(camera);
            }
            for (var i = 0; i < aliens.length; i++) {
                aliens[i].draw(camera);
            }
            player.draw(camera);
            drawMinimap(camera, planets);

            setTimeout(mainLoop, FPS);
        };
        setTimeout(mainLoop, FPS);
    });
});
