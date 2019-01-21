var c, ctx;
var W, H;
var socket;
var points = [];
var buttons = [];
var game;
var dt = 0;
var last = 0;
var COLORS = ["#001f3f", "#0074D9", "#7FDBFF", "#39CCCC", "#3D9970", "#2ECC40", "#01FF70", "#FFDC00", "#FF851B", "#FF4136", "#85144b", "#F012BE", "#B10DC9"];

var Settings = {
	CollisionConstant: 10000
}

function init() {
	c = document.getElementById("display");
	ctx = c.getContext("2d");
	W = window.innerWidth;
	H = window.innerHeight;
	c.width = W;
	c.height = H;
	
	socket = io();
	game = new Game();
	
	socket.emit("gameInit", "");
	
	socket.on("playerJoin", function(msg) {
		console.log("player joining: " + msg);
		game.addPlayer(msg);
	});
	
	socket.on("joystick", function(msg) {
		// update controller obj
		var obj = JSON.parse(msg);
		var playerId = obj.id;
		var player = game.getPlayerById(playerId);
		if (player) {
			player.controller.updateJoystick(msg);
		}
	});
	
	socket.on("button", function(msg) {
		// update controller obj
		var obj = JSON.parse(msg);
		var playerId = obj.id;
		var player = game.getPlayerById(playerId);
		if (player) {
			player.controller.updateButton(msg);
		}
	});

	last = Date.now();
	update();
}

function render() {
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, W, H);
	
	for (var i in game.players) {
		game.players[i].render();
	}
}

function update() {
	dt = Date.now() - last;
	for (var i in game.players) {
		game.players[i].update();
	}
	
	render();
	
	last = Date.now();
	window.requestAnimationFrame(update);
}

function Game() {
	this.players = [];
	this.getPlayerById = function(id) {
		for (var i = 0; i < this.players.length; i++) {
			if (this.players[i].id == id) {
				return this.players[i];
			}
		}
		return null;
	}
	
	this.addPlayer = function(msg) {
		if (this.getPlayerById(msg) != null) {
			return;
		}
		var player = new Player(msg);
		this.players.push(player);			
	}
}

function Player(id) {
	this.id = id;
	this.controller = new Controller();
	
	// drawing attr
	this.x = 0;
	this.y = 0;
	this.r = 48;
	this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
	
	// physics attr
	this.m = 1;
	this.v = 0;
	this.a = 0;
	this.friction = 0.1;
	this.acceleration = 1;
	this.facingAngle = 0;
	
	// skills
	this.skills = {
		dash: {
			cd: 0,
			maxCd: 100,
			charges: 0,
			chargeCd: 0,
			maxChargeCd: 0,
			maxCharges: 1,
			force: 3,
			bind: "down",
			trigger: function(player) {
				this.cd = this.maxCd;
				player.applyForce(this.force, player.facingAngle);
			},
			update: function() {
				this.cd -= dt;
				if (this.charges < this.maxCharges && this.cd < 0) {
					this.cd = this.maxCd;
					this.charges++;
				}
			}
		}
	}
	
	// statuses
	this.isCharging = false;
	
	this.render = function() {
		ctx.fillStyle = this.color;
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2, true);
		ctx.closePath();
		ctx.fill();
	}
	
	this.update = function() {
		this.v *= (1 - this.friction);
	
		this.x += Math.cos(this.a) * this.v;
		this.y += Math.sin(this.a) * this.v;
		
		var stickAngle = this.controller.getInput("stickAngle");
		var stickMagnitude = this.controller.getInput("stickMagnitude");
		
		this.applyForce(this.acceleration * stickMagnitude, stickAngle);
		
		if (stickMagnitude > 0) {
			this.facingAngle = stickAngle;
		}
		
		for (const skill of Object.values(this.skills)) {
			skill.update();
			if (this.controller.getInput(skill.bind) == 1
				&& skill.charges > 0) {
				skill.trigger(this);
			}
		}
		
		
		for (var i = 0; i < game.players.length; i++) {
			var other = game.players[i];
			if (other === this) {
				continue;
			}
			
			var dist = this.getDistanceTo(other);
			if (dist < this.r + other.r) {
				var force = Settings.CollisionConstant * this.m * other.m / Math.pow(dist, 2);
				var angle = this.getAngleTo(other);
				this.applyForce(force, angle);
				other.applyForce(force, angle + Math.PI);
			}
		}
	}
	
	this.applyForce = function(magnitude, angle) {
		var mx = (this.v * Math.cos(this.a) * this.m + magnitude * Math.cos(angle)) / this.m;
		var my = (this.v * Math.sin(this.a) * this.m + magnitude * Math.sin(angle)) / this.m;
		
		this.a = Math.atan2(my, mx);
		this.v = Math.sqrt(mx * mx + my * my);
	}
	
	this.spawn = function() {
		this.x = Math.random() * W;
		this.y = Math.random() * H;
	}
	
	this.getDistanceTo = function(player) {
		return Math.sqrt(Math.pow(this.x - player.x, 2) + Math.pow(this.y - player.y, 2));
	}
	
	this.getAngleTo = function(player) {
		return Math.atan2(this.y - player.y, this.x - player.x);
	}
	
	this.spawn();
}

function Controller() {
	this.inputs = {
		x: 0,
		y: 0,
		stickMagnitude: 0,
		stickAngle: 0,
		up: 0,
		down: 0,
		left: 0,
		right: 0
	}
	
	this.getInput = function(name) {
		return this.inputs[name];
	}
	
	this.updateJoystick = function(msg) {
		var obj = JSON.parse(msg);
		this.inputs.x = Math.cos(obj.angle) * obj.magnitude;
		this.inputs.y = Math.sin(obj.angle) * obj.magnitude;
		this.inputs.stickMagnitude = obj.magnitude;
		this.inputs.stickAngle = obj.angle;
	}
	
	this.updateButton = function(msg) {
		var obj = JSON.parse(msg);
		this.inputs[obj.button] = obj.status;
	}
}

window.onload = init;