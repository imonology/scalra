/*

current handlers:

event
SR
payment
SNS
login
upload
shutdown

*/
// to parse query string
var url = require('url');

// for form processing
var formidable = require("formidable");

var l_name = 'REST';

//
// execution code
//


//
// helper code
//

// get origin from request
var _getOrigin = function(req) {
	return ((req.headers.origin && req.headers.origin !== "null") ? req.headers.origin : "*");
}

// check if incoming request is from valid host
// TODO: may need to determine local IP to check if request comes from the same IP
var _checkRequester = function (req, res) {

	var requesterIP = req.connection.remoteAddress;
	return true;
}


//
//    interface handler
//

// supported content-types given file extensions
var l_extList = {
	'avi': 'video/avi',
	'css': 'text/css',
	'html': 'text/html',
	'js': 'application/javascript',
	'jpg': 'image/jpeg',
	'jpeg': 'image/jpeg',
	'mov': 'video/quicktime',
	'mp3': 'audio/mpeg',
	'mp4': 'video/mp4',
	'mpg': 'video/mpeg',
	'ogg': 'application/ogg',
	'ogv': 'video/ogg',
	'oga': 'audio/ogg',
	'txt': 'text/plain',
	'wav': 'audio/x-wav',
	'webm': 'video/webm',
	'zip': 'application/zip'
};

// file types where direct download behavior is desired (instead of being viewed inside browser)
var l_directExt = {
	'zip': true	
}

