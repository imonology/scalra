// this is working example how to use socket
// IO with server without creating new port
var SR = {};
SR.http = require('http');
const WebSocket = require('ws');

var express = require('express');

var app = express()
	, server = SR.http.createServer(app)
const wss = new WebSocket.Server({server});

app.use('/*', express.static(__dirname + '/static'));

wss.on('connection', ws => {
	ws.on('message', message => {
		console.log(`Received message => ${message}`);
	});
	ws.send('ho!');
});


server.listen('1400', function () {
	console.log('Express server listening on %d, in %s mode',1400,
		app.get('env'));
});