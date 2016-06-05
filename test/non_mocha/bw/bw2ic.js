require('../../../SR_test.js');
var ffmpegobj = {};
var broadway_stream_obj = {};
var ff = undefined;
var ffrec = require('../../../modules/video/ffmpeg_recorder.js');

var fs = require("fs");
// fs.writeFile("ondata.h264", "binary");

var spawn = require('child_process').spawn,
	exec = require('child_process').exec;

var test = function (input) {
	spawn_broadway_stream();
	
	var onDone = function (response) {
		console.log("onDone");
		if (typeof(response) !== "undefined")
			console.log(response);
	}
	var onFail = function (response) {
		console.log("onFail");
		console.log(response);
	}
	var onNotify = function (response) {
		//console.log("onNotify");
		//console.log(response);
	}

	var onData = [
		function (response) {
			// console.log("onData: " + response.data.length);
			// fs.appendFile("ondata.h264", response.data, "binary");
			if (typeof(ff) != 'undefined' && typeof(ff.stdinWrite) == 'function') 
			ff.stdinWrite(response.data, response.encode);
		},
		function (response) {
			// ffmpegobj.process.stdin.write(response.data, response.encode);
		},
		function (response) {
			// ffmpegobj2.process.stdin.write(response.data, response.encode);
		},
		function (response) {
			// ffmpegobj.process.stdin.write(response.data, response.encode);
		},
	];
	var stream = {
		"onDone": onDone,
		"onFail": onFail,
		"onData": onData,
		// "dataport": 68,
		"dataport": 50068,
	};

	var login = {
		"onDone": onDone,
		"onFail": onFail,
		"onNotify": onNotify,
		"user": "aa",
		"passwd": "11"
	};

	var connect = {
		"onDone": onDone,
		"onFail": onFail,
		"onNotify": onNotify,
		"streamIDs": [1,2,3,4],
		// "host": "10.32.21.59",
		"host": "163.22.32.59",
		// "port": 67 // int
		"port": 50067
	};

	var connector = require("./Hydra-Connector-DVR/dvr_connector_OO.js");
	this.dvr_connector = new connector();
	var this_test = this;

	login.onDone = function (response) {
		this_test.dvr_connector.strm(stream);
	}
	connect.onDone = function (response) {
		this_test.dvr_connector.login(login);
	}

	this.dvr_connector.init(connect);
//	this.dvr_connector.login(login);
}

var spawn_broadway_stream = function () {
/*
	console.log("spawn BroadwayStream");
	try {
		broadway_stream_obj.process = spawn('nodejs', ['BroadwayStream/index.js', '-p', '60000']);
	} catch (err) {
		console.log("spawn err");
		console.log(err);
	}
	broadway_stream_obj.process.stdout.on("error", function epipeFilter(err) {
		console.log(err);
		if (err.code === "EPIPE") {
			return process.exit();
		}
		// If there's more than one error handler (ie, us), then the error won't be bubbled up anyway
		if (broadway_stream_obj.process.stdout.listeners("error").length <= 1) {
			broadway_stream_obj.process.stdout.removeAllListeners(); // Pretend we were never here
			broadway_stream_obj.process.stdout.emit("error", err); // Then emit as if we were never here
			broadway_stream_obj.process.stdout.on("error", epipeFilter); // Then reattach, ready for the next error!
		}
	});*/
	setup();
}

var setup = function () {
	console.log("setup");
	ff = new ffrec({
		rtsp_url: 'stdin'
	});

	ff.on('stdout', function (data) {
		//broadway_stream_obj.process.stdin.write(data);
	}); 

	ff.on('segment_start', function(filename){
		console.log("on segment_start: " );
		console.log(filename);
	});

	ff.on('segment_end', function(filename){
		console.log("on segment_end: ");
		console.log(filename);
	});

	ff.on('info', function(info){
		console.log("on info: " );
		console.log(info);
	});

	ff.on('close', function() {
		console.log("on close");
		console.log(arguments);
	});

setTimeout(function(){
	ff.attach({method: 'file', dir: '/tmp', filename_prefix: 'ffattached'});
}, 5000);

setTimeout(function(){
	ff.detach({method: 'file'});
},50000);

};

test();
