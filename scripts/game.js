var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
// Parameters  
var FireRate = 200;
var BulletSpeed = 2000;
var BloodTextOffset = 60;
var Damage = 20;
var MaxVelocity = 500;
var Acceleration = 300;
var AngleOffsetBase = 0.1 * Math.PI; // degree.
var GridHeight = 50;
var GridWidth = 90;
var GameHeight = 3000;
var GameWidth = 3000;
var ShadowRadius = 300;
// Names
var SandbagName = "sandbag";
var TankbodyName = "tankbody";
var GuntowerName = "guntower";
var BulletName = "bullet";
var ParticleName = "particle";
var TowerbodyName = "towerbody";
var TowershooterName = "towershooter";
// Socket-message names
var TankUpdateEventName = "tankUpdate";
var TankUpdateGlobalEventName = "tankUpdateGlobal";
var AddNewEventName = "addNew";
var AddNewGlobalEventName = "addNewGlobal";
var GoneEventName = "gone";
var GoneGlobalEventName = "goneGlobal";
var HitEventName = "hit";
var HitGlobalEventName = "hitGlobal";
var Directions;
(function (Directions) {
    Directions[Directions["None"] = 0] = "None";
    Directions[Directions["Up"] = 2] = "Up";
    Directions[Directions["Down"] = 4] = "Down";
    Directions[Directions["Left"] = 8] = "Left";
    Directions[Directions["Right"] = 16] = "Right";
    Directions[Directions["UpLeft"] = 10] = "UpLeft";
    Directions[Directions["UpRight"] = 18] = "UpRight";
    Directions[Directions["DownLeft"] = 12] = "DownLeft";
    Directions[Directions["DownRight"] = 20] = "DownRight";
})(Directions || (Directions = {}));
var Inputs = (function () {
    function Inputs() {
    }
    Inputs.prototype.setupKeys = function (self) {
        for (var _i = 0, _a = [Phaser.Keyboard.W, Phaser.Keyboard.A,
            Phaser.Keyboard.S, Phaser.Keyboard.D,
            Phaser.Keyboard.UP, Phaser.Keyboard.LEFT,
            Phaser.Keyboard.DOWN, Phaser.Keyboard.RIGHT]; _i < _a.length; _i++) {
            var key = _a[_i];
            Inputs.prototype.registerKeyInputs.call(self, key, Inputs.prototype.onKeyDown, Inputs.prototype.onKeyUp);
        }
    };
    Inputs.prototype.onKeyDown = function (e) {
        var addDirection = Inputs.mapKeyToDirection(e.event.key);
        this._player.addDirection(addDirection);
    };
    Inputs.prototype.onKeyUp = function (e) {
        var removeDirection = Inputs.mapKeyToDirection(e.event.key);
        this._player.removeDirection(removeDirection);
    };
    Inputs.prototype.registerKeyInputs = function (key, keydownHandler, keyupHandler) {
        var realKey = this.game.input.keyboard.addKey(key);
        if (keydownHandler != null)
            realKey.onDown.add(keydownHandler, this);
        if (keyupHandler != null)
            realKey.onUp.add(keyupHandler, this);
    };
    Inputs.mapKeyToDirection = function (key) {
        var direction = Directions.None;
        switch (key) {
            case "w":
            case "ArrowUp":
                direction = Directions.Up;
                break;
            case "a":
            case "ArrowLeft":
                direction = Directions.Left;
                break;
            case "s":
            case "ArrowDown":
                direction = Directions.Down;
                break;
            case "d":
            case "ArrowRight":
                direction = Directions.Right;
                break;
        }
        return direction;
    };
    return Inputs;
}());
var Socket = (function () {
    function Socket() {
    }
    Socket.prototype.setupSocket = function (self) {
        self._socket = io();
        // Add new -> show.
        self._socket.on(AddNewGlobalEventName, function (player) {
            Socket.updateEnemyByJson(self, player);
        });
        // Update -> update.
        self._socket.on(TankUpdateGlobalEventName, function (player) {
            Socket.updateEnemyByJson(self, player);
            if (player.firing != undefined) {
                self._miniMap.blinkEnemy(player.x, player.y);
            }
        });
        self._socket.on(GoneGlobalEventName, function (player) {
            // If player has no blood, remove it from the list.
            var tank = Socket.removeEnemyByJson(self, player);
            TankHelper.onExplode(tank);
        });
        self._socket.emit(AddNewEventName, self._player.getJson(undefined));
    };
    Socket.prototype.sendMessage = function (messageName, message) {
        if (message != undefined) {
            this._socket.emit(messageName, message);
        }
    };
    Socket.updateEnemyByJson = function (self, enemy) {
        var tank = Socket.getOrAddEnemy(self, enemy);
        tank.updateAsPuppet(enemy);
    };
    Socket.removeEnemyByJson = function (self, enemy) {
        // TODO: Refactor these ugly logic.
        var foundTank = undefined;
        self._enemies.forEach(function (item) {
            if (enemy.tankId == item.id) {
                foundTank = item;
            }
        });
        var index = self._enemies.indexOf(foundTank);
        if (index > -1) {
            self._enemies.splice(index, 1);
        }
        return foundTank;
    };
    Socket.getOrAddEnemy = function (self, enemy) {
        var tank = undefined;
        if (self._enemies == undefined) {
            tank = Tank.create(self.game, enemy.tankId, 0, 0);
            self._enemies = [tank];
        }
        else {
            var exist_1 = false;
            self._enemies.forEach(function (item) {
                if (enemy.tankId == item.id) {
                    tank = item;
                    exist_1 = true;
                }
            });
            if (!exist_1) {
                tank = Tank.create(self.game, enemy.tankId, 0, 0);
                self._enemies.push(tank);
            }
        }
        return tank;
    };
    return Socket;
}());
var Torch = (function () {
    function Torch() {
    }
    Torch.prototype.createTorch = function (game) {
        this.game = game;
        this._shadowTexture = game.add.bitmapData(this.game.width, this.game.height);
        this._torch = this.game.add.image(0, 0, this._shadowTexture);
        this._torch.fixedToCamera = true;
        this._torch.blendMode = Phaser.blendModes.MULTIPLY;
    };
    // TODO: Draw a torch instead of a circle.
    Torch.prototype.updateTorch = function (position, angle) {
        var truncatedX = position.x - this.game.camera.x;
        var truncatedY = position.y - this.game.camera.y;
        this._shadowTexture.context.fillStyle = 'rgb(80, 80, 80)';
        this._shadowTexture.context.fillRect(0, 0, this.game.width, this.game.height);
        // Draw circle of light with a soft edge
        var gradient = this._shadowTexture.context.createRadialGradient(truncatedX, truncatedY, ShadowRadius * 0.5, truncatedX, truncatedY, ShadowRadius);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
        this._shadowTexture.context.beginPath();
        this._shadowTexture.context.fillStyle = gradient;
        this._shadowTexture.context.arc(truncatedX, truncatedY, ShadowRadius, 0, Math.PI * 2);
        this._shadowTexture.context.fill();
        // This just tells the engine it should update the texture cache
        this._shadowTexture.dirty = true;
    };
    return Torch;
}());
/// <reference path="../.ts_dependencies/pixi.d.ts" />
/// <reference path="../.ts_dependencies/phaser.d.ts" />
/// <reference path="../.ts_dependencies/socket.io-client.d.ts" />
var TheGame = (function () {
    function TheGame() {
        this.game = new Phaser.Game(window.innerWidth - 30 /*slideroffset*/, window.innerHeight - 30 /*slideroffset*/, Phaser.CANVAS, 'body', {
            // TODO: Check this http://phaser.io/docs/2.4.4/Phaser.State.html
            create: this.create, preload: this.preload, update: this.update
        });
    }
    TheGame.prototype.preload = function () {
        this.game.load.image(SandbagName, "../resources/tank.png");
        this.game.load.image(BulletName, "../resources/bullet.png");
        this.game.load.image(ParticleName, "../resources/particle.png");
        this.game.load.image(TankbodyName, "../resources/tankbody.png");
        this.game.load.image(GuntowerName, "../resources/guntower.png");
        this.game.stage.disableVisibilityChange = true;
    };
    TheGame.prototype.create = function () {
        var self = this;
        this.game.physics.startSystem(Phaser.Physics.ARCADE);
        TheGame.setupBackground(this.game);
        TheGame.prototype.setupKeys(self);
        TheGame.setupPlayer(self);
        TheGame.prototype.setupSocket(self);
        TheGame.setupForeground(self);
        TheGame.prototype.createTorch.call(self, self.game);
    };
    TheGame.prototype.update = function () {
        var message = undefined;
        // 1. Drive or fire.
        if (this._joystick != undefined) {
            var result = this._joystick.checkPointer();
            if (this._player.direction != result.direction) {
                this._player.drive(result.direction);
            }
            message = this._player.updateTank(result.fire);
        }
        else {
            message = this._player.updateTank(this.game.input.activePointer.isDown);
        }
        // 2. check collision.
        var hitMessage = TheGame.combat(this.game, this._player, this._enemies);
        // 3. Send message.
        message.blood = this._player.blood;
        TheGame.prototype.sendMessage.call(this, TankUpdateEventName, message);
        // 4. Update torch.
        TheGame.prototype.updateTorch.call(this, this._player.body.position, this._player.rotation + this._player._guntower.rotation);
        // 5. Update minimap.
        this._miniMap.updateMap(this._player.direction != Directions.None);
    };
    TheGame.combat = function (game, player, others) {
        if (others == undefined) {
            return undefined;
        }
        var hitMessage = undefined;
        var tanks = others.concat(player);
        var bullets = tanks.map(function (item) { return item._bullets; });
        game.physics.arcade.collide(bullets, tanks, function (tank, bullet) {
            if (tank.id === player.id) {
                hitMessage = player.onHit(bullet);
            }
            else {
                TankHelper.onHitVisual(bullet, tank, game);
            }
        });
        return hitMessage;
    };
    // set-ups
    TheGame.setupPlayer = function (self) {
        var x = Math.floor(GameWidth * Math.random());
        var y = Math.floor(GameHeight * Math.random());
        var id = Math.ceil(Math.random() * 1000);
        self._player = Tank.create(self.game, id, x, y);
        self.game.camera.follow(self._player);
    };
    TheGame.setupBackground = function (game) {
        game.world.setBounds(0, 0, GameWidth, GameHeight);
        TheGame.drawGrids(game.add.graphics(0, 0), GameWidth, GameHeight);
        var deadzoneOffsetX = Math.abs(Math.floor(game.width / 2.3));
        var deadzoneOffsetY = Math.abs(Math.floor(game.height / 2.3));
        game.camera.deadzone = new Phaser.Rectangle(deadzoneOffsetX, deadzoneOffsetY, game.width - deadzoneOffsetX * 2, game.height - deadzoneOffsetY * 2);
    };
    TheGame.drawGrids = function (graphics, width, height) {
        var hnum = Math.floor(width / GridWidth);
        var vnum = Math.floor(height / GridHeight);
        graphics.lineStyle(2, 0xE03F00, 1);
        for (var i = 2; i < hnum - 2; i++) {
            var x = i * GridWidth;
            graphics.moveTo(x, 0);
            graphics.lineTo(x, height);
        }
        graphics.lineStyle(2, 0x00E05E, 1);
        for (var i = 2; i < vnum - 2; i++) {
            var y = i * GridHeight;
            graphics.moveTo(0, y);
            graphics.lineTo(width, y);
        }
    };
    TheGame.setupForeground = function (self) {
        self._miniMap = new MiniMap(self.game, self._player);
        if (MobileChecker.isMobile()) {
            self._joystick = new Joystick(self.game);
            self._joystick.drawJoystick();
        }
    };
    return TheGame;
}());
applyMixins(TheGame, [Socket, Inputs, Torch]);
// class GunTower implements Shoot {
//     _tower: Phaser.Sprite;
//     constructor(game: Phaser.Game, x: number, y: number) {
//         this._ownerGame = game;
//         this._tower = game.add.sprite(x, y, )
//         this._guntower = game.add.sprite(x, y, )
//     }
//     update(player: Tank, ...enemies: Tank[]) {
//     }
//     collide(player: Tank, ...enemies: Tank[]) {
//     }
//     _bullets: Phaser.Group; 
//     _ownerGame: Phaser.Game;
//     _guntower: Phaser.Sprite;
//     blood: number;
//     fire: (firingTo: number) => number;
//     nextFireTime: number = 0;
//     shouldFire: (firingTo: number) => boolean;
//     calculateTrajectory: () => Trajectory;
//     fireInternal: (startX: number, startY: number, moveToX: number, moveToY: number) => void;
// } 
function applyMixins(derivedCtor, baseCtors) {
    baseCtors.forEach(function (baseCtor) {
        Object.getOwnPropertyNames(baseCtor.prototype).forEach(function (name) {
            derivedCtor.prototype[name] = baseCtor.prototype[name];
        });
    });
}
var MobileChecker = (function () {
    function MobileChecker() {
    }
    MobileChecker.Android = function () {
        return navigator.userAgent.match(/Android/i);
    };
    MobileChecker.BlackBerry = function () {
        return navigator.userAgent.match(/BlackBerry/i);
    };
    MobileChecker.iOS = function () {
        return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    };
    MobileChecker.Opera = function () {
        return navigator.userAgent.match(/Opera Mini/i);
    };
    MobileChecker.Windows = function () {
        return navigator.userAgent.match(/IEMobile/i);
    };
    MobileChecker.isMobile = function () {
        return (MobileChecker.Android() || MobileChecker.BlackBerry() || MobileChecker.iOS() || MobileChecker.Opera() || MobileChecker.Windows());
    };
    return MobileChecker;
}());
;
var TankHelper = (function () {
    function TankHelper() {
    }
    TankHelper.onExplode = function (self) {
        // If already exploded, return.
        if (self._gameOver) {
            return;
        }
        self._gameOver = true;
        // Emit and destroy everything.
        var emitter = self._ownerGame.add.emitter(self.body.position.x, self.body.position.y);
        emitter.makeParticles(ParticleName, 0, 200, true, false);
        emitter.explode(2000, 200);
        self._guntower.destroy();
        self._bloodText.destroy();
        self._bullets.destroy();
        self.destroy();
    };
    TankHelper.onHitVisual = function (bullet, tankBody, game) {
        // Now we are creating the particle emitter, centered to the world
        var hitX = (bullet.x + tankBody.body.x) / 2;
        var hitY = (bullet.y + tankBody.body.y) / 2;
        bullet.kill();
        // Get effect.
        var emitter = game.add.emitter(hitX, hitY);
        emitter.makeParticles(ParticleName, 0, 50, false, false);
        emitter.explode(1000, 50);
        return { hitX: hitX, hitY: hitY };
    };
    return TankHelper;
}());
/// <reference path="../.ts_dependencies/phaser.d.ts" />
var Joystick = (function () {
    function Joystick(game) {
        this._r = 200;
        this._offset = 0;
        this._radMin = Math.PI * 0.25;
        this._game = game;
        this._graphics = game.add.graphics(0, 0);
        this._graphics.fixedToCamera = true;
        this._center = new Phaser.Point(this._r + this._offset, this._game.camera.height - this._r - this._offset);
    }
    Joystick.prototype.drawJoystick = function () {
        this._graphics.lineStyle(20, 0x00AF00, 0.8);
        this._graphics.drawCircle(this._center.x, this._center.y, this._r);
    };
    Joystick.prototype.checkPointer = function () {
        var fire = false;
        var drive = false;
        var direction = Directions.None;
        if (this._game.input.pointer1.isDown) {
            var d = this.getDirection(this._game.input.pointer1.position);
            if (d == undefined) {
                fire = true;
            }
            else {
                drive = true;
                direction = d;
            }
        }
        if (this._game.input.pointer2.isDown) {
            var d = this.getDirection(this._game.input.pointer2.position);
            if (d == undefined) {
                fire = true;
            }
            else {
                drive = true;
                direction = d;
            }
        }
        return { fire: fire, drive: drive, direction: direction };
    };
    Joystick.prototype.getDirection = function (point) {
        if (Phaser.Math.distance(point.x, point.y, this._center.x, this._center.y) > (this._r + this._offset)) {
            return undefined;
        }
        var rad = Phaser.Math.angleBetweenPoints(this._center, point);
        if (rad > -0.5 * this._radMin && rad < 0.5 * this._radMin) {
            return Directions.Right;
        }
        if (rad > 0.5 * this._radMin && rad < this._radMin) {
            return Directions.DownRight;
        }
        if (rad > this._radMin && rad < 1.5 * this._radMin) {
            return Directions.Down;
        }
        if (rad > 1.5 * this._radMin && rad < 2 * this._radMin) {
            return Directions.DownLeft;
        }
        if (rad > 2 * this._radMin || rad < -2 * this._radMin) {
            return Directions.Left;
        }
        if (rad < -0.5 * this._radMin && rad > -1 * this._radMin) {
            return Directions.UpRight;
        }
        if (rad < -1 * this._radMin && rad > -1.5 * this._radMin) {
            return Directions.Up;
        }
        if (rad < -1.5 * this._radMin && rad > -2 * this._radMin) {
            return Directions.UpLeft;
        }
        return Directions.None;
    };
    return Joystick;
}());
var MiniMap = (function () {
    function MiniMap(game, player) {
        this._bounds = new Phaser.Point(100, 80);
        this._offsets = new Phaser.Point(10, 10);
        this._show = false;
        this._isBlinkingEnemy = false;
        this._graphicsOuter = game.add.graphics(this._offsets.x, this._offsets.y);
        this._graphicsPlayer = game.add.graphics(this._offsets.x, this._offsets.y);
        this._graphicsEnemy = game.add.graphics(this._offsets.x, this._offsets.y);
        // This should not be affected by camera.
        this._graphicsOuter.fixedToCamera = true;
        this._graphicsPlayer.fixedToCamera = true;
        this._graphicsEnemy.fixedToCamera = true;
        this._player = player;
        this._game = game;
    }
    MiniMap.prototype.updateMap = function (show) {
        this._graphicsPlayer.clear();
        if (show || this._isBlinkingEnemy) {
            if (!this._show) {
                this._show = true;
                this._graphicsOuter.beginFill(0xFFFFFF, 0.9);
                this._graphicsOuter.lineStyle(1, 0x4D5359, 0.5);
                this._graphicsOuter.drawRect(this._offsets.x, this._offsets.y, this._bounds.x, this._bounds.y);
                this._graphicsOuter.endFill();
            }
            var spot = this.getPlayer();
            this._graphicsPlayer.lineStyle(4, 0x00AF00, 1);
            this._graphicsPlayer.drawRect(spot.x, spot.y, 4, 4);
        }
        else {
            this._show = false;
            this._graphicsOuter.clear();
        }
    };
    MiniMap.prototype.blinkEnemy = function (x, y) {
        this._isBlinkingEnemy = true;
        if (!this._show) {
            this.updateMap(true);
        }
        var spot = this.getPositionCore(x, y);
        this._graphicsEnemy.lineStyle(4, 0xAF0000, 1);
        this._graphicsEnemy.drawRect(spot.x, spot.y, 4, 4);
        var self = this;
        setTimeout(function () {
            self._graphicsEnemy.clear();
            self._isBlinkingEnemy = false;
        }, 500);
    };
    MiniMap.prototype.getPositionCore = function (x, y) {
        return new Phaser.Point(x / GameWidth * this._bounds.x + 10, y / GameHeight * this._bounds.y + 10);
    };
    MiniMap.prototype.getPlayer = function () {
        return this.getPositionCore(this._player.position.x, this._player.position.y);
    };
    return MiniMap;
}());
var Drive = (function () {
    function Drive() {
        this.direction = Directions.None;
        this._gameOver = false;
    }
    Drive.prototype.drive = function (d) {
        if (this._gameOver) {
            return;
        }
        this.direction = d;
        if (d == Directions.None) {
            this.body.velocity.set(0, 0);
            this.body.acceleration.set(0, 0);
            return;
        }
        var angle = Drive.directionToAngle(d);
        this.angle = angle;
        Drive.setAcceleration(angle, this.body.acceleration, this.body.maxVelocity);
        Drive.syncBloodTextPosition(angle, this._bloodText);
    };
    Drive.prototype.addDirection = function (addDirection) {
        var newDirection = Drive.addDirectionInternal(this.direction, addDirection);
        this.drive(newDirection);
    };
    Drive.prototype.removeDirection = function (removeDirection) {
        var newDirection = Drive.removeDirectionInternal(this.direction, removeDirection);
        this.drive(newDirection);
    };
    Drive.directionToAngle = function (direction) {
        switch (direction) {
            case Directions.Up:
                return 0;
            case Directions.Down:
                return 180;
            case Directions.Left:
                return -90;
            case Directions.Right:
                return 90;
            case Directions.UpLeft:
                return -45;
            case Directions.DownLeft:
                return 225;
            case Directions.UpRight:
                return 45;
            case Directions.DownRight:
                return 135;
            default:
                return undefined;
        }
    };
    Drive.addDirectionInternal = function (direction, addDirection) {
        // If direction alread has the added direction, just return. This case may barely happen.
        if ((direction & addDirection) != 0) {
            return Directions.None;
        }
        var opsiteDirection = Drive.getOpsiteDirection(addDirection);
        if ((direction & opsiteDirection) != 0) {
            return direction = direction & (~opsiteDirection);
        }
        return direction | addDirection;
    };
    Drive.removeDirectionInternal = function (direction, removeDirection) {
        return direction & (~removeDirection);
    };
    Drive.getOpsiteDirection = function (direction) {
        switch (direction) {
            case Directions.Up: return Directions.Down;
            case Directions.Down: return Directions.Up;
            case Directions.Left: return Directions.Right;
            case Directions.Right: return Directions.Left;
        }
        return Directions.None;
    };
    Drive.setAcceleration = function (angle, acceleration, maxVelocity) {
        var angleRad = Phaser.Math.degToRad(angle);
        var sinAngle = Math.sin(angleRad);
        var negCosAngle = 0 - Math.cos(angleRad);
        acceleration.setTo(Acceleration * sinAngle, Acceleration * negCosAngle);
        maxVelocity.setTo(Math.abs(MaxVelocity * sinAngle), Math.abs(MaxVelocity * negCosAngle));
    };
    Drive.syncBloodTextPosition = function (angle, bloodText) {
        var angleInRad = Phaser.Math.degToRad(angle);
        bloodText.position.setTo(Math.sin(angleInRad) * BloodTextOffset, Math.cos(angleInRad) * BloodTextOffset);
        bloodText.angle = -1 * angle;
    };
    return Drive;
}());
var Shoot = (function () {
    function Shoot() {
        this.nextFireTime = 0;
    }
    Shoot.prototype.updateAngle = function () {
        // First, move gun tower to point to mouse.
        var angle = this._ownerGame.physics.arcade.angleToPointer(this._guntower.parent);
        this._guntower.angle = Phaser.Math.radToDeg(angle) + 90 - this._guntower.parent.angle;
    };
    Shoot.prototype.fire = function (firingTo) {
        if (firingTo === void 0) { firingTo = undefined; }
        if (!this.shouldFire(firingTo)) {
            return undefined;
        }
        // Calculate the trajectory.
        var trajectory = Shoot.calculateTrajectory(this._guntower);
        // Force set direction?
        if (firingTo != undefined) {
            trajectory.theta = firingTo;
        }
        // Fire.
        this.fireInternal(trajectory.theta, trajectory.startX, trajectory.startY, trajectory.moveToX, trajectory.moveToY);
        // Let's shake it shake it.
        this._ownerGame.camera.shake(0.005, 50);
        return trajectory.theta;
    };
    Shoot.prototype.shouldFire = function (firingTo) {
        var result = firingTo != undefined
            || (this._ownerGame.time.now > this.nextFireTime && this._bullets.countDead() > 0);
        if (result) {
            // Set time.
            this.nextFireTime = this._ownerGame.time.now + FireRate;
        }
        return result;
    };
    Shoot.prototype.fireInternal = function (theta, startX, startY, moveToX, moveToY) {
        // Get bullet.
        var bullet = this._bullets.getFirstDead();
        bullet.rotation = theta;
        bullet.reset(startX, startY);
        this._ownerGame.physics.arcade.moveToXY(bullet, moveToX, moveToY, BulletSpeed);
    };
    Shoot.calculateTrajectory = function (guntower) {
        // Get a random offset. I don't think I can support random offset since the current
        // comm system cannot do the coordinate if there is a offset.
        var randomAngleOffset = (Math.random() - 0.5) * AngleOffsetBase;
        var theta = Phaser.Math.degToRad(guntower.angle + guntower.parent.angle) + randomAngleOffset;
        // Set-up constants.
        var halfLength = guntower.height / 2 + 10 /*offset*/;
        var sinTheta = Math.sin(theta);
        var reverseCosTheta = -1 * Math.cos(theta);
        var position = guntower.parent.body.center;
        // Bullet start position and move to position.
        var startX = sinTheta * halfLength + position.x;
        var startY = reverseCosTheta * halfLength + position.y;
        var moveToX = startX + sinTheta * Number.MAX_VALUE;
        var moveToY = startY + reverseCosTheta * Number.MAX_VALUE;
        return { theta: theta, sinTheta: sinTheta, reverseCosTheta: reverseCosTheta,
            startX: startX, startY: startY, moveToX: moveToX, moveToY: moveToY };
    };
    return Shoot;
}());
var Tank = (function (_super) {
    __extends(Tank, _super);
    function Tank(game, id, x, y) {
        var _this = _super.call(this, game, x, y, TankbodyName) || this;
        _this._gameOver = false;
        // Mixin-Drive
        _this.direction = Directions.None;
        _this.nextFireTime = 0;
        _this.setupGame(game, id);
        _this.setupTank(game, x, y);
        return _this;
    }
    Tank.create = function (game, id, x, y) {
        var tank = new Tank(game, id, x, y);
        game.add.existing(tank);
        return tank;
    };
    Tank.prototype.updateTank = function (shouldFire) {
        // If game over, do nothing.
        if (this._gameOver) {
            return this.getJson(undefined);
        }
        // 1. Gun points to pointer.
        this.updateAngle();
        // 2. Fire.
        var fire = undefined;
        if (shouldFire) {
            fire = this.fire(undefined);
        }
        // Return.
        return this.getJson(fire);
    };
    Tank.prototype.updateAsPuppet = function (params) {
        if (this._gameOver) {
            return;
        }
        this.updateAsPuppetCore(params.gunAngle, params.tankAngle, new Phaser.Point(params.x, params.y), params.firing, params.blood);
    };
    Tank.prototype.getJson = function (firingTo) {
        // If already died, just return an useless message.
        if (this._gameOver) {
            return {
                tankId: this.id,
                x: -1,
                y: -1,
                gunAngle: 0,
                tankAngle: 0,
                firing: undefined,
                blood: 0
            };
        }
        return {
            tankId: this.id,
            x: this.position.x,
            y: this.position.y,
            gunAngle: this._guntower.angle,
            tankAngle: this.angle,
            firing: firingTo,
            blood: this.blood
        };
    };
    Tank.prototype.setupGame = function (game, id) {
        this._ownerGame = game;
        this.id = id;
        this.blood = 100;
    };
    Tank.prototype.setupTank = function (game, x, y) {
        // These are children.
        this._guntower = game.make.sprite(0, 0, GuntowerName);
        this._bloodText = game.make.text(0, BloodTextOffset, (this.blood), { font: "20px Arial", fill: "#00A000", align: "center" });
        this.anchor.set(0.5, 0.5);
        this._guntower.anchor.set(0.5, 0.5);
        this._bloodText.anchor.set(0.5, 0.5);
        // Set layout.
        this.addChild(this._guntower);
        this.addChild(this._bloodText);
        // Setup physics only to body.
        game.physics.arcade.enable(this);
        this.body.collideWorldBounds = true;
        this.body.bounce.set(0.1, 0.1);
        this.body.maxVelocity.set(MaxVelocity);
        // Create bullets.
        this._bullets = game.add.group();
        this._bullets.enableBody = true;
        this._bullets.physicsBodyType = Phaser.Physics.ARCADE;
        this._bullets.createMultiple(50, BulletName);
        this._bullets.setAll("checkWorldBounds", true);
        this._bullets.setAll("outOfBoundsKill", true);
        this._bullets.forEach(function (item) {
            item.body.bounce.set(0.1, 0.1);
            item.anchor.set(0.5, 1);
            item.body.mass = 0.05;
        }, this);
    };
    Tank.prototype.updateAsPuppetCore = function (gunAngle, tankAngle, position, firing, blood) {
        // if blood is less or equal to 0, set gameover tag, then explode.
        if (this.blood <= 0) {
            TankHelper.onExplode(this);
            return;
        }
        var angleChanged = this.angle !== tankAngle;
        if (angleChanged) {
            this.angle = tankAngle;
            Tank.syncBloodTextPosition(tankAngle, this._bloodText);
        }
        this._guntower.angle = gunAngle;
        this.body.velocity.setTo(0, 0);
        this.position = position;
        // Blood.        
        this.blood = blood;
        this._bloodText.text = blood;
        if (firing != undefined) {
            this.fire(firing);
        }
    };
    Tank.prototype.onHit = function (bullet) {
        this.blood -= Math.floor(Math.random() * Damage);
        this._bloodText.text = this.blood;
        var self = this;
        var result = TankHelper.onHitVisual(bullet, self, this._ownerGame);
        // Only check & explode here.
        if (this.blood <= 0) {
            TankHelper.onExplode(self);
        }
        return {
            tankId: this.id,
            hitX: result.hitX,
            hitY: result.hitY,
            blood: this.blood
        };
    };
    return Tank;
}(Phaser.Sprite));
// Set-up mixin.
applyMixins(Tank, [Drive, Shoot]);
