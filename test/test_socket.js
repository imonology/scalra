var net = require('net');
global.SR = {Settings: {}};
var settings = require('../settings').settings;

var client = new net.Socket();
client.connect(settings.lobbyPort + 3, 'src.scalra.com', function() {
	console.log('Connected');
	client.write('{"E": "TEST_EVENT", "P": {"age": 3}}\n');
});

client.on('error', function (e) {
	console.error(e);	
});

client.on('data', function(data) {
	console.log('Received: ' + data);
	client.destroy(); // kill client after server's response
});

client.on('close', function() {
	console.log('Connection closed');
});