// client events
exports.event = function (path_array, res, JSONobj, req) {

	var cookie = SR.REST.getCookie(req.headers.cookie);

	// callback to return response to client
	var onResponse = function (res_obj, data, conn) {

		// check if we should return empty response
		if (typeof res_obj === 'undefined') {
			SR.REST.reply(res, {});
			return true;
		}

		// check for special case processing (SR_REDIRECT)
		if (res_obj[SR.Tags.UPDATE] === 'SR_REDIRECT' && res_obj[SR.Tags.PARA] && res_obj[SR.Tags.PARA].url) {

			var url = res_obj[SR.Tags.PARA].url;
			LOG.warn('redirecting to: ' + url, l_name);

			/*
			res.writeHead(302, {
				'Location': url
			});
			res.end();
			*/

			// redirect by page 
			// TODO: merge with same code in FB.js
			var page =
				'<html><body><script>\n' +
				'if (navigator.appName.indexOf("Microsoft") != -1)\n' +
				'    window.top.location.href="' + url + '";\n' +
				'else\n' +
				'	 top.location.href="' + url + '";\n' +
				'</script></body></html>\n';

			res.writeHead(200, {
				'Content-Type': 'text/html'
			});
			res.end(page);

			return true;
		}
		
		// check for special case processing (SR_HTML)
		if (res_obj[SR.Tags.UPDATE] === 'SR_HTML' && res_obj[SR.Tags.PARA].page) {
			res.writeHead(200, {
				'Content-Type': 'text/html'
			});
			res.end(res_obj[SR.Tags.PARA].page);
			return true;
		}

		// check for special case processing (SR_DOWNLOAD)
		if (res_obj[SR.Tags.UPDATE] === 'SR_DOWNLOAD' && res_obj[SR.Tags.PARA].data && res_obj[SR.Tags.PARA].filename) {

			var filename = res_obj[SR.Tags.PARA].filename;
			LOG.warn('allow client to download file: ' + filename, l_name);

			var data = res_obj[SR.Tags.PARA].data;
			res.writeHead(200, {
				'Content-Type': 'application/octet-stream',
				'Content-Disposition': 'attachment; filename=' + filename,
				'Content-Length': data.length
			});
			res.end(data);
			return true;
		}

		// check for special case processing (SR_RESOURCE)
		if (res_obj[SR.Tags.UPDATE] === 'SR_RESOURCE' && res_obj[SR.Tags.PARA].address) {

			var file = res_obj[SR.Tags.PARA].address;
						
			// check if resource exists & its states
			SR.fs.stat(file, function (err, stats) {
										
				var resHeader = typeof res_obj[SR.Tags.PARA].header === 'object' ? res_obj[SR.Tags.PARA].header : {};
				
				if (err) {			
					LOG.error(err, l_name);
					res.writeHead(404, resHeader);
					res.end();
					return;
				}
				
				var extFilename = file.match(/[\W\w]*\.([\W\w]*)/)[1];
				if (typeof extFilename === 'string')
					extFilename = extFilename.toLowerCase();
				
				// default to 200 status
				var resStatus = 200;
				resHeader['Accept-Ranges'] = 'bytes';
				resHeader['Cache-Control'] = 'no-cache';
				resHeader['Content-Length'] = stats.size;
				
				if (l_extList[extFilename]) {
					resHeader['Content-Type'] = l_extList[extFilename];
				};
				
				var start = undefined;
				var end = undefined;
				
				// check if request range exists (e.g., streaming media such as webm/mp4) to return 206 status
				// see: https://delog.wordpress.com/2011/04/25/stream-webm-file-to-chrome-using-node-js/						
				if (req.headers.range) {
					var range = req.headers.range.split(/bytes=([0-9]*)-([0-9]*)/);
					resStatus = 206;
					
					start = parseInt(range[1] || 0);
					end = parseInt(range[2] || stats.size - 1);
					
					if (start > end) {
						LOG.error('stream file start > end. start: ' + start + ' end: ' + end, l_name);
						var resHeader = typeof res_obj[SR.Tags.PARA].header === 'object' ? res_obj[SR.Tags.PARA].header : {};
						res.writeHead(404, resHeader);
						res.end();
						return;  // abnormal if we've reached here
					}
					
					LOG.debug('requesting bytes ' + start + ' to ' + end + ' for file: ' + file, l_name);
							 
					resHeader['Connection'] = 'close';
					resHeader['Content-Length'] = end - start + 1;
					resHeader['Content-Range'] = 'bytes ' + start + '-' + end + '/' + stats.size;
					resHeader['Transfer-Encoding'] = 'chunked';
				} 
				// otherwise assume it's a regular file
				else if (l_directExt.hasOwnProperty(extFilename)) {
					// NOTE: code below will cause the file be downloaded in a "Save As.." format
					// (instead of being displayed directly), we only want this behavior for certain file types (such as .zip)				
					var filename = file.replace(/^.*[\\\/]/, '')
					LOG.warn('requesting a file: ' + filename, l_name);
					resHeader['Content-Disposition'] = 'attachment; filename=' + filename;
				}
				
				LOG.sys('SR_RESOURCE header:', l_name);
				LOG.sys(resHeader);
				res.writeHead(resStatus, resHeader);

				// start streaming
				SR.fs.createReadStream(file, {
					flags: 'r',
					start: start,
					end: end
				}).pipe(res);			
			});
			
			return true;
		}

		var origin = _getOrigin(req);

		// send back via res object if hadn't responded yet
		if (res.headersSent === false) {
			// NOTE: cookie may be undefined;
			SR.REST.reply(res, data, {
				origin: origin,
				cookie: cookie
			});
		}
		else {
			LOG.error('HTTP request has already responded (cannot respond twice)', l_name);
			LOG.stack();
		}

		return true;
	}

	var event_name = path_array[2];

	// build event object, also determine if coming from http or https
	// ref: http://stackoverflow.com/questions/10348906/how-to-know-if-a-request-is-http-or-https-in-node-js

	var host = req.connection.remoteAddress.split(':');
	host = host[host.length-1];
	
	var from = {
		host: host,
		port: req.connection.remotePort,
		type: (req.connection.encrypted ? 'HTTPS' : 'HTTP'),
		cookie: cookie
	};

	var conn = SR.Conn.createConnObject(from.type, onResponse, from);
	var data = {};
	data[SR.Tags.EVENT] = event_name;
	data[SR.Tags.PARA] = JSONobj;
	var event = SR.EventManager.unpack(data, conn, from.cookie);

	// NOTE: we make path array available to the event
	path_array.splice(0, 2);
	event.conn.pathname = url.parse(req.url, true).pathname;
	event.conn.path_array = path_array;

	// checkin event with default dispatcher
	SR.EventManager.checkin(event);
}

