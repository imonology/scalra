var ffmpegobj = {};
var broadway_stream_obj = {};

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
			ffmpegobj.process.stdin.write(response.data, response.encode);
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
	});
	setup();
}

var setup = function () {
	console.log("setup");
	// 產生 ffmpeg & tail child process 並放入 streamPool 中
	ffmpegobj = {
		process: spawn('ffmpeg', [

			// for live
			'-loglevel', 'fatal',
			'-i', 'pipe:0',
			'-pix_fmt', 'yuv420p',
			'-map','0',
			'-preset', 'ultrafast',
			'-tune', 'zerolatency',
			// '-profile:v', 'baseline',
			'-x264opts', 'crf=23:vbv-maxrate=10000:vbv-bufsize=10000:intra-refresh=1:slice-max-size=36000:keyint=30:ref=1',
			'-pass', '1',
			'-bf', '0',
			'-flags',
			'-loop',
			'-wpredp', '0',
			'-an',
			'-vf', 'scale=320:240',
			'-f', 'h264',
			'-',

			// for record
			'-vcodec', 'copy',
			'-acodec', 'copy',
			'-force_key_frames', '\"expr:gte(t,n_forced*9)\"',
			'-flags', '-global_header',
			'-segment_time', '60',
			'-f', 'segment',
			'-segment_atclocktime', '1',
			'-segment_time_delta', '0.5',
			'-reset_timestamps', '1',
			'%07d.mp4'
		]),
	};
	// ffmpeg 正常資訊輸出
	ffmpegobj.process.stdout.on('data', function (data) {
		broadway_stream_obj.process.stdin.write(data);
	});
	// ffmpeg 錯誤資訊輸出
	ffmpegobj.process.stderr.on('data', function (data) {
		//todo: There is no error output if ffmpeg is not installed. Should be done.
		console.log('stderr: ' + data);
		//purgeCache();
	});
	// ffmpeg child process 關閉時自動清除變數中的資料
	ffmpegobj.process.on('close', function (code) {
		console.log('********************** spawn is down');
		//LOG.event("recording stop", {data: "test data"});
		var pid = this.pid;

		if (ffmpegobj.process.pid === pid) {
			// 移除 streaming object
			delete ffmpegobj;
			// 移除 streaming list FIFO & cahce
			console.error('stream: ' + ' is down');
		};

	});
};

test();
