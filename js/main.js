var SCREEN_WIDTH;
var SCREEN_HEIGHT;
// the distance from the center in each direction the map extends
var MAP_SIDE_LENGTH = 5000;
var MINIMAP_SIDE_LENGTH = 200;

var ctx;
var camera;

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
    player: 'images/player.png',
    alien: 'images/alien.png'
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
function Planet(name, color, starting_theta, orbit_distance, mass) {
    return {
        theta: starting_theta,
        orbit_distance: orbit_distance,
        orbit_speed: Math.PI * 0.001,
        mass: mass,

        color: color,
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
        draw: function() {

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
            //for (var i = 0; i < planets.length; i++) {
            //    var planet = planets[i];

            //    // All x, y coordinates are in the center of the object
            //    var distX = Math.abs(this.x - planet.x);
            //    var distY = Math.abs(this.y - planet.y);

            //    var dist = Math.sqrt((this.x - planet.x) * (this.x - planet.x) + (this.y - planet.y) * (this.y - planet.y));

            //    var force = planet.mass * 500 / (dist * dist);

            //    var theta = Math.atan2(distX, distY);

            //    var forceX = Math.sin(theta) * force;
            //    var forceY = Math.cos(theta) * force;


            //    //if (dist - this.width / 2 < planet.width / 2) {
            //    //    // We are inside the planet - apply an opposite force
            //    //    forceX *= -1.0;
            //    //    forceY *= -1.0;
            //    //    this.dx = 0;
            //    //    this.dy = 0;
            //    //}
            //    if (dist - this.width / 2 < planet.width / 2) {
            //        // We are inside the planet - don't apply anymore force
            //        forceX = 0.0;
            //        forceY = 0.0;
            //    }
            //    if (this.x > planet.x) this.dx -= forceX;
            //    if (this.x < planet.x) this.dx += forceX;
            //    if (this.y > planet.y) this.dy -= forceY;
            //    if (this.y < planet.y) this.dy += forceY;

            //}

            this.dx += (keys.right - keys.left) * 5;
            this.dy += (keys.down - keys.up) * 5;


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
        draw: function() {
            ctx.drawImage(this.image, (this.x - this.width / 2) - camera.x, (this.y - this.height / 2) - camera.y);
        }
    };
}


function pointInPlanet(ptX, ptY, planets) {
    var intersectingPlanet = null;
    for (var i = 0; i < planets.length; i++) {
        var planet = planets[i];

        var dist = Math.sqrt((ptX - planet.x) * (ptX - planet.x) + (ptY - planet.y) * (ptY - planet.y));
        if (dist < planet.width / 2) {
            return planet;
        }
    }
    return null;
}

function getMagnitude(dx, dy) {
    return Math.sqrt(dx * dx + dy * dy);
}

function Alien(startX, startY) {
    return {
        x: startX,
        y: startY,
        dx: 0.0,
        dy: 0.0,
        image: images['alien'],
        frames: 3,
        stall_threshold: 2.0,
        thrust: 2.5,
        frameTimer: 0,
        frameLength: 5,
        curFrame: 0,
        width: 50,
        height: 40,

        update: function(planets) {
            // Apply gravity and repulsion from all planets
            for (var i = 0; i < planets.length; i++) {
                var planet = planets[i];

                // All x, y coordinates are in the center of the object
                var distX = this.x - planet.x;
                var distY = this.y - planet.y;

                var dist = Math.sqrt((this.x - planet.x) * (this.x - planet.x) + (this.y - planet.y) * (this.y - planet.y));

                var distXNorm = distX / dist;
                var distYNorm = distY / dist;

                var forceX = 0;
                var forceY = 0;

                var evasionDist = planet.width / 2 + 200;
                if (dist < evasionDist) {

                    var distXNormPerp = -distYNorm;
                    var distYNormPerp = distXNorm;

                    var evasionPercent = ((evasionDist - dist) / evasionDist);

                    forceX += distXNorm * this.thrust * evasionPercent * evasionPercent;
                    forceY += distYNorm * this.thrust * evasionPercent * evasionPercent;
                    // Determine which direction we are going relative to the planet
                    if (this.dx * distXNormPerp + this.dy * distYNormPerp > 0) {
                        forceX += distXNormPerp * this.thrust;
                        forceY += distYNormPerp * this.thrust;
                    }
                    else {
                        forceX -= distXNormPerp * this.thrust;
                        forceY -= distYNormPerp * this.thrust;
                    }
                }
                else {
                    forceX += 100 * -distXNorm * planet.mass / (dist * dist);
                    forceY += 100 * -distYNorm * planet.mass / (dist * dist);
                }

                this.dx += forceX;
                this.dy += forceY;
            }

            if (this.dx > 10) this.dx = 10;
            if (this.dx < -10) this.dx = -10;
            if (this.dy > 10) this.dy = 10;
            if (this.dy < -10) this.dy = -10;

            this.x += this.dx;
            this.y += this.dy;

            // If we are going off the edge of the map, don't go further
            if (this.x < -MAP_SIDE_LENGTH / 2 + this.width / 2) this.x = -MAP_SIDE_LENGTH / 2 + this.width / 2;
            if (this.x > MAP_SIDE_LENGTH / 2 - this.width / 2) this.x = MAP_SIDE_LENGTH / 2 - this.width / 2;
            if (this.y < -MAP_SIDE_LENGTH / 2 + this.height / 2) this.y = -MAP_SIDE_LENGTH / 2 + this.height / 2;
            if (this.y > MAP_SIDE_LENGTH / 2 - this.height / 2) this.y = MAP_SIDE_LENGTH / 2 - this.height / 2;


            // Update sprite animations
            this.frameTimer++;
            if (this.frameTimer > this.frameLength) {
                this.frameTimer = 0
                this.curFrame++;
                if (this.curFrame >= this.frames) {
                    this.curFrame = 0;
                }
            }

        },
        draw: function() {
            ctx.drawImage(
                this.image, 
                this.curFrame * this.width,
                0,
                this.width,
                this.height,
                (this.x - this.width / 2) - camera.x,
                (this.y - this.height / 2) - camera.y,
                this.width,
                this.height);
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

function drawMinimap(player, aliens, planets) {
    var shrinkFactor = (MAP_SIDE_LENGTH / MINIMAP_SIDE_LENGTH);
    ctx.strokeStyle = 'white';
    ctx.strokeRect(SCREEN_WIDTH - MINIMAP_SIDE_LENGTH, 
                   SCREEN_HEIGHT - MINIMAP_SIDE_LENGTH,
                   SCREEN_WIDTH,
                   SCREEN_HEIGHT);

    var plotX = player.x / shrinkFactor;
    var plotY = player.y / shrinkFactor;
    ctx.beginPath();
    ctx.arc(Math.floor(SCREEN_WIDTH - (MINIMAP_SIDE_LENGTH / 2) + plotX),
            Math.floor(SCREEN_HEIGHT - (MINIMAP_SIDE_LENGTH / 2) + plotY), 
            4, 0, 2 * Math.PI, false);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    for (var i = 0; i < planets.length; i++) {
        var plotX = aliens[i].x / shrinkFactor;
        var plotY = aliens[i].y / shrinkFactor;
        ctx.beginPath();
        ctx.arc(Math.floor(SCREEN_WIDTH - (MINIMAP_SIDE_LENGTH / 2) + plotX),
                Math.floor(SCREEN_HEIGHT - (MINIMAP_SIDE_LENGTH / 2) + plotY), 
                2, 0, 2 * Math.PI, false);
        ctx.fillStyle = '#00FF00';
        ctx.fill();
    }
    for (var i = 0; i < planets.length; i++) {
        // TODO make each planet a different color
        // draw the planets
        var plotX = planets[i].x / shrinkFactor;
        var plotY = planets[i].y / shrinkFactor;
        ctx.beginPath();
        ctx.arc(Math.floor(SCREEN_WIDTH - (MINIMAP_SIDE_LENGTH / 2) + plotX),
                Math.floor(SCREEN_HEIGHT - (MINIMAP_SIDE_LENGTH / 2) + plotY), 
                planets[i].height / (2* shrinkFactor), 0, 2 * Math.PI, false);
        ctx.fillStyle = planets[i].color;
        ctx.fill();

    }
    // draw a rectangle around the screen
    var cameraX = SCREEN_WIDTH - (MINIMAP_SIDE_LENGTH / 2 ) + (camera.x / shrinkFactor);
    var cameraY = SCREEN_HEIGHT - (MINIMAP_SIDE_LENGTH / 2 ) + (camera.y / shrinkFactor);
        
    ctx.strokeStyle = 'white';
    ctx.strokeRect(Math.floor(cameraX),
                   Math.floor(cameraY),
                   Math.floor(SCREEN_WIDTH / shrinkFactor),
                   Math.floor(SCREEN_HEIGHT / shrinkFactor));
}


function drawStarfield() {
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
            Planet('sun', 'FF0000', 0.0, 0, 100),
            Planet('mercury', '#C4C462', Math.random() * 2 * Math.PI,  300, 100),
            Planet('venus',   '#FF8000', Math.random() * 2 * Math.PI,  400, 200),
            Planet('earth',   '#0000FF', Math.random() * 2 * Math.PI,  500, 200),
            Planet('mars',    '#FF0000', Math.random() * 2 * Math.PI,  600, 200),
            Planet('jupiter', '#FF8000', Math.random() * 2 * Math.PI, 700,  700),
            Planet('saturn',  '#808000', Math.random() * 2 * Math.PI, 850,  500),
            Planet('uranus',  '#008080', Math.random() * 2 * Math.PI, 1000, 400),
            Planet('neptune', '#0000FF', Math.random() * 2 * Math.PI, 1150, 400)
        ];

        var wave = 1;
        var aliens = [];
        for (var i = 0; i < 100; i++) {
            aliens.push(Alien(-1000 / 2 + Math.random() * 100, -1000 / 2 + Math.random() * 100));
        }

        camera = Camera();

        var player = Player();

        var mainLoop = function() {
            // Show the loading screen if we are still loading things
            if (numLoading > 0) {
                ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
                ctx.fillText("Definitely Loading...", 50, 50);
            }


            ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
            // Update everything
            player.update(planets);
            camera.update(player);
            for (var i = 0; i < planets.length; i++) {
                planets[i].update();
            }
            for (var i = 0; i < aliens.length; i++) {
                aliens[i].update(planets);
            }
            //alienSpawner(

            // Draw everything
            drawStarfield();
            for (var i = 0; i < planets.length; i++) {
                planets[i].draw();
            }
            for (var i = 0; i < aliens.length; i++) {
                aliens[i].draw();
            }
            player.draw();
            drawMinimap(player, aliens, planets);

            setTimeout(mainLoop, FPS);
        };
        setTimeout(mainLoop, FPS);
    });
});