// scalra functions
exports.SR = function(path_array, res, JSONobj, req) {

	// get service and function names
	var svc_name = path_array[2];
	var func_name = path_array[3];
	var args = [];

	// store para in JSONobj to args (if available)
	// TODO: simplify?
	if (JSONobj) {

		// if JSONobj is array
		if (SR.sys.isArray(JSONobj)) {
			for (var i = 0; JSONobj.length; i++)
				args[i] = JSONobj[i];
		}
		else {
			// otherwise it's an object
			for (var key in JSONobj)
				args.push((JSONobj[key] === '' ? undefined : JSONobj[key]));
		}
	}

	var msg = 'not found';

	LOG.debug('args recv: ', l_name);
	LOG.debug(args, l_name);

	// check for function availability
	if (SR.hasOwnProperty(svc_name) === false || SR[svc_name].hasOwnProperty(func_name) === false) {

		// return not found
		return SR.REST.reply(res, msg);
	}

	var fullname = 'SR.' + svc_name + '.' + func_name;
	msg = 'function found for ' + fullname;

	// check if this function call is publicly exposed
	// TODO: check if it's from a valid IP
	var valid_func = (UTIL.userSettings('exposed', fullname) !== undefined);

	if (valid_func === false) {
		msg = 'invalid access to ' + fullname + ', incident will be reported';
		LOG.error(msg, l_name);
		SR.REST.reply(res, msg);
		return;
	}

	// prepare default response
	var res_str = 'Error executing ' + fullname;

	// replying the request
	var reply_func = function() {
		var origin = _getOrigin(req);
		SR.REST.reply(res, res_str, {
			origin: origin
		});
	}

	// will definitely return something after a timeout
	var callback = UTIL.timeoutCall(reply_func, SR.Settings.TIMEOUT_EVENTHANDLE, 'executing ' + fullname + ' timeout');

	// prepare callback when done
	// NOTE: callback may not necessarily return, if the number of arguments passed is incorrect
	var onDone = function(result) {

		LOG.warn('execute ' + fullname + ' result: ', l_name);
		LOG.warn(result, l_name);

		var res_obj = {
			func: fullname,
			res: result
		};

		res_str = JSON.stringify(res_obj);
		callback();
	}

	// store callback as last argument
	args.push(onDone);

	// execute and return result
	SR[svc_name][func_name].apply(this, args);
}

// to handle payment
exports.payment = function(path_array, res, JSONobj) {

	var op_type = path_array[2];
	var service_type = path_array[3];
	LOG.warn('service is: ' + service_type + ' op type: ' + op_type, l_name);

	if (SR.Payment.hasOwnProperty(op_type) === false) {
		SR.REST.reply(res, 'invalid operation: ' + op_type);
		return;
	}

	// check if parameters exist
	if (JSONobj === undefined) {
		var msg = 'parameters are empty for operation [' + op_type + '], should not happen';
		LOG.error(msg, l_name);
		SR.REST.reply(res, msg);
		return;
	}

	// check if Payment settings exist
	var config = UTIL.userSettings('Payment', service_type);
	if (config === undefined) {
		var msg = 'invalid payment settings for [' + service_type + '] in project setting';
		LOG.error(msg, l_name);
		SR.REST.reply(res, msg);
		return;
	}

	// whether we're in debug mode
	config.debug = UTIL.userSettings('Payment').debug || false;

	SR.Payment[op_type](service_type, config, JSONobj, function(msg) {
		if (typeof msg === 'object') {
			// redirect to a given location
			res.writeHead(302, {
				'Location': msg.url
			});
			res.end();
		}
		else {
			// NOTE: we respond HTML page by default
			res.writeHead(200, {
				'Content-Type': 'text/html'
			});
			res.end(msg);
		}
	});
}

