var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var gameSocket = null;
var players = {};
/*
 * players id:socketId
 */

app.get('/', function(req, res){
	res.sendFile(__dirname + '/controller.html');
});

app.get('/game', function(req, res){
	res.sendFile(__dirname + '/game.html');
});

app.get('/game.js', function(req, res){
	res.sendFile(__dirname + '/game.js');
});

io.on('connection', function(socket){
	socket.on('joystick', function(msg){
		console.log("joystick: " + msg);
		
		if (gameSocket) {
			gameSocket.emit('joystick', msg);
		}
	});

	socket.on('button', function(msg){
		// io.emit('chat message', msg);
		console.log("button: " + msg);
		
		if (gameSocket) {
			gameSocket.emit('button', msg);
		}
	});

	socket.on('gameInit', function(msg) {
		console.log("game session opened");
		gameSocket = socket;
		for (var i in Object.keys(players)) {
			gameSocket.emit("playerJoin", Object.keys(players)[i]);
		}
	});

	socket.on('clientNew', function(msg) {
		players[msg] = socket.id;
		console.log("player joining: " + msg);
		if (gameSocket) {
			gameSocket.emit("playerJoin", msg);
		}
	});

	socket.on('clientRejoin', function(msg) {
		players[msg] = socket.id;
		console.log("player joining: " + msg);
		if (gameSocket) {
			gameSocket.emit("playerJoin", msg);
		}
	});
	// console.log("user connected");
});

http.listen(port, function(){
	console.log('listening on *:' + port);
});
