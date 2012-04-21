var SCREEN_WIDTH = 800;
var SCREEN_HEIGHT = 600;

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
    neptune: 'images/neptune.png'
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
            this.theta -= this.orbit_speed;
            //TODO - normalize this angle - while larger than 2pi subtract 2pi

            this.x = Math.cos(this.theta) * this.orbit_distance;
            this.y = Math.sin(this.theta) * this.orbit_distance;
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
        x: 0,
        y: 0,
        scroll_speed: 10,

        update: function () {
            this.x += (keys.right - keys.left) * this.scroll_speed;
            this.y += (keys.down - keys.up) * this.scroll_speed;
        }
    }
}


$(document).ready(function(){
    var ctx = $('#game').get(0).getContext('2d');

    $(document).keyup(function(e) {handleKeyEvent(0, e);});
    $(document).keydown(function(e) {handleKeyEvent(1, e);});

    loadImages(function() {

        var planets = [
            Planet('sun', 0.0, 0, 0),
            Planet('mercury', 0.0, 100, 4),
            Planet('venus', 0.0, 200, 4),
            Planet('earth', 0.0, 300, 4),
            Planet('mars', 0.0, 400, 4),
            Planet('jupiter', 0.0, 500, 4),
            Planet('saturn', 0.0, 600, 4),
            Planet('uranus', 0.0, 700, 4),
            Planet('neptune', 0.0, 800, 4),
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
            ctx.clearRect(0,0,SCREEN_WIDTH, SCREEN_HEIGHT);
            for (var i = 0; i < planets.length; i++) {
                planets[i].draw(ctx, camera);
            }

            setTimeout(mainLoop, FPS);
        };
        setTimeout(mainLoop, FPS);
    });
});