// handle SNS requests
exports.SNS = function(path_array, res, para, req) {

	// check if requester if valid
	if (_checkRequester(req, res) === false)
		return;

	// check if SNS type exists
	var SNS_type = path_array[2];
	if (SR.SNS.hasOwnProperty(SNS_type) === false) {
		return SR.REST.reply(res, 'SNS type not supported: ' + SNS_type);
	}
	LOG.warn(path_array, l_name);

	// remove 'SNS' & specific SNS (e.g., 'FB') keyword
	path_array.splice(0, 3);
	var cookies = SR.REST.getCookies(req.headers.cookie);

	SR.SNS[SNS_type].handleRequest(path_array, res, para, cookies);
}

// handle client login requests
exports.login = function(path_array, res, para, req) {

	var app_name = path_array[2];

	// lookup app name and re-direct to client URL
	var app_url = SR.SNS.getAppURL(app_name);

	// if no app found
	if (app_url === undefined) {
		SR.REST.reply(res, 'invalid app_name: ' + app_name);
		return;
	}
	else {
		// valid app exists, redirect to app_url

		// obtain a unique login ID for a given app
		var login_id = SR.SNS.registerLogin(app_name);
		var redirect_uri = app_url + '?login_id=' + login_id;
		LOG.warn('login request redirecting to: ' + redirect_uri, l_name);
		res.writeHead(302, {
			'Location': redirect_uri
		});
		res.end();
	}
}

SR.Callback.onStart(function () {
	// validate upload path
	SR.Settings.UPLOAD_PATH = SR.path.resolve(SR.Settings.FRONTIER_PATH, '..', 'upload');
	LOG.warn('validating upload path: ' + SR.Settings.UPLOAD_PATH, l_name);
	UTIL.validatePath(SR.Settings.UPLOAD_PATH);
});


var uploadProgress = require('node-upload-progress');
uploadHandler = new uploadProgress.UploadHandler;

exports.do_upload = function (path_array, res, para, req) {
	uploadHandler.configure(function() {
	  this.uploadDir = SR.Settings.UPLOAD_PATH ;
	});
	
	// uploadHandler.upload(req, res);


    uploadHandler.upload(req, res);

}


exports.do_progress = function (path_array, res, para, req) {
	uploadHandler.configure(function() {
	  this.uploadDir = SR.Settings.UPLOAD_PATH ;
	});
	
	// uploadHandler.upload(req, res);


    uploadHandler.progress(req, res);

}

