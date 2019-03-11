//
//  express.js
//
//	a module that supports an express HTTP server
//
//	history:
//		2015-12-26	init
//
//	note:
//		the following node modules are required for this module to function properly
//		(all are express-related)
//			express, ejs, cookie-parser
//

// module object
var l_module = {};

// a pool for all message handlers
var l_handlers = exports.handlers = {};
var l_checkers = exports.checkers = {};
var l_api = exports.api = {};

var l_name = 'Module.Express';

// for form processing
var formidable = require('formidable');

//-----------------------------------------
// Handlers (format checkers and event handlers)
//
//-----------------------------------------



//-----------------------------------------
// Server Event Handling
//
//-----------------------------------------

SR.Callback.onStart(function () {
	// tasks when server starts
});

SR.Callback.onStop(function () {
	// tasks when server stops
});

// when a client connects
SR.Callback.onConnect(function (conn) {
	// do some config checking & init
});

// when a client disconnects
SR.Callback.onDisconnect(function (conn) {
	// handle disconnect
});


// module init
l_module.start = function (config, onDone) {

	/*
		Web Frontend
	*/
	var express = require('express');

	var app = express();
	var cookieParser = require('cookie-parser');

	// set view engine & directory
	var views_paths = [];
	var web_paths = [];
	var lib_paths = [];
	for (var i=0; i < SR.Settings.MOD_PATHS.length; i++) {
		views_paths.push(SR.path.join(SR.Settings.MOD_PATHS[i], (config.views || 'views')));
		web_paths.push(SR.path.join(SR.Settings.MOD_PATHS[i], 'web'));
		lib_paths.push(SR.path.join(SR.Settings.MOD_PATHS[i], 'lib'));
	}
	LOG.warn('views paths: ' + views_paths, l_name);
	LOG.warn('web paths: ' + web_paths, l_name);
	LOG.warn('lib paths: ' + lib_paths, l_name);

	app.set('views', views_paths);

	//var views_path = SR.path.join(SR.Settings.FRONTIER_PATH, '..', (config.views || 'views'));
	//LOG.warn('views path: ' + views_path, l_name);
	//app.set('views', views_path);

	var engine = require('./ejs-wrapper.js');
	app.engine('ejs', engine);
	app.set('view engine', 'ejs');

	// set directory to serve static files
	//app.use('/web', express.static(SR.Settings.FRONTIER_PATH + '/../web'));
	for (var i=0; i < web_paths.length; i++) {
		app.use('/web', express.static(web_paths[i]));
	}
	app.use('/lib', express.static(SR.Settings.SR_PATH + '/lib'));
	for (var i=0; i < lib_paths.length; i++) {
		app.use('/lib', express.static(lib_paths[i]));
	}

	if (typeof config.public === 'string') {
		//app.use(express.static(SR.Settings.FRONTIER_PATH + '/../public'));
		//app.use('/pub/', express.directory(SR.Settings.FRONTIER_PATH + '/public'));
		var public_path = SR.path.resolve(SR.Settings.FRONTIER_PATH + '/..' + config.public);
		LOG.warn('set public web directory to: ' + public_path, l_name);
		app.use(express.static(public_path));
	}

	// need cookieParser middleware before we can do anything with cookies
	if (typeof config.cookie_token === 'string') {
		app.use(cookieParser(config.cookie_token));
	} else {
		app.use(cookieParser());
	}

	// set a cookie
	// ref: http://stackoverflow.com/questions/16209145/how-to-set-cookie-in-node-js-using-express-framework
	app.use(function (req, res, next) {

		// check if client sent cookie
		var cookie = req.cookies[SR.REST.cookieName];
		if (cookie === undefined) {
			// get cookie
			cookie = SR.REST.getCookie();
			//res.cookie(SR.REST.cookieName, cookie, { maxAge: 900000, httpOnly: true });
			// NOTE: if 'httpOnly' is set then cookie won't be shared for websocket connections
			res.cookie(SR.REST.cookieName, cookie);
			LOG.sys('express: cookie created successfully: ' + cookie, l_name);
		} else {
			// yes, cookie was already present
			LOG.sys('express: cookie exists: ' + cookie);
		}
		next(); // <-- important!
	});

	// upload
	app.post('/upload', function (req, res) {
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
						LOG.warn('The file ' + upload.name + ' was uploaded as: ' + filename + '. size: ' + upload.size, l_name);
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
							LOG.warn('File ' + upload_name + ' renamed as: ' + upload.name + ' . size: ' + upload.size, l_name);
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
					} else {
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
				};


				var file_names = {};
				form.on('end', function (err, result) {
					if (err) {
						LOG.error(err, l_name);
						return SR.Callback.notify('onUpload', {result: false, msg: err});
					}
					LOG.warn('file uploaded', l_name);
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
					LOG.warn('fileBegin: name ' + name + ', file ' + JSON.stringify(file));
					file_names['original_name'] = JSON.stringify(file);

				});

				form.on('file', function (fields, files) {
					LOG.warn('on file: name ' + fields + ', file ' + JSON.stringify(files));
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
	});

	if (config.secured === true && SR.Keys) {

		var express_port = UTIL.getProjectPort('PORT_INC_EXPRESS_S');
		var options = {
			key: SR.Keys.privatekey,
			cert: SR.Keys.certificate
		};

		// add CA info if available
		if (SR.Keys.ca) {
			options.ca = SR.Keys.ca;
		}

		var server = SR.https.createServer(options, app).listen(express_port, function() {
			LOG.warn('Express server listening securely on port ' + express_port, l_name);
		});

	} else {
		var express_port = UTIL.getProjectPort('PORT_INC_EXPRESS');
		var server = SR.http.createServer(app).listen(express_port, function() {
			LOG.warn('Express server listening on port ' + express_port, l_name);
		});

	}

	// set up script monitor, so we may hot-load router
	//var router_path = SR.Settings.FRONTIER_PATH + '/' + (config.router || 'router.js');
	var router_path = SR.path.join(SR.Settings.FRONTIER_PATH, (config.router || 'router.js'));

	var err = undefined;
	if (SR.Script.monitor('router', router_path, app) === undefined) {
		err = 'cannot load router!';
		LOG.error(err, l_name);
	}

	// process config & verify correctness here
	UTIL.safeCall(onDone, err);
};

// module shutdown
l_module.stop = function (onDone) {
	// close / release resources used
	UTIL.safeCall(onDone);
};

// register this module
SR.Module.add('express', l_module);
