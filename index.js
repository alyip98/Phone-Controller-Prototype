var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  socket.on('joystick', function(msg){
    // io.emit('chat message', msg);
	console.log("joystick: " + msg);
  });
  // console.log("user connected");
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});