// handle file upload requests
exports.upload = function (path_array, res, para, req) {

		// for file uploading
		// to be notified:
		/*
			SR.Callback.onUpload(function (para) {
				// success
				if (para.result) {
					// handle uploaded file
				}
				// fail
				else {
				
				}
			});
		*/
		// TODO: move this block of code elsewhere
	// LOG.warn('--------------------path_array');
	// LOG.warn(path_array);
	// LOG.warn('--------------------res');
	// LOG.warn(res);
	// LOG.warn('--------------------para');
	// LOG.warn(para);
	// LOG.warn('--------------------req');
	// LOG.warn(req);
		if (req.headers['content-type']) {
			if (req.headers['content-type'].startsWith('multipart/form-data; boundary=')) {
				var form = new formidable.IncomingForm();
				
				var onUploadDone = function(fields, files) {
					LOG.warn('files uploaded');
					// LOG.warn(files);

					if (!SR.Status) {
						SR.Status = {};
					}

					if (fields.firstOption) {
						SR.Status.latestUploadedFile = {};
						SR.Status.latestUploadedFile[fields.firstOption] = {};
						SR.Status.latestUploadedFile[fields.firstOption] = files.upload;
					}

					// specific path to upload
					if (fields.path) {
						form.uploadDir = fields.path;
					}

					// process one file, assume following fields
					/*
						upload = {
							name:	'string',
							path:	'string'
							size:	'number'
						}
					*/
					var uploaded = [];

					if (typeof files.upload !== 'object') {
						var result = {
							message: 'fail',
							upload : uploaded,
						};

						return SR.REST.reply(res, result);						
					}

					// default to preserve original name
					var preserve_name = (fields.toPreserveFileName !== 'false');

					// modify uploaded file to have original filename
					var renameFile = function (upload) {

						if (!upload || !upload.path || !upload.name || !upload.size) {
							LOG.error('upload object incomplete:', l_name);
							return;
						}

						// record basic file info
						var arr = upload.path.split('/');
						var upload_name = arr[arr.length-1];
						var filename = (preserve_name ? upload.name : upload_name); 
						LOG.warn("The file " + upload.name + " was uploaded as: " + filename + ". size: " + upload.size, l_name);
						uploaded.push({name: filename, size: upload.size, type: upload.type});						

						// check if we might need to re-name
						// default is to rename (preserve upload file names)
						if (preserve_name === false) {
							return;
						}

						var new_name = SR.path.resolve(form.uploadDir, upload.name);
						SR.fs.rename(upload.path, new_name, function (err) {
							if (err) {
								return LOG.error('rename fail: ' + new_name, l_name);
							}
							LOG.warn("File " + upload_name + " renamed as: " + upload.name + " . size: " + upload.size, l_name);							
						});
					};

					// check for single or multiple file processing							
					// for single file upload
					if (files.upload.name) {
						LOG.warn('single file uploaded, rename upload obj:', l_name);
						LOG.warn(files.upload, l_name);
						renameFile(files.upload);
					}
					// for multiple files in an array
					else if (files.upload.length) {
						LOG.warn('multiple files uploaded [' + files.upload.length +']:', l_name);
						LOG.warn(files.upload, l_name);

						for (var i in files.upload) {
							var upload = files.upload[i];
							renameFile(upload);
						}
					}
					else {
						LOG.error('file upload error, no upload file(s)', l_name);
						SR.REST.reply(res, {message: 'failure (no file)'});
						return;
					}

					// remove sensitive info (such as path) from response
					var result = {
						message: 'success',
						upload : uploaded,
					};

					SR.REST.reply(res, result);
				}
				
				
				var file_names = {};
				form.on('end', function (err, result) {
					if (err) {
						LOG.error(err, l_name);	
						return SR.Callback.notify('onUpload', {result: false, msg: err});
					}
					LOG.warn("file uploaded", l_name);
					//LOG.warn(result, l_name);
					SR.Callback.notify('onUpload', {result: true, file: 'filepath'});
// 					var result = {
// 						message: 'success'
// 					};

// 					SR.REST.reply(res, result);

				});

				form.on('aborted', function () {
					//console.log("on aborted");
					SR.Callback.notify('onUpload', {result: false, msg: 'fail reason: abort'});
					var result = {
						message: 'aborted',
					};
					SR.REST.reply(res, result);
				});

				form.on('error', function (err) { 
					SR.Callback.notify('onUpload', {result: false, msg: 'fail reason: error'});
					var result = {
						message: 'error',
					};
					SR.REST.reply(res, result);
				});
 
				form.on('fileBegin', function (name, file) {
					LOG.warn("fileBegin: name " + name + ", file " + JSON.stringify(file));
					file_names['original_name'] = JSON.stringify(file);
					
				});

				form.on('file', function (fields, files) {
					LOG.warn("on file: name " + fields + ", file " + JSON.stringify(files));
					// onUploadDone(fields, files);
				});				
				
				form.on('field', function (name, value) {
					//LOG.debug("on field: name " + name + ", value " + value);
				});

				// form.on('progress', function (bytesReceived, bytesExpected) { 
				// 	SR.Callback.notify('onUploadProgress', {bytesReceived: bytesReceived, bytesExpected: bytesExpected, form: form, file_names: file_names});
				// 	//LOG.debug("on progress: bytesReceived " + bytesReceived + ", bytesExpected " + bytesExpected);
				// });
				
				form.uploadDir = SR.Settings.UPLOAD_PATH;
				form.keepExtensions = true;
				form.multiples = true;


				form.parse(req, function (error, fields, files) {
					
					if (error) {
						LOG.error(error, l_name);
						return;
					}
					onUploadDone(fields, files);
				});
			}
		}
		// end of "for file uploading
}



// handle server shutdown requests
exports.shutdown = function (path_array, res, para, req) {

	var token = path_array[2];
	LOG.warn('token: [' + token + ']', l_name);
	
	// TODO: check for token correctness
	if (token === 'self') {
		LOG.warn('received self shutdown request', l_name);
		SR.Settings.FRONTIER.dispose();
	}
}

