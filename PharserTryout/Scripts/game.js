var SimpleGame = (function () {
    function SimpleGame() {
        this.game = new Phaser.Game(800, 600, Phaser.AUTO, 'content', {
            create: this.create, preload: this.preload, update: this.update
        });
    }
    SimpleGame.prototype.preload = function () {
        this.game.load.image("tank", "../Resources/tank.png");
        this.game.load.image("bullet", "../Resources/bullet.png");
        this.game.stage.disableVisibilityChange = true;
    };
    SimpleGame.prototype.create = function () {
        this.game.physics.startSystem(Phaser.Physics.ARCADE);
        this.tank = new Tank(this.game, "tank", "bullet");
        // Inputs.
        var W = this.game.input.keyboard.addKey(Phaser.Keyboard.W);
        var A = this.game.input.keyboard.addKey(Phaser.Keyboard.A);
        var S = this.game.input.keyboard.addKey(Phaser.Keyboard.S);
        var D = this.game.input.keyboard.addKey(Phaser.Keyboard.D);
        var P = this.game.input.keyboard.addKey(Phaser.Keyboard.P);
        // Keydown
        W.onDown.add(SimpleGame.prototype.moveTank, this);
        A.onDown.add(SimpleGame.prototype.moveTank, this);
        S.onDown.add(SimpleGame.prototype.moveTank, this);
        D.onDown.add(SimpleGame.prototype.moveTank, this);
        P.onDown.add(SimpleGame.prototype.fireGun, this);
        // Keyup
        W.onUp.add(SimpleGame.prototype.stopTank, this);
        A.onUp.add(SimpleGame.prototype.stopTank, this);
        S.onUp.add(SimpleGame.prototype.stopTank, this);
        D.onUp.add(SimpleGame.prototype.stopTank, this);
    };
    SimpleGame.prototype.update = function () {
        this.tank.tankMove();
    };
    SimpleGame.prototype.stopTank = function (e) {
        var shouldStop = false;
        switch (e.event.key) {
            case "w":
                shouldStop = this.tank.getDirection() === Directions.Up;
                break;
            case "a":
                shouldStop = this.tank.getDirection() === Directions.Left;
                break;
            case "s":
                shouldStop = this.tank.getDirection() === Directions.Down;
                break;
            case "d":
                shouldStop = this.tank.getDirection() === Directions.Right;
                break;
        }
        if (shouldStop) {
            this.tank.tankEndMove();
        }
    };
    SimpleGame.prototype.moveTank = function (e) {
        switch (e.event.key) {
            case "w":
                this.tank.tankStartMove(Directions.Up);
                return;
            case "a":
                this.tank.tankStartMove(Directions.Left);
                return;
            case "s":
                this.tank.tankStartMove(Directions.Down);
                return;
            case "d":
                this.tank.tankStartMove(Directions.Right);
                return;
        }
    };
    SimpleGame.prototype.fireGun = function () {
        this.tank.tankFire();
    };
    return SimpleGame;
}());
window.onload = function () {
    var game = new SimpleGame();
};
var Directions;
(function (Directions) {
    Directions[Directions["Up"] = 0] = "Up";
    Directions[Directions["Down"] = 1] = "Down";
    Directions[Directions["Left"] = 2] = "Left";
    Directions[Directions["Right"] = 3] = "Right";
    Directions[Directions["None"] = 4] = "None";
})(Directions || (Directions = {}));
var Tank = (function () {
    function Tank(game, spriteName, bulletName) {
        this.tankSpeed = 3;
        this.ownerGame = game;
        // Create tank.
        this.tank = game.add.sprite(game.width / 2, game.height / 2, spriteName);
        this.tank.anchor.set(0.5, 0.5);
        // Tank physics.
        game.physics.enable(this.tank, Phaser.Physics.ARCADE);
        this.tank.body.collideWorldBounds = true;
        this.tank.body.bounce.y = 1;
        this.tank.body.bounce.x = 0.5;
        // Create bullets.
        this.bullets = game.add.group();
        this.bullets.enableBody = true;
        this.bullets.physicsBodyType = Phaser.Physics.ARCADE;
        this.bullets.createMultiple(30, bulletName);
        this.bullets.setAll("checkWorldBounds", true);
        this.bullets.setAll("outOfBoundsKill", true);
    }
    Tank.prototype.tankStartMove = function (d) {
        this.direction = d;
        switch (d) {
            case Directions.Up:
                this.tank.angle = 0;
                return;
            case Directions.Left:
                this.tank.angle = -90;
                return;
            case Directions.Down:
                this.tank.angle = 180;
                return;
            case Directions.Right:
                this.tank.angle = 90;
                return;
        }
    };
    Tank.prototype.getDirection = function () {
        return this.direction;
    };
    Tank.prototype.tankEndMove = function () {
        this.direction = Directions.None;
    };
    Tank.prototype.tankMove = function () {
        switch (this.direction) {
            case Directions.None:
                return;
            case Directions.Up:
                this.tank.position.add(0, -1 * this.tankSpeed);
                return;
            case Directions.Down:
                this.tank.position.add(0, this.tankSpeed);
                return;
            case Directions.Left:
                this.tank.position.add(-1 * this.tankSpeed, 0);
                return;
            case Directions.Right:
                this.tank.position.add(this.tankSpeed, 0);
                return;
            default:
        }
    };
    Tank.prototype.tankFire = function () {
        var randomAngleOffset = (Math.random() - 0.5) * 0.2;
        var halfLength = this.tank.height / 2;
        var theta = this.tank.angle / 360 * 6.283 + randomAngleOffset;
        var xOffset = Math.sin(theta) * halfLength;
        var yOffset = -1 * Math.cos(theta) * halfLength;
        var bullet = this.bullets.getFirstDead();
        bullet.anchor.set(0.5, 0.5);
        bullet.angle = this.tank.angle;
        bullet.reset(this.tank.x + xOffset, this.tank.y + yOffset);
        var longway = 10000;
        xOffset = Math.sin(theta) * longway;
        yOffset = -1 * Math.cos(theta) * longway;
        this.ownerGame.physics.arcade.moveToXY(bullet, this.tank.x + xOffset, this.tank.y + yOffset, 1000);
    };
    return Tank;
}());
//# sourceMappingURL=game.js.map