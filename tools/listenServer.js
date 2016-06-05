console.log("This script listens reported errors.");
require('net').createServer(function (socket) {

	socket.on('connect', function (data) {
    	console.log("================ connect ====================");
	});

    socket.on('data', function (data) {
    	//console.log("================ data ====================");
		//console.log(socket);
        //console.log(data.toString());
		process.stdout.write(data.toString());
		require('fs').appendFile('/home/scalra/publhtml/crash-log.txt', data, function (err) {
			if (err) throw err;
		});
    });

	socket.on('close', function (data) {
    	//console.log("================ close ====================");
	});

	socket.on('error', function (data) {
    	console.log("================ error ====================");
	});

	socket.on('drain', function (data) {
    	console.log("================ drain ====================");
	});

	socket.on('timeout', function (data) {
    	console.log("================ timeout ====================");
	});

	socket.on('end', function (data) {
    	//console.log("================ end ====================");
	});

}).listen(12345);
