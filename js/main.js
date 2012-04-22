var SCREEN_WIDTH;
var SCREEN_HEIGHT;
// the distance from the center in each direction the map extends
var MAP_SIDE_LENGTH = 5000;
var MINIMAP_SIDE_LENGTH = 200;

var punching = false;
var score = 0;

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
    player_flying: 'images/player_flying.png',
    player_punching: 'images/player_punching.png',
    alien: 'images/alien.png',
    alien_dying: 'images/alien_dying.png'
};
var sounds = {};

var keys = {
    up: 0,
    down: 0,
    left: 0,
    right: 0,
    space: 0
};

function handleKeyEvent(state, e) {
    switch(e.which) {
        case 32:
            keys.space = state;
            break;
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

function Animation(image, numFrames, frameSpeed, frameWidth, frameHeight, loop, callback) {
    return {
        image: image,
        curFrame: 0,
        loop: loop,
        frameWidth: frameWidth,
        frameHeight: frameHeight,
        numFrames: numFrames,
        frameSpeed: frameSpeed,
        ticksLeft: frameSpeed,
        paused: false,
        callback: callback,
        start: function () {
            this.curFrame = 0;
            this.ticksLeft = this.frameSpeed;
        },
        pause: function () {
            this.paused = true;
        },
        unpause: function () {
            this.paused = false;
        },
        update: function () {
            if (!this.paused) {
                this.ticksLeft--;
                if (this.ticksLeft <= 0) {
                    this.ticksLeft = this.frameSpeed;
                    this.curFrame++;
                    if (this.curFrame >= this.numFrames) {
                        if (this.loop) {
                            this.curFrame = 0;
                        }
                        else {
                            this.callback();
                        }
                    }
                }
            }
        },
        draw: function(x, y) {
            ctx.drawImage(
                this.image, 
                this.curFrame * this.frameWidth,
                0,
                this.frameWidth,
                this.frameHeight,
                x,
                y, 
                this.frameWidth,
                this.frameHeight);
        }
    };
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
        shakesLeft: 0,

        // TODO make the planets strongest repulsion force be at their surface, not their center
        update: function() {
            this.theta += this.orbit_speed;
            //TODO - normalize this angle - while larger than 2pi subtract 2pi

            this.x = Math.floor(Math.cos(this.theta) * this.orbit_distance);
            this.y = Math.floor(Math.sin(this.theta) * this.orbit_distance);
        },
        impact: function() {
            this.shakesLeft = 5;
        },
        draw: function() {
            // Always use height because Saturn is too wide
            var drawX = (this.x - this.width / 2) - camera.x;
            var drawY = (this.y - this.height / 2) - camera.y;
            if (this.shakesLeft > 0) {
                drawX += Math.random() * 20 - 10;
                drawY += Math.random() * 20 - 10;
                this.shakesLeft--;
            }

            ctx.beginPath()
            ctx.arc(-camera.x, -camera.y, this.orbit_distance, 0, 2 * Math.PI, false);
            ctx.strokeStyle = '#444';
            ctx.stroke();
            ctx.drawImage(this.image, drawX, drawY);
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
        x: 0,
        y: 0,
        dx: 0.0,
        dy: 0.0,
        friction: 4.0,
        animations: {
            'grounded': Animation(images['player'], 3, 3, 100, 100, true),
            'flying': Animation(images['player_flying'], 3, 3, 100, 100, true),
            'punching': Animation(images['player_punching'], 4, 4, 100, 100, false, function() {
                punching = false;
            })
        },
        width: 100,
        height: 100,
        state: 'grounded',

        attachedPlanet: null,
        planetXOffset: null,
        planetYOffset: null,

        update: function(planets, shockwaves) {
            // Restore the previous attachment point if any
            if (this.planetXOffset !== null && this.planetYOffset !== null) {
                this.x = this.attachedPlanet.x + this.planetXOffset;
                this.y = this.attachedPlanet.y + this.planetYOffset;
            }
            else {
                //console.log('cant find attachment');
            }

            var inPlanet = false;
            for (var i = 0; i < planets.length; i++) {
                var planet = planets[i];

                var centerDist = Math.sqrt((this.x - planet.x) * (this.x - planet.x) + (this.y - planet.y) * (this.y - planet.y));
                if (centerDist < planet.height / 2) {
                    this.attachedPlanet = planet;
                    if (this.state === 'flying') {
                        planet.impact();
                        sounds['landing'].play();
                    }
                    this.state = 'grounded';
                    inPlanet = true;
                    break;
                }
            }
            if (!inPlanet) {
                //console.log('not in planet');
                if (this.state === 'grounded') {
                    // give a speed boost to take off with
                    this.dx *= 4;
                    this.dy *= 4;
                    sounds['takeoff'].play();
                }
                this.state = 'flying';
                this.attachedPlanet = null,
                this.planetXOffset = null;
                this.planetYOffset = null;
            }

            if (this.state === 'grounded') {
                //console.log('grounded');
                // Handle movement
                this.dx += (keys.right - keys.left) * 1;
                this.dy += (keys.down - keys.up) * 1;
                // Dampen movement if not holding arrow keys
                if (!keys.right && !keys.left) {
                    if (this.dx > 0) {
                        this.dx -= this.friction;
                        if (this.dx < 0) {
                            this.dx = 0;
                        }
                    }
                    if (this.dx < 0) {
                        this.dx += this.friction;
                        if (this.dx > 0) {
                            this.dx = 0;
                        }
                    }
                }
                if (!keys.up && !keys.down) {
                    if (this.dy > 0) {
                        this.dy -= this.friction;
                        if (this.dy < 0) {
                            this.dy = 0;
                        }
                    }
                    if (this.dy < 0) {
                        this.dy += this.friction;
                        if (this.dy > 0) {
                            this.dy = 0;
                        }
                    }
                }
                this.x += this.dx;
                this.y += this.dy;

                // Don't play the animation if we aren't moving
                if (this.dx < 0.001 && this.dx > -0.001 && this.dy < 0.001 && this.dy > -0.001) {
                    this.animations[this.state].pause();
                }
                else {
                    this.animations[this.state].unpause();
                }

                // If we are still on the planet, store the attachment point
                var centerDist = Math.sqrt((this.x - planet.x) * (this.x - planet.x) + (this.y - planet.y) * (this.y - planet.y));
                if (centerDist < this.attachedPlanet.height / 2) {
                    this.planetXOffset = this.x - this.attachedPlanet.x;
                    this.planetYOffset = this.y - this.attachedPlanet.y;
                }
                else {
                    this.planetXOffset = null;
                    this.planetYOffset = null;
                }
            }
            if (this.state === 'flying') {
                //console.log('flying');
                for (var i = 0; i < planets.length; i++) {
                    var planet = planets[i];

                    var centerDistX = this.x - planet.x;
                    var centerDistY = this.y - planet.y;

                    var centerDist = Math.sqrt((this.x - planet.x) * (this.x - planet.x) + (this.y - planet.y) * (this.y - planet.y));

                    // We are off the planet, apply gravity
                    var centerDistXNorm = centerDistX / centerDist;
                    var centerDistYNorm = centerDistY / centerDist;

                    var forceX = 50 * -centerDistXNorm * planet.mass / (centerDist * centerDist);
                    var forceY = 50 * -centerDistYNorm * planet.mass / (centerDist * centerDist);

                    this.dx += forceX;
                    this.dy += forceY;

                    // We are off the planet, clear the attachment point
                    this.planetXOffset = null;
                    this.planetYOffset = null;
                }
                // Make changing direction easier
                var thrust = 2;
                if (this.dx > 0 && keys.left) thrust = 4;
                if (this.dx < 0 && keys.right) thrust = 4;
                if (this.dy > 0 && keys.up) thrust = 4;
                if (this.dy < 0 && keys.down) thrust = 4;

                this.dx += (keys.right - keys.left) * thrust;
                this.dy += (keys.down - keys.up) * thrust;

                this.x += this.dx;
                this.y += this.dy;
            }

            if (this.dx > 20) this.dx = 20;
            if (this.dx < -20) this.dx = -20;
            if (this.dy > 20) this.dy = 20;
            if (this.dy < -20) this.dy = -20;

            // If we are going off the edge of the map, don't go further
            if (this.x < -MAP_SIDE_LENGTH / 2 + this.width / 2) this.x = -MAP_SIDE_LENGTH / 2 + this.width / 2;
            if (this.x > MAP_SIDE_LENGTH / 2 - this.width / 2) this.x = MAP_SIDE_LENGTH / 2 - this.width / 2;
            if (this.y < -MAP_SIDE_LENGTH / 2 + this.height / 2) this.y = -MAP_SIDE_LENGTH / 2 + this.height / 2;
            if (this.y > MAP_SIDE_LENGTH / 2 - this.height / 2) this.y = MAP_SIDE_LENGTH / 2 - this.height / 2;



            // Do a punch if spacebar is pressed
            if (keys.space && punching == false) {
                sounds['punch'].play();
                punching = true;
                this.animations['punching'].start();
                shockwaves.push(Shockwave(this.x, this.y));
            }

            if (punching) {
                this.animations['punching'].update();
            }
            else {
                this.animations[this.state].update();
            }
        },
        draw: function() {
            var animation = this.state;
            if (punching) {
                animation = 'punching';
            }
            this.animations[animation].draw(
                (this.x - this.width / 2) - camera.x,
                (this.y - this.height / 2) - camera.y
            );
        }
    };
}


function pointInPlanet(ptX, ptY, planets) {
    var intersectingPlanet = null;
    for (var i = 0; i < planets.length; i++) {
        var planet = planets[i];

        var dist = Math.sqrt((ptX - planet.x) * (ptX - planet.x) + (ptY - planet.y) * (ptY - planet.y));
        if (dist < planet.height / 2) {
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
        shockwaveDX: 0,
        shockwaveDY: 0,
        thrust: 3.0,

        animations: {
            'alive': Animation(images['alien'], 3, 15, 50, 40, true),
            'dying': Animation(images['alien_dying'], 3, 15, 50, 40, true),
        },

        width: 50,
        height: 40,

        state: 'alive',

        update: function(planets) {
            if (this.state === 'alive') {
                // Apply gravity and repulsion from all planets
                for (var i = 0; i < planets.length; i++) {
                    var planet = planets[i];

                    var centerDistX = this.x - planet.x;
                    var centerDistY = this.y - planet.y;

                    var centerDist = Math.sqrt((this.x - planet.x) * (this.x - planet.x) + (this.y - planet.y) * (this.y - planet.y));
                    var surfaceDist = centerDist - planet.height / 2;

                    // Find the distances from the surface of the planet, not the center
                    var surfaceDistX = centerDistX - (centerDistX * ((planet.height / 2) / centerDist));
                    var surfaceDistY = centerDistY - (centerDistY * ((planet.height / 2) / centerDist));

                    var surfaceDistXNorm = surfaceDistX / surfaceDist;
                    var surfaceDistYNorm = surfaceDistY / surfaceDist;

                    var centerDistXNorm = centerDistX / centerDist;
                    var centerDistYNorm = centerDistY / centerDist;

                    var forceX = 0;
                    var forceY = 0;

                    var evasionDist = 200;
                    if (surfaceDist < evasionDist) {

                        var distXNormPerp = -surfaceDistYNorm;
                        var distYNormPerp = surfaceDistXNorm;

                        var evasionPercent = ((evasionDist - surfaceDist) / evasionDist);

                        forceX += surfaceDistXNorm * this.thrust * evasionPercent * evasionPercent;
                        forceY += surfaceDistYNorm * this.thrust * evasionPercent * evasionPercent;
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
                        forceX += 100 * -centerDistXNorm * planet.mass / (centerDist * centerDist);
                        forceY += 100 * -centerDistYNorm * planet.mass / (centerDist * centerDist);
                    }

                    this.dx += forceX;
                    this.dy += forceY;
                
                    if (surfaceDist < 0) {
                        // We are inside the planet - kill the alien
                        this.state = 'dying';
                        this.curImage = this.dyingImage;
                        this.numFrames = this.dyingNumFrames;
                        planet.impact();
                        sounds['explosion'].play();
                    }
                }

                if (this.dx > 10) this.dx = 10;
                if (this.dx < -10) this.dx = -10;
                if (this.dy > 10) this.dy = 10;
                if (this.dy < -10) this.dy = -10;

                this.x += this.dx;
                this.y += this.dy;

                this.x += this.shockwaveDX;
                this.y += this.shockwaveDY;

                if (this.shockwaveDX > 0) {
                    this.shockwaveDX -= this.thrust / 2;
                    if (this.shockwaveDX < 0) {
                        this.shockwaveDX = 0;
                    }
                }
                if (this.shockwaveDX < 0) {
                    this.shockwaveDX += this.thrust / 2;
                    if (this.shockwaveDX > 0) {
                        this.shockwaveDX = 0;
                    }
                }
                if (this.shockwaveDY > 0) {
                    this.shockwaveDY -= this.thrust / 2;
                    if (this.shockwaveDY < 0) {
                        this.shockwaveDY = 0;
                    }
                }
                if (this.shockwaveDY < 0) {
                    this.shockwaveDY += this.thrust / 2;
                    if (this.shockwaveDY > 0) {
                        this.shockwaveDY = 0;
                    }
                }

                // If an alien goes off the side of the map it dies
                if (this.x < -MAP_SIDE_LENGTH / 2 + this.width / 2 ||
                    this.x > MAP_SIDE_LENGTH / 2 - this.width / 2 ||
                    this.y < -MAP_SIDE_LENGTH / 2 + this.height / 2 ||
                    this.y > MAP_SIDE_LENGTH / 2 - this.height / 2) {
                        this.state = 'dying';
                        this.curImage = this.dyingImage;
                        this.numFrames = this.dyingNumFrames;
                        planet.impact();
                        sounds['explosion'].play();
                }
            }
            else if (this.state === 'dying') {
                this.dy += 1;
                this.x += this.dx;
                this.y += this.dy;
            }


            this.animations[this.state].update();

        },
        draw: function() {
            this.animations[this.state].draw(
                (this.x - this.width / 2) - camera.x,
                (this.y - this.height / 2) - camera.y
            );
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

function AlienSpawner(aliens) {
    return {
        aliens: aliens,
        timeTillSpawn: 60 * 20,
        countdown: 0,
        nextSpawnCount: 5,
        warningMessage: '',
        warningCountdown: 180,
        update: function() {
            this.countdown--;
            if (this.countdown <= 0) {
                for (var i = 0; i < this.nextSpawnCount; i++) {
                    aliens.push(Alien(-2000 + Math.random() * 1000, -2000 + Math.random() * 1000));
                }
                this.countdown = this.timeTillSpawn;
                this.warningMessage = this.nextSpawnCount + ' Huge Aliens Have Arrived!';
                this.warningCountdown = 180;
                this.nextSpawnCount = this.nextSpawnCount * 2;
                sounds['new_wave'].play();
            }
        },
        draw: function() {
            ctx.fillStyle = 'white';
            ctx.fillText("New Aliens In: " + this.countdown, 20, 40);
            ctx.fillText("SCORE: " + score, 20, 80);
            if (this.warningCountdown > 0) {
                this.warningCountdown--;
                ctx.fillText(this.warningMessage, 20, SCREEN_HEIGHT - 20);
            }
        }
    };
}

function Shockwave(x, y) {
    return {
        x: x,
        y: y,
        radius: 0,
        maxRadius: 200,
        update: function(aliens, shockwaves) {
            for (var i = 0; i < aliens.length; i++) {
                var alien = aliens[i];

                var dist = Math.sqrt((this.x - alien.x) * (this.x - alien.x) + (this.y - alien.y) * (this.y - alien.y));
                if (dist < this.radius) {

                    // calculate the normal vector
                    var distX = this.x - alien.x;
                    var distY = this.y - alien.y;

                    var distXNorm = distX / dist;
                    var distYNorm = distY / dist;

                    // Accelerate the alien in the direction of the normal
                    alien.shockwaveDX += -distXNorm * 40;
                    alien.shockwaveDY += -distYNorm * 40;
                    
                }
            }
            this.radius+=40;
            if (this.radius > this.maxRadius) {
                shockwaves.splice(shockwaves.indexOf(this), 1)
            }
        },
        draw: function() {
            ctx.beginPath();
            ctx.arc(this.x - camera.x, this.y - camera.y, this.radius, 0, 2 * Math.PI, false);
            var opacity = 1; /1; ///0.5 + (this.maxRadius - this.radius) / this.maxRadius;
            ctx.fillStyle = 'rgba(255, 255, 255, '+ opacity +')';
            ctx.fill();
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

    for (var i = 0; i < aliens.length; i++) {
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

soundManager.flashVersion = 9;
soundManager.useHighPerformance = true;
soundManager.useFastPolling = true;

soundManager.url = 'swf/';
soundManager.debugMode = false;
soundManager.consoleOnly = false;
soundManager.debugFlash = false;
soundManager.waitForWindowLoad = true;

soundManager.onready(function(oStatus) {

    if (!oStatus.success) {
        //return false;   
        console.log('no sound');
    }

    sounds = {
        'explosion': soundManager.createSound({id: 'explosion', url: 'sounds/explosion.mp3', autoLoad: true}),
        'punch': soundManager.createSound({id: 'punch', url: 'sounds/punch.mp3', autoLoad: true}),
        'new_wave': soundManager.createSound({id: 'new_wave', url: 'sounds/new_wave.mp3', autoLoad: true}),
        'takeoff': soundManager.createSound({id: 'takeoff', url: 'sounds/takeoff.mp3', autoLoad: true}),
        'landing': soundManager.createSound({id: 'landing', url: 'sounds/landing.mp3', autoLoad: true}),
        'laser_shoot': soundManager.createSound({id: 'laser_shoot', url: 'sounds/laser_shoot.mp3', autoLoad: true})
    };

    var bgm = soundManager.createSound({id: 'bgm', url: 'sounds/bgm.mp3', autoLoad: true, loops: 100000, onload: function(){this.play();}});

    $(document).ready(function(){

        SCREEN_WIDTH = $(window).width() - 10;
        SCREEN_HEIGHT = $(window).height() - 10;

        var $canvas = $('<canvas id="game">').attr('width', SCREEN_WIDTH).attr('height', SCREEN_HEIGHT);
        $('body').append($canvas);
        ctx = $('#game').get(0).getContext('2d');

        $(document).keyup(function(e) {handleKeyEvent(0, e);});
        $(document).keydown(function(e) {handleKeyEvent(1, e);});

        $(window).resize(function () {
            SCREEN_WIDTH = $(window).width() - 10;
            SCREEN_HEIGHT = $(window).height() - 10;
            $canvas.attr('width', SCREEN_WIDTH).attr('height', SCREEN_HEIGHT);
            ctx = $canvas.get(0).getContext('2d');
            ctx.font = "bold 24px Inconsolata";
        });

        loadImages(function() {

            var planets = [
                Planet('sun', 'FF0000', 0.0, 0, 1000),
                Planet('mercury', '#C4C462', Math.random() * 2 * Math.PI,  300, 100),
                Planet('venus',   '#FF8000', Math.random() * 2 * Math.PI,  400, 200),
                Planet('earth',   '#0000FF', Math.random() * 2 * Math.PI,  500, 200),
                Planet('mars',    '#FF0000', Math.random() * 2 * Math.PI,  600, 200),
                Planet('jupiter', '#FF8000', Math.random() * 2 * Math.PI, 700,  700),
                Planet('saturn',  '#808000', Math.random() * 2 * Math.PI, 850,  500),
                Planet('uranus',  '#008080', Math.random() * 2 * Math.PI, 1000, 400),
                Planet('neptune', '#0000FF', Math.random() * 2 * Math.PI, 1150, 400)
            ];
            var aliens = [];

            camera = Camera();

            var shockwaves = [];

            var player = Player();
            

            ctx.font = "bold 24px Inconsolata";
            var spawner = AlienSpawner(aliens);

            var mainLoop = function() {
                // Show the loading screen if we are still loading things
                if (numLoading > 0) {
                    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
                    ctx.fillText("Definitely Loading...", 50, 50);
                }


                ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
                // Update everything
                // Update planets before player since we may be riding a planet
                spawner.update();
                for (var i = 0; i < planets.length; i++) {
                    planets[i].update();
                }
                player.update(planets, shockwaves);
                for (var i = 0; i < shockwaves.length; i++) {
                    shockwaves[i].update(aliens, shockwaves);
                }
                camera.update(player);
                for (var i = 0; i < aliens.length; i++) {
                    aliens[i].update(planets);
                }

                // Draw everything
                drawStarfield();
                for (var i = 0; i < planets.length; i++) {
                    planets[i].draw();
                }
                for (var i = 0; i < aliens.length; i++) {
                    aliens[i].draw();
                }
                for (var i = 0; i < shockwaves.length; i++) {
                    shockwaves[i].draw();
                }
                player.draw();
                drawMinimap(player, aliens, planets);
                spawner.draw();

                setTimeout(mainLoop, FPS);
            };
            setTimeout(mainLoop, FPS);
        });
    });
});

