//
//  REST_web.js
//
//	a RESTful handler for the /web request handling
//	NOTE: these are currently loaded in SR.Component.REST
//
var pathLib = require("path");
var l_handles = exports.REST_handles = {};

var contentTypesByExtension = {
  '.html':	"text/html",
  '.htm':	"text/html",
  '.css':	"text/css",
  '.js':	"text/javascript",
  '.png':	"image/png",
};

var streamingContentTypes = {
	'mp3': 	'xxx',
	'mp4':	'xxx',	
}

// read a particular file and returns file or undefined (if not found)
var l_readFile = function (path, onDone) {

	SR.fs.readFile(path, "binary", function (err, data) {
		if (err) {
			UTIL.safeCall(onDone);
		}
		else {
			UTIL.safeCall(onDone, data);			
		}
	});
}

// 
var l_defaultFiles = SR.Settings.DEFAULT_FILES;


var l_web = function (res, req, fullpath) {
	var cookie = SR.REST.getCookie(req);
	LOG.warn('GET ' + fullpath, 'handlers.REST_web');
	
	var onNotFound = function () {
		SR.REST.reply(res, {}, {not_found: fullpath, cookie: cookie});
	}

	var onReturnFile = function (data, options) {
		// serve HTML page (with content type)		

		SR.REST.reply(res, data, options);
		
		/*
		res.writeHead(200, headers);
		res.write(data, "binary");
		res.end();
		*/
	}
	
	// server a particular file, returns true/false
	var serveFile = function (path, onDone) {

		var options = {cookie: cookie};
		var contentType = contentTypesByExtension[pathLib.extname(path)];
		if (contentType) 
			options['content_type'] = contentType;
				
		LOG.sys('try to serve: ' + path, 'handlers.REST_web');

		/*
		*/
		
		// NOTE: file can either not exist, or path can be a directory, need to consider both cases
		l_readFile(path, function (data) {				
			if (data) {
				LOG.sys('finished reading file: ' + path, 'handlers.REST_web');
				onReturnFile(data, options);
				UTIL.safeCall(onDone, true);
			}
			else
				UTIL.safeCall(onDone, false);
		});		
	}
	
	// try to serve files (including potential default files)
	SR.fs.stat(fullpath, function (err, stats) {
		
		// nothing found
		if (err) {
			return onNotFound();
		}
		
		// serve the file
		if (stats.isFile()) {
			serveFile(fullpath);
		}
		// if it's directory, try default pages
		else if (stats.isDirectory()) {
			
			LOG.sys(fullpath + ' is a directory', 'handlers.REST_web');
			
			// append '/' if not already there
			if (fullpath.charAt(fullpath.length-1) !== '/')
				fullpath += '/';

			var filejob = function (name) {
					
				return function (onDone) {
					serveFile(name, function (result) {
						if (result === true) {
							success = true;
							onDone(false);
						}
						else
							onDone(true);
					});
				};
			}

			// check each potential file by using a JobQueue
			var jq = SR.JobQueue.createQueue();
			var success = false;
						
			for (var i=0; i < l_defaultFiles.length; i++) {
				jq.add(filejob(fullpath + l_defaultFiles[i]), false);
			}
			
			// last job to return not found
			jq.add(function () {
				if (success !== true)
					onNotFound();
			});
			
			jq.run();
		}
		// return not found
		else {
			onNotFound();
		}
	});	
}

// simple web server functions
// ref: http://stackoverflow.com/questions/6084360/node-js-as-a-simple-web-server
l_handles.web = function (path_array, res, JSONobj, req) {
	
	// force redirect to /web/ if accessed by /web
	if (path_array.length === 2) {
		LOG.warn('/web requested, redirect to /web/', 'handlers.REST_web');
		SR.REST.reply(res, {}, {location: '/web/'});
		return;
	}
	
	// reconstruct pathname
	var fullpath = './web/' + path_array.slice(2).join('/');
	l_web(res, req, fullpath);
}


l_handles.lib = function (path_array, res, JSONobj, req) {
	
	// force redirect to /lib/ if accessed by /web
	if (path_array.length === 2) {
		LOG.warn('/lib requested, redirect to /lib/', 'handlers.REST_web');
		SR.REST.reply(res, {}, {location: '/lib/'});
		return;
	}
	
	// reconstruct pathname
	var fullpath = __dirname + '/../lib/' + path_array.slice(2).join('/');
	l_web(res, req, fullpath);
}

SR.REST.addHandler(l_handles);
