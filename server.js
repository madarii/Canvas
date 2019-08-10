const express = require('express');
const http = require('http');
const fs = require('fs');
const socketIo = require('socket.io');
// get server ip and port synchro
const serverConfig =
    JSON.parse(fs.readFileSync(__dirname + '/config/server.json', 'utf8'));

// set server config
const severIP = serverConfig.IP;
const serverPORT = serverConfig.PORT;

var app = express();
// Create routes
require('./router')(app);
// Static content (css, js, .png, etc) is placed in /public
app.use(express.static(__dirname + '/public'));
// Location of our views
app.set('views', __dirname + '/views');

// Use ejs as our rendering engine
app.set('view engine', 'ejs');

// Tell Server that we are actually rendering HTML files through EJS.
app.engine('html', require('ejs').renderFile);

// var server = https.createServer(options, app).listen(serverPORT, severIP);
var server = http.createServer(app).listen(serverPORT, severIP);
// setup socket.io
var io = socketIo.listen(server);

// array of all lines drawn
var line_history = [];

// event-handler for new incoming connections
io.on('connection', function(socket) {
  // first send the history to the new client and old notess
  for (var i in line_history) {
    socket.emit('draw_pencil', line_history[i]);
  }

  // add handler for message type "draw_pencil".
  socket.on('draw_pencil', function(data) {
    // add received line to history
    line_history.push(data);
    // send line to all clients
    io.emit('draw_pencil', data);
  });

  socket.on('draw_circle', function(data) { io.emit('draw_circle', data); });

  socket.on('draw_square', function(data) { io.emit('draw_square', data); })

  socket.on('draw_triangle',
            function(data) { io.emit('draw_triangle', data); });

  socket.on('draw_line', function(data) { io.emit('draw_line', data); });

  socket.on('clear_canvas', function() {
    line_history = [];
    io.emit('clear_canvas');
  });

  socket.on('update_canvas', function() { io.emit('update_canvas'); });

  socket.on('clear_temp_canvas', function() { io.emit('clear_temp_canvas'); });

  socket.on('clear_eraser_canvas',
            function() { io.emit('clear_eraser_canvas'); });
});
