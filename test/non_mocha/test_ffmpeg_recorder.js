require('../../SR_test.js');
var ffrec = require('../../modules/video/ffmpeg_recorder.js');

//var ff = new ffrec('rtsp://163.22.32.118/live1.sdp');
var ff = new ffrec({
	rtsp_url: 'rtsp://163.22.32.118/live1.sdp',
	//rtsp_url: 'rtsp://140.109.221.238/live1.sdp',
	segment_time: 6,
	//dir: '/tmp',
	//filename_prefix: 'outputXXX',
	//enabled: {'record': true, 'rtsp': true},
	//ffm_url: 'http://127.0.0.1:48000/dvr_5.ffm',
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
	ff.attach({method: 'file', dir: '/tmp', filename_prefix: 'ffattached', segment_time: 6});
}, 5000);

setTimeout(function(){
	ff.detach({method: 'file'});
},50000);

setTimeout(function(){
	//ff.attach({method: 'ffserver', ffm_url: 'http://127.0.0.1:48000/dvr_5.ffm'}, function() {
	//	console.log('ffserver is connecting.');
	//});
}, 1000);

setTimeout(function(){
	ff.detach({method: 'ffserver'});
},970000);

setTimeout(function(){
	ff.attach({method: 'broadway', channel: 'XXXXXXXXXXXXX'}, function() {
		console.log('broadway is connecting.');
	});
}, 1000);

setTimeout(function(){
	ff.detach({method: 'broadway'});
},970000);

//setTimeout(function(){
//	ff.close();
//	console.log(ff);
//},23456);

