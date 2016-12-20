//
// icUtility.js
//
//
/*
	current functions:

// small utilities
createUUID
createToken						// generate a random number and convert it to base 36 (0-9a-z):
createID						// generate a random number ID (internal use)
getTrimedByteStringByLength
clone
asyncCall 
safeCall
timeoutCall
hash(data, type)									// generate a hash from data, given encryption type
randInteger(limit)									// generate a random integer between 0 and (limit-1)
convertJSON
convertString(obj)
stringify(obj)										// convert an object to string with error catching
getDateTimeString
localISOString(date, includeSeconds)				// convert a date to local ISO string
dumpError											// print out content of an error
isBinary(str)										// test if a string is binary (non-printable characters)
mixin()												// mix two objects into the same object
merge()												// mix two objects into the same object

// config-related
userSettings										// get project-specific settings
getProjectPort										// obtain the project-specific port for a given purpose
getServerDomain										// get a full server host+port combination

// functions related to other hosts or servers
HTTPpost
HTTPget
emailText
notifyAdmin											// send custom message to project admin, if "adminMail" is specified in project settings
contactMonitor(type, para, onDone)					// contact monitor server to get certain info

// functions related to local server (localhost)
getLocalIP
getLocalDomain
validatePath					
validateFile										// check if a file exists on file system or not (file size > 0)
validateFileSync									// check if a file exists and is accessible (sync version)
findValidFile										// search several directories to find a valid file
getDirectoriesSync									// get a list of directories under a given path
isPortOpen(port, onResponse)						// check whether a given port is still open
getSystemInfo()										// get a current snapshot of system's hardware
getLocalPort(onDone, size)							// obtain port(s) from monitor for a local server
getEntryServer()									// get domain + port for current entry server

// file-system related
readFile(path, onDone)								// read & write files
writeFile(path, file, onDone)
readSystemConfig(onDone)							// read & write config.js for scalra
writeSystemConfig(file, onDone)
readJSON(path)										// read a JSON file as a js object
parsePath(path)										// convert a path into an object for easier handling




*/
// used by HTTPget
const http = require('http');
const https = require('https');

const url = require('url');
const querystring = require('querystring');

const os = require('os');
const cpu  = require('os-utils');

const spawn = require('child_process').spawn;	// for starting servers
const exec = require('child_process').exec;

var l_name = 'UTIL';

//-----------------------------------------
// NOTE: this is obsolete & removed, as it'll attech 'remove' to all arrays used
// NOTE: using 'slice' actually will produce a new array (more space costly?)
// see array usage: http://www.hunlock.com/blogs/Mastering_Javascript_Arrays
// Array Remove - By John Resig (MIT Licensed)
/*
Array.prototype.remove = function (from, to)
{
    var rest = this.slice((to || from) + 1 || this.length);
    this.length = from < 0 ? this.length + from : from;

    return this.push.apply(this, rest);
};
*/

// generate unique UUID
exports.createUUID = function () {
	//var uuid = SR.sys.inspect(Math.uuidFast());
	//var uuid = Math.uuidFast();
	//console.log('uuid generated: ' + uuid + ' type: ' + typeof uuid);
	// TODO: use SR._uuid to generate?
	return Math.uuidFast();
}


// ref: http://stackoverflow.com/questions/8532406/create-a-random-token-in-javascript-based-on-user-details
var rand = function () {
	return Math.random().toString(36).substr(2); // remove `0.`
};

// generate random token
exports.createToken = function () {
	return rand() + rand(); // to make it longer
}

// generate a random number between a 'floor' and 'top' limits
// (copied from _basekit originally)
var l_rand = function () {
	var f = (arguments[1]) ? arguments[0] : 0;
	var t = (arguments[1]) ? arguments[1] : arguments[0];
	return Math.floor((Math.random() * (t - f)) + f);
}

// create a numerical ID number between 0 and 10,000
exports.createID = function (limit) {
	return l_rand(0, ((typeof limit === 'number' && limit > 0) ? limit : 10000));
}

exports.getTrimedByteStringByLength = function (pString, trimedByteSz) {
		if (pString.length === 0)
			return 0;

		if ((pString.length * 2) < trimedByteSz)
			return pString;

		var tmpCt = 1;
		var tmpByteSz = 0;
		var tmpBL = Buffer.byteLength(pString[tmpCt - 1], 'utf8');
		if (tmpBL === 3)
			tmpBL = 2;

		tmpByteSz += tmpBL;

		while (tmpByteSz <= trimedByteSz) {
			tmpCt++;
			if ((tmpCt - 1) === pString.length)
				break;

			//require('util').puts('length of '+pString[tmpCt-1]+' ='+Buffer.byteLength(pString[tmpCt-1], 'utf8'));
			tmpBL = Buffer.byteLength(pString[tmpCt - 1], 'utf8');
			if (tmpBL === 3)
				tmpBL = 2;

			tmpByteSz += tmpBL;

		}

		return pString.slice(0, tmpCt - 1);
	}

//-----------------------------------------
// public method
var extend = require('util')._extend;

// version 2 (copied from _basekit originally)
// ref: http://stackoverflow.com/questions/5055746/cloning-an-object-in-node-js
// make a copy of an object
var clone = exports.clone = function (src) {
	var obj2 = extend({}, src);
	return obj2;
}

//-----------------------------------------
// NOTE: after node 0.9.x recursive process.nextTick will cause problems
// see: https://github.com/visionmedia/mocha/pull/754
// solution: adopt setImmediate instead
//      http://www.nczonline.net/blog/2011/09/19/script-yielding-with-setimmediate/
// async callback: call the specified callback at a later time
exports.asyncCall = function (callback) {
	if (typeof callback === 'function')
	//process.nextTick(callback);
		setImmediate(callback);
}

// safe callback (with exception catching)
// 
// see: https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Functions_and_function_scope/arguments
// for how to convert 'arguments' into array form
// 

// catch & print exception when calling callback
l_safeCall = exports.safeCall = function (callback) {

	var return_value = undefined;

	// first check if callback is indeed a function
	if (typeof callback !== 'function')
		return return_value;

	// call the callback with exception catching
	try {
		var args = Array.prototype.slice.call(arguments);
		return_value = callback.apply(this, args.slice(1));
	}
	catch (e) {

		//console.log('safecall entering error...');
		var err_str = 'callback exception, function:\n' + callback;

		if (e.stack)
			err_str += '\n\n' + UTIL.convertString(e.stack);

		LOG.error(err_str, l_name);

		l_notifyAdmin('script error',
			'server:\n' + UTIL.convertString(SR.Settings.SERVER_INFO) + '\n\n' + err_str);
		
		// if catch is not enable, then simply terminate program
		if (SR.Settings.SAFE_CALL === false) {
		// NOTE: do not throw exception as it'll process extra messages
		//throw new Error('program terminated by error in script');
			//process.exit();
			// notify server crash
			SR.Callback.notify('onCrash');	
			SR.Callback.shutdown();
		}
	}

	return return_value;
}

/*
else {

	l_safeCall = exports.safeCall = function (callback) {

		if (typeof callback === 'function') {
			var args = Array.prototype.slice.call(arguments);
			callback.apply(this, args.slice(1));
		}
	}
}
*/

// force call 'callback' with custom error message after timeout (in millisecond)
exports.timeoutCall = function (callback, timeout, msg) {

	if (typeof callback !== 'function' || typeof timeout !== 'number') {
		LOG.error('parameters not correct', l_name);
		return function () {};
	}

	var done_func = function () {

		// remove trigger, if exist
		if (timeout_trigger !== undefined) {
			clearTimeout(timeout_trigger);
			timeout_trigger = undefined;
		}

		// call original callback
		UTIL.safeCall(callback);
	}

	// force calling timeout after some time (in ms)
	var timeout_trigger = setTimeout(function () {
		if (msg !== undefined)
			LOG.error(msg, l_name);
		done_func();
	}, timeout);

	return done_func;
}


// get & store local IP
var _localIP = undefined;

// method 
var net = require('net');

function getNetworkIP (onDone) {
	var socket = net.createConnection(80, 'www.google.com');
	socket.on('connect', function () {
		onDone(undefined, socket.address().address);
		socket.end();
	});
	socket.on('error', function (e) {
		onDone(e, 'error');
	});
}

// return the host IP for the current machine
exports.getLocalIP = function (onDone) {
	
	// if already available, return directly
	if (_localIP)
		return l_safeCall(onDone, _localIP);

	getNetworkIP(function (error, ip) {

		if (error) {
			LOG.error('cannot determine local IP', l_name);
			l_safeCall(onDone, '127.0.0.1');
		}
		else {
			// store for later use
			_localIP = ip;
			l_safeCall(onDone, _localIP);
		}
	});

	/*
    var hostname = require('os').hostname();
    LOG.sys('hostname: ' + hostname, l_name);
    
    // if already available, return directly
    if (_localIP !== undefined)
        return onDone(_localIP);
                                    
    require('dns').lookup(hostname, function (err, addr, fam) {
        
        if (err) {
            LOG.warn(err + '. Assign 127.0.0.1 to host', l_name);
            _localIP = "127.0.0.1";
        }
        else 
            _localIP = addr;
        
        onDone(_localIP);
    })
	*/
}

// obtain server domain if available or lookup
exports.getLocalDomain = function () {
	return UTIL.userSettings('domain');
}

//
// support for HTTP requests (GET/POST) 
//

// ref: http://stackoverflow.com/questions/6158933/http-post-request-in-node-js
// onDone = function (error, res, resObj)
// url_request = 'http://somedomain.com'
// data_obj = {name: 'john', addr: '1st street'};
// content_type = ['form' | <other types> | <header object>];
// encoding = ['binary' | 'utf-8'] 
//
// helper to send HTTP post request to an URL with JSON parameters
var l_HTTPpost = exports.HTTPpost = function (url_request, data_obj, onDone, content_type, encoding) {

	// parse the url first to extract different fields
	var parsed_url = url.parse(url_request);
	var header = undefined;

	// set default to empty object, if not specified
	if (typeof data_obj === 'undefined') {
		data_obj = {};
	}

	// Build the post string from an object to string format	
	var data = '';
	if (typeof data_obj !== 'object') {
		LOG.warn('data_obj of type: ' + typeof data_obj + ' POST now only accepts object as parameter. cannot do POST', l_name);
		return l_safeCall(onDone, 'input not an object');
	}

	// check if a complete 'header' is provided
	if (typeof content_type === 'object') {
		header = content_type;
		LOG.sys('custom header provided: ', l_name);
		LOG.sys(header, l_name);
	}
	// check for form posting
	else if (content_type === 'form') {
		data = querystring.stringify(data_obj);
		content_type = 'application/x-www-form-urlencoded';
	}
	// NOTE: we default to 'application/json' type for the request parameters
	else {
		data = encodeURIComponent(JSON.stringify(data_obj));
		content_type = 'application/json';
	}

	// An object of options to indicate where to post to
	var options = {
		host: parsed_url.hostname,
		path: parsed_url.path,
		method: 'POST',
		headers: header || {
			//'Connection':	  'keep-alive',
			'content-type': content_type,
			'content-length': data.length
		}
	};

	if (parsed_url.port !== null)
		options.port = parsed_url.port;
	else {
		// fill in default port
		options.port = (url_request.indexOf('https') === 0 ? 443 : 80);
	}

	// setup server to HTTP or HTTPS
	var server = (url_request.indexOf('https') === 0 ? https : http);

	LOG.sys('HTTP POST request options:', l_name);
	LOG.sys(options);

	// default to 'binary' but can be customized (or auto-determined by response's content-type)
	encoding = encoding || 'binary';
	
	// Set up the request
	// TODO: combine response handling with GET request
	var req = server.request(options, function (res) {

		//LOG.sys('HTTP POST request respond header:', l_name);
		//LOG.sys(res.headers);

		
		// extract content type & make sure 'content-type' & 'Content-Type' are treated equally
		var type = res.headers['Content-Type'] || res.headers['content-type'];

		if (typeof type !== 'undefined') {
			LOG.sys('HTTP post response content-type: ' + type, l_name);
			
			// try to determine proper encoding type automatically
			// NOTE: for images / webpages we need to have 'binary' encoding, 
			// for JSON objects we need 'utf-8' for proper Chinese display
			if (type.indexOf('application/json') >= 0) 
				encoding = 'utf-8';
		}
		
		var data = '';

		// set encoding, which can be passed in, default (binary), or determined (for application/json it's 'utf-8')
		LOG.sys('encoding: ' + encoding + ' url: ' + url_request, l_name);
		res.setEncoding(encoding);
		
		res.on('data', function (chunk) {
			data += chunk;
		});

		res.on('end', function () {
			var res_obj = data;
			
			try {
				if (data !== '') {

					// convert JSON data (otherwise assume we can return data directly) 
					if (type.indexOf('application/json') >= 0) {
						LOG.sys('converting data (string type) to JSON...', l_name);
						res_obj = JSON.parse(data);
					}
				}
			}
			catch (e) {
				LOG.error('JSON parsing error for data: ' + data, l_name);
				return l_safeCall(onDone, e);
			}

			// return parsed JSON object
			l_safeCall(onDone, null, res, res_obj);
		});
	});

	req.on('error', function (e) {
		LOG.error('HTTP post error', l_name);
		LOG.error(e, l_name);
		LOG.error('options:', l_name);
		LOG.error(options);
		LOG.stack();
		l_safeCall(onDone, e);

		// end request
		//req.end();
	});

	// post the data
	req.write(data);
	req.end();
}

// helper to send a HTTP get request to an URL and get response
var l_HTTPget = exports.HTTPget = function (url, onDone) {

	// send request to app server to get stat
	http.get(url, function (res) {

		// temp buffer for incoming request
		var data = '';

		res.on('data', function (chunk) {
			data += chunk;
		});

		res.on('end', function () {

			var res_obj = undefined;
			try {
				if (data !== '') {
					// see if return object is a text doc
					if (res.headers['content-type'] === 'text/html')
						res_obj = data;
					// perform parsing
					else
						res_obj = JSON.parse(data);
				}
			}
			catch (e) {
				LOG.error('JSON parsing error for data: ' + data, l_name);
				res_obj = null;
			}

			// return parsed JSON object
			l_safeCall(onDone, res_obj);
		})

	}).on('error', function (e) {

		LOG.error("HTTP get error: " + e.message, l_name);
		l_safeCall(onDone, null);
	});
}

// convert something to JSON (often a received message)
exports.convertJSON = function (data) {

	var JSONobj = undefined;
	try {
		if (typeof data === 'string' && data !== '')
			JSONobj = JSON.parse(data);
	}
	catch (e) {
		LOG.error('JSON parsing error for data: ' + data, l_name);
		LOG.error('check if names are enclosed in double quotation such as {"name": "john"}', l_name);
	}
	return JSONobj;
}

// convert possibly an object to string format
var l_convertString = exports.convertString = function (obj) {
	return (typeof obj === 'object' ? JSON.stringify(obj, null, 4) : obj);
}

// convert an object to string with error catching
exports.stringify = function (obj) {
	try {
		return l_convertString(obj);
	} catch (e) {
		LOG.error(e);
	}
}

// extracting all legitimate emails from a string to an array
var l_extractEmails = function (text) {
	return text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
}


var email = require('emailjs/email');
/*
format of msg:

{
   text:    "i hope this works", 
   from:    "you <username@gmail.com>", 
   to:      "someone <someone@gmail.com>, another <another@gmail.com>",
   cc:      "else <else@gmail.com>",
   bcc:		"else else <elseelse@gmail>",
   subject: "testing emailjs"
   type:	'html'
}
*/
// TODO: make email setting configurable?
// send an email
exports.emailText = function (msg, onSuccess, onFail) {

	// set default sender as scalra
	if (msg.hasOwnProperty('from') === false) {
		msg.from = 'scalra <admin@imonology.com>';
	}

	// set default receiver as project admin
	if (msg.hasOwnProperty('to') === false || msg.to === '') {

		// if no admin mail then return
		var adminMail = UTIL.userSettings('adminMail');
		if (adminMail === undefined || adminMail === '') {
			var errmsg = 'No receiver for sending e-mail:\n' + 'subject: ' + msg.subject;
			LOG.warn(errmsg, l_name);
			return l_safeCall(onFail, errmsg);
		}
		msg.to = adminMail;
	}

	//var result = msg.to.match(/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/g);

	// process recepiants to remove extra ','
	msg.to = l_extractEmails(msg.to).join(',');

	// modify message if it's an HTML message
	if (msg.type === 'html') {
		delete msg.type;
		msg.attachment = [{
			data: msg.text,
			alternative: true
		}, ]
	}

	// connect to mail server			
	// check if email config exists
	if (SR.Settings.EMAIL_CONFIG === undefined ||
		SR.Settings.EMAIL_CONFIG.user === '' ||
		SR.Settings.EMAIL_CONFIG.password === '') {
		var errmsg = 'no EMAIL_CONFIG specified for system or project, cannot send emails';
		LOG.error(errmsg, l_name);
		return l_safeCall(onFail, errmsg);
	}

	var server = email.server.connect(SR.Settings.EMAIL_CONFIG);

	// send the message and get a callback with an error or details of the message that was sent
	server.send(msg, function (err, message) {

		if (err) {
			LOG.error('send e-mail error to: [' + msg.to + '] subject: ' + msg.subject, l_name);
			LOG.error(err, l_name);
			LOG.error(message, l_name);
			l_safeCall(onFail, message);
		}
		else {
			LOG.warn('send e-mail success to: [' + msg.to + '] subject: ' + msg.subject, l_name);
			l_safeCall(onSuccess, true);
		}
	});
}


// return a given user-defined settings, or undefined if not found
exports.userSettings = function (section, name) {
	if (SR.Settings.Project.hasOwnProperty(section)) {
		if (name !== undefined)
			return (SR.Settings.Project[section].hasOwnProperty(name) ? SR.Settings.Project[section][name] : undefined);
		return SR.Settings.Project[section];
	}
	return undefined;
}

// obtain the project-specific port for a given purpose
var l_getProjctPort = exports.getProjectPort = function (type) {
	if (typeof SR.Settings[type] !== 'number') {
		LOG.error('port increment for [' + type + '] does not exist!', l_name);
		return undefined;
	}
	return UTIL.userSettings('lobbyPort') + SR.Settings[type];
}

// get a full server host+port combination
exports.getServerDomain = function (secured, type) {
	secured = secured || false;
	type = type || 'PORT_INC_HTTP';
	var port = l_getProjctPort(type);
	return (secured === true? 'https' : 'http') + '://' + SR.Settings.SERVER_INFO.IP + (port ? (':' + port) : '') + '/';
}

var ISODateString = function (d) {
	function pad(n) {
		return n < 10 ? '0' + n : n
	}

	function pad1000(n) {
		return n < 10 ? ('00' + n) : (n < 100 ? ('0' + n) : n);
	}

	// NOTE: need to add '' to force a string, otherwise it's possible to turn out a number
	return '' + d.getFullYear() +
		pad(d.getMonth() + 1) +
		pad(d.getDate()) +
		pad(d.getHours()) +
		pad(d.getMinutes()) +
		pad(d.getSeconds()) +
		pad1000(d.getMilliseconds());
}

// return a unique date time string
exports.getDateTimeString = function () {
	/* use a function for the exact format desired... */

	var d = new Date();
	return ISODateString(d);
}

// check if a directory exists or create if not
exports.validatePath = function (path) {

	LOG.warn('validating path: ' + path, l_name);
	if (SR.fs.existsSync(path) === false) {
		LOG.warn('creating new directory: ' + path + SR.Tags.ERREND, l_name);
		SR.fs.mkdirSync(path);
		return false;
	}
	return true;
}

// check if a directory exists or create if not (async version)
exports.validatePathAsync = function (path, onDone) {

	SR.fs.exists(path, function (exists) {
		if (exists)
			return l_safeCall(onDone, true);

		console.log(SR.Tags.WARN + 'creating new directory: ' + path + SR.Tags.ERREND, l_name);
		SR.fs.mkdir(path, function () {
			l_safeCall(onDone, false);
		});
	});
}

// get a list of directories under a given path
exports.getDirectoriesSync = function (srcpath) {
	return SR.fs.readdirSync(srcpath).filter(function(file) {
		return SR.fs.statSync(path.join(srcpath, file)).isDirectory();
	});
}


// check if a file exists on file system or not (file size > 0)
var l_validateFile = exports.validateFile = function (path, onDone) {
	
	// version 1: simply check existence (size 0 will return 'true')
	//SR.fs.exists(path, onDone);
	
	// version 2: return false if size is 0
	SR.fs.lstat(path, function (err, stats) {
		if (err) {
			//LOG.error(err, l_name);
			return UTIL.safeCall(onDone, false);
		}
		
		UTIL.safeCall(onDone, stats.size > 0);
	});
}

// check if a file exists and is accessible (sync version)
exports.validateFileSync = function (path) {
	try {
		SR.fs.accessSync(path, SR.fs.F_OK);
		return true;
	} catch (e) {
		return false;
	}
}

// search several directories to find a valid file
exports.findValidFile = function (list, path, onDone) {
	
	var build_task = function (base_path) {
		return function (onTaskDone) {
			var fullpath = SR.path.resolve(base_path, path);		
			l_validateFile(fullpath, function (result) {
				// if positive result found we just end the search
				if (result) {
					onTaskDone(fullpath);
				} else {
					onTaskDone(null);
				}
			});			
		}
	}
	
	var tasks = [];
	for (var i in list) {
		tasks.push(build_task(list[i]));
	}
	
	SR.async.series(tasks, function (err, results) {
		if (err) {
			return UTIL.safeCall(onDone, null, err);
		}
		UTIL.safeCall(onDone, 'no files found');
	});
}

// see: http://stackoverflow.com/questions/5802840/javascript-node-js-getting-line-number-in-try-catch
// print out content of an error
exports.dumpError = function (err) {
	var msg = '';

	if (typeof err === 'object') {
		if (err.message) {
			msg += '\nMessage: ' + err.message;
		}
		if (err.stack) {
			msg += '\nStacktrace:\n' +
				'====================\n' +
				err.stack;
		}
	}
	else {
		msg = 'dumpError :: argument is not an object';
	}

	return msg;
}

// send custom message to project admin, if "adminMail" is specified in project settings
var l_notifyAdmin = exports.notifyAdmin = function (title, msg, email) {

	// notify by e-mail if admin is provided, default to only project admin, optional emails can be added	
	email = (email || '');

	if (email !== '')
		email += ', ';
	email += (UTIL.userSettings('adminMail') || '');

	if (email === '')
		return false;

	var ip_port = 'unknown_server';
	if (typeof SR.Settings.FRONTIER.getHostAddress === 'function') {
		ip_port = SR.Settings.FRONTIER.getHostAddress();
		ip_port = ip_port.IP + ':' + ip_port.port;
	}

	// set server name (domain if available, default to IP + port)		
	var server_name = UTIL.getLocalDomain() || '';
	server_name += (' ' + ip_port);

	var content = {
		to: email,
		subject: title + ' [' + server_name + '] ',
		text: msg
	};

	UTIL.emailText(content);

	return true;
}

// check whether a given port is still open: true means open, false means occupied
var l_isPortOpen = exports.isPortOpen = function (port, onResponse) {

	// client approach
	var client = SR.net.connect({
			port: port
		},
		function (result) { //'connect' listener
			if (typeof onResponse === 'function')
				onResponse(false);
			client.end();
		});
	
	client.on('error', function () {
		LOG.sys('port [' + port + '] cannot be connected... port is open...', l_name);
		if (typeof onResponse === 'function')
			onResponse(true);
	});

	/* listen approach
	// adapted from: https://gist.github.com/timoxley/1689041
	var tester = net.createServer();
	
	tester.once('error', function (err) {
		if (err.code != 'EADDRINUSE') 
			return onResponse(err);
		onResponse(null, true)
	});
	
	tester.once('listening', function () {
		tester.once('close', 
					function () { 
						onResponse(null, false);
					});
		tester.close();
	});
	
	tester.listen(port);
	*/
}

///////////////////////////////////////////////////////////////
// for getSystemInfo
///////////////////////////////////////////////////////////////
var fs = require('fs')
realtimeInfo = {
	previousRX: 0,
	previousTX: 0,
	currentRXBPS: 0,
	currentTXBPS: 0,
	disks: [],
	cpu: {},
};

exports.daemon = function (arg) {
	
	if (typeof arg !== 'object' || typeof arg.action !== 'string') {
		LOG.error('cannot start daemon, no arguments or action specified', l_name);
		process.exit(0);
		return;
	}
	
	switch (arg.action) {
		case 'startSetInterval':
			setInterval(l_njds, 5000);
			setInterval(l_cpu_realtime_info, 2000);
			break;
		default:
			break;
	}
}


var l_cpu_realtime_info = function (arg) {
		
	cpu.cpuUsage( function (input) { realtimeInfo.cpu.cpuUsage = input } );
	cpu.cpuFree( function (input) { realtimeInfo.cpu.cpuFree = input } );
	realtimeInfo.cpu.platform = cpu.platform();
	realtimeInfo.cpu.cpuCount = cpu.cpuCount();
	realtimeInfo.cpu.freemem = cpu.freemem();
	realtimeInfo.cpu.totalmem = cpu.totalmem();
	realtimeInfo.cpu.freememPercentage = cpu.freememPercentage();
	realtimeInfo.cpu.processUptime = cpu.processUptime();
	realtimeInfo.cpu.loadavg = {
		"1": cpu.loadavg(1),
		"5": cpu.loadavg(5),
		"15": cpu.loadavg(15),
	};
}

//var njds = require('nodejs-disks');
var node_df = require('node-df');
var l_njds = function (arg) {
	if (process.platform === 'linux') {
		// get disk info
		/*
		njds.drives(function (err, drives) {
			njds.drivesDetail(drives, function (err, data) {				
				realtimeInfo.disks = data;
			});
		});*/
		var options_df = {
				        prefixMultiplier: 'GB',
				        isDisplayPrefixMultiplier: true,
				        precision: 2
				    };
		node_df(options_df, function (err, result) {
			if (err) {
				LOG.error(err, l_name);
				return;
			}
			for (var i in result) {
				result[i].mountpoint = result[i].mount;
				result[i].total = result[i].size;
				result[i].drive = result[i].filesystem;
			}
			realtimeInfo.disks = result;
		});
	}
	else if (os.platform() === "win32") {
		var parse_size = function (size) {
			var ntera = (size / Math.pow(2, 40)).toFixed(2);
			if (ntera > 1) {
				return ntera + " TB";
			}

			var ngiga = (size / Math.pow(2, 30)).toFixed(2);
			if (ngiga > 1) {
				return ngiga + " GB";
			}

			var nmega = (size / Math.pow(2, 20)).toFixed(2);
			if (nmega > 1) {
				return nmega + " MB";
			}

			var nkilo = (size / Math.pow(2, 10)).toFixed(2);
			if (nkilo > 1) {
				return nkilo + " KB";
			}

			return size + " B";
		};

		var property_list = ["deviceid", "freespace", "size"];
		var wmic = spawn("wmic", ["logicaldisk", "get", property_list.join()]);
		var disk_info = "";
		wmic.stdout.on("data", function (data) {
			for (var i = 0; i < data.length; i++) {
				disk_info += String.fromCharCode(data[i]);
			}
		});
		wmic.on("exit", function (code, signal) {
			realtimeInfo.disks = [];
			var disks = disk_info.split("\r\r\n");
			for (var i = 1; i < disks.length - 2; i++) {
				var disk = disks[i].replace(/\s+/g, " ").split(" ");
				var drive = disk[0];

				var available = 0;
				if (disk.length > 1) {
					available = Number(disk[1]);
				}

				var total = 0;
				if (disk.length > 2) {
					total = Number(disk[2]);
				}

				if (total > 0) {
					realtimeInfo.disks.push({
						used: parse_size(total - available),
						available: parse_size(available),
						freePer: Math.round(available / total * 100).toString(),
						usedPer: Math.round((total - available) / total * 100).toString(),
						total: parse_size(total),
						drive: drive
					});
				}
			}
		});

		var netstat = spawn("netstat", ["-e"]);
		var traffinfo = "";
		netstat.stdout.on("data", function (data) {
			for (var i = 0; i < data.length; i++) {
				traffinfo += String.fromCharCode(data[i]);
			}
		});
		netstat.on("exit", function (code, signal) {
			var traffin = traffinfo.split("\r\n")[4].replace(/\s+/g, " ").split(" ")[1];
			realtimeInfo.currentRXBPS = Math.round((traffin - realtimeInfo.previousRX) / 2);
			realtimeInfo.previousRX = traffin;

			var traffout = traffinfo.split("\r\n")[4].replace(/\s+/g, " ").split(" ")[2];
			realtimeInfo.currentTXBPS = Math.round((traffout - realtimeInfo.previousTX) / 2);
			realtimeInfo.previousTX = traffout;
		});
	}

	if (os.platform() === 'linux') {
		fs.readFile('/sys/class/net/eth0/statistics/rx_bytes', 'utf8', function (err, data) {
		//fs.readFile('/sys/class/net/p5p1/statistics/rx_bytes', 'utf8', function (err, data) {
			var value = parseInt(data);
			if (err) {
				return console.log(err);
			}
			realtimeInfo.currentRXBPS = Math.round((value - realtimeInfo.previousRX) / 2);
			realtimeInfo.previousRX = value;
		});

		fs.readFile('/sys/class/net/eth0/statistics/tx_bytes', 'utf8', function (err, data) {
		//fs.readFile('/sys/class/net/p5p1/statistics/tx_bytes', 'utf8', function (err, data) {
			var value = parseInt(data);
			if (err) {
				return console.log(err);
			}
			realtimeInfo.currentTXBPS = Math.round((value - realtimeInfo.previousTX) / 2);
			realtimeInfo.previousTX = value;
		});
	}
};

// get a current snapshot of system's hardware
var l_getSystemInfo = exports.getSystemInfo = function () {


		if (process.platform === 'linux') {

		}

		return {
			//title:  process.title,
			gid: process.getgid ? process.getgid() : 'unknown',
			uid: process.getuid ? process.getuid() : 'unknown',
			arch: process.arch,
			osarch: os.arch(),
			platform: process.platform,
			osplatform: os.platform(),
			ostype: os.type(),
			osrelease: os.release(),
			node_ver: process.version,
			start_time: SR.Stat.startTime,
			uptime: process.uptime(),
			hostname: os.hostname(),
			mem_total: os.totalmem(),
			mem_free: os.freemem(),
			mem_proc: SR.sys.inspect(process.memoryUsage()),
			net_in: SR.Stat.get('net_in'),
			net_out: SR.Stat.get('net_out'),
			conn_count: SR.Conn.getConnCount(),
			cpu_load: os.loadavg(),
			cpus: os.cpus(),
			channels: SR.Comm.list().length,
			subscribers: SR.Comm.count(),
			additional: realtimeInfo,
		};

	}
	////////////////////////////////////////////////////

// generate a hash from data, given encryption type
var l_hash = exports.hash = function (data, type) {
	var crypto = require('crypto');
	var dohash = crypto.createHash(type);
	dohash.update(new Buffer(data, 'binary'));
	data = dohash.digest('hex');
	return data;
}

// generate a random integer between 0 and (limit-1)
var l_randInteger = exports.randInteger = function (limit) {
	return Math.floor(Math.random() * limit);	
}

// ref: http://stackoverflow.com/questions/2573521/how-do-i-output-an-iso-8601-formatted-string-in-javascript
// convert a date to local ISO string
var l_localISOString = exports.localISOString = function (date, includeSeconds) {
	function pad(n) {
		return n < 10 ? '0' + n : n
	}
	var localIsoString = date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + 'T' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
	if (date.getTimezoneOffset() == 0) localIsoString += 'Z';
	return localIsoString;
};

// ref: http://stackoverflow.com/questions/1677644/detect-non-printable-characters-in-javascript
// test if a string is binary (non-printable characters)
var l_isBinary = exports.isBinary = function (data) {
	return /[\x00-\x1F]/.test(data);
}

// obtain a local port (from monitor for a local server)
// size specifies how many ports to obtain (default: 1)
// if no parameters are given, then return the port(s) already obtained
var l_assignedPorts = [];

/* version 1: ask monitor
var l_getLocalPort = exports.getLocalPort = function (onDone, size) {

	if (typeof onDone === 'undefined') {
		return l_assignedPorts;
	}
	
	var url = 'http://' + SR.Settings.IP_MONITOR + ':' + SR.Settings.PORT_MONITOR + '/getPort' + (size ? '?size=' + size : '');

	LOG.warn('get available port from: ' + url, l_name);

	UTIL.HTTPget(url, function (res_obj) {
		if (res_obj !== null) {
			
			var port = res_obj.port;
			
			// store ports obtained
			if (typeof port === 'number')
				l_assignedPorts.push(port);
			else {
				for (var i=0; i < port.length; i++)
					l_assignedPorts.push(port[i]);
			}
				
			UTIL.safeCall(onDone, port);
		}
		else {
			// get port fail, try to trace
			LOG.stack();
			UTIL.safeCall(onDone, 0);
		}
	});
}
*/

// version 2: self-generated
var l_getLocalPort = exports.getLocalPort = function (onDone, size) {

	if (typeof onDone === 'undefined') {
		return l_assignedPorts;
	}
	
	// try to find a random unused port between range
	var start = SR.Settings.PORT_APP_RANGE_START;
	var end = SR.Settings.PORT_APP_RANGE_END;
	var size = SR.Settings.PORT_RESERVED_SIZE;
	
	// if all attempts fail, we give up
	var max_attempts = (end - start) / size;
	var curr_attempt = 0;
	
	// NOTE: the attempted port are always start anew, as previously used port could be released
	var attempts = {};		
	
	var get_port = function () {
		
		// no ports found, we give up
		if (curr_attempt === max_attempts) {
			// get port fail, try to trace
			LOG.stack();
			return UTIL.safeCall(onDone, 0);		
		}

		// pick one random port
		var port = SR.Settings.PORT_APP_RANGE_START + UTIL.randInteger(max_attempts) * size;
		
		if (attempts.hasOwnProperty(port) === false) {
			
			LOG.warn('try to find an open port attempt ' + (curr_attempt+1) + '/' + max_attempts + '...', l_name);
			UTIL.isPortOpen(port, function (response) {
				// an open port is found
				if (response) {
					LOG.warn('open port [' + port + '] found!', l_name);
					
					// TODO: probably can remove this now as no need for monitor to keep track of assigned ports
					for (var i=0; i < size; i++)
						l_assignedPorts.push(port + i);
					
					return UTIL.safeCall(onDone, port);
				}
				// record port & try again
				curr_attempt++;
				attempts[port] = true;
				setTimeout(get_port, 0);
			});
		}
		// try again
		else
			setTimeout(get_port, 0);
	}
	
	// make the first attempt
	get_port();
	
}


// TODO: detect more correctly instead of specifying in settings?
// get domain + port for current entry server
exports.getEntryServer = function (secured) {
	return (secured ? 'https' : 'http') + '://' + SR.Settings.DOMAIN_LOBBY + ':' +
		(secured ? SR.Settings.PORT_ENTRY + 1 : SR.Settings.PORT_ENTRY) + '/';
}

// mix two objects into same object
exports.mixin = exports.merge = require('merge');

// read a JSON file as js object
exports.readJSON = function (path, onDone) {
	var fs = require('fs');
	var file = SR.path.join(__dirname, path);

	if (typeof onDone !== 'function')
		onDone = undefined;

	LOG.debug('read JSON from: ' + file, l_name);

	fs.readFile(file, 'utf8', function (err, data) {
		if (err) {
			LOG.error(err, l_name);
			UTIL.safeCall(onDone, err);
			return;
		}

		try {
			data = JSON.parse(data);
		}
		catch (e) {
			LOG.error(e, l_name);
			//throw e;
			UTIL.safeCall(onDone, e);			
			return;
		}
		LOG.sys(data);

		UTIL.safeCall(onDone, null, data);		
	});
}

var parsepath = require('parse-filepath');
// convert a path into an object for easier handling
exports.parsePath = function (path) {
	return parsepath(path);
}

// read scalra files (relative to scalra core directory)
var l_readFile = exports.readFile = function (path, onDone) {

	path = SR.path.join(__dirname, path);
	LOG.sys('reading file: ' + path, l_name);
	SR.fs.readFile(path, 'utf-8', function (err, data) {
		if (err) {
			LOG.error(err, l_name);
			UTIL.safeCall(onDone);
		}
		else {
			LOG.sys('read file success: ' + path, l_name);
			UTIL.safeCall(onDone, data);
		}
	});
}

// write scalra files (relative to scalra core directoy)
var l_writeFile = exports.writeFile = function (path, file, onDone) {

	path = SR.path.join(__dirname, path);
	LOG.sys('writing file: ' + path, l_name);
	SR.fs.writeFile(path, file, 'utf-8', function (err) {
		if (err) {
			LOG.error(err, l_name);
			UTIL.safeCall(onDone, false);
		}
		else {
			LOG.sys('file write success: ' + path, l_name);
			UTIL.safeCall(onDone, true);
		}
	});
}

// read scalra config
exports.readSystemConfig = function (onDone) {
	l_readFile(SR.path.join('..', '..', 'config.js'), onDone);
}

// write scalra config
exports.writeSystemConfig = function (file, onDone) {
	l_writeFile(SR.path.join('..', '..', 'config.js'), file, onDone);
}

///////////////////////////////////
// input: {}
// example: 
// output: JSON with date and time
///////////////////////////////////
// get a JSON with date and time
var l_getDateTimeJson = exports.getDateTimeJson = function (d) {
	if (d) var date = new Date(d);
	else var date = new Date();
	var hour = date.getHours();
	hour = (hour < 10 ? "0" : "") + hour;
	var min = date.getMinutes();
	min = (min < 10 ? "0" : "") + min;
	var sec = date.getSeconds();
	sec = (sec < 10 ? "0" : "") + sec;
	var year = date.getFullYear();
	var month = date.getMonth() + 1;
	month = (month < 10 ? "0" : "") + month;
	var day = date.getDate();
	day = (day < 10 ? "0" : "") + day;
	var timeObj = {
		"year": parseInt(year),
		"month": parseInt(month),
		"monthday": parseInt(day),
		"weekday": date.getDay(),
		"hour": parseInt(hour),
		"minute": parseInt(min),
		"second": parseInt(sec)
	};
	//console.log("date.getDay: " + date.getDay());
	switch (date.getDay()) {
		case 0:
			timeObj.weekDay = 'sunday';
			break;
		case 1:
			timeObj.weekDay = 'monday';
			break;
		case 2:
			timeObj.weekDay = 'tuesday';
			break;
		case 3:
			timeObj.weekDay = 'wednesday';
			break;
		case 4:
			timeObj.weekDay = 'thursday';
			break;
		case 5:
			timeObj.weekDay = 'friday';
			break;
		case 6:
			timeObj.weekDay = 'saturday';
			break;
		default:
			console.log("error code: xxxxxxxx");
			break;
	}
	return timeObj;
}

exports.getDateTimeTS = function (arg) {
	var x = l_getDateTimeJson(arg);
	var result = {
		Y: x.year.toString(),
		M: x.month.toString(),
		D: x.monthday.toString(),
		h: x.hour.toString(),
		m: x.minute.toString(),
		s: x.second.toString()
	};
	if (result.M.length === 1) result.M = '0' + result.M;
	if (result.D.length === 1) result.D = '0' + result.D;
	if (result.h.length === 1) result.h = '0' + result.h;
	if (result.m.length === 1) result.m = '0' + result.m;
	if (result.s.length === 1) result.s = '0' + result.s;
	//console.log("result " + result);
	return result.Y + result.M + result.D + '-' + result.h + result.m + result.s;
}


///////////////////////////// stable
// input: array
// output: array
/////////////////////////////
// clean 'null' elements for an array
var cleanArray = exports.cleanArray = function (actual) {
	if (!actual) {
		console.log("no input array");
		return false;
	}

	if (typeof(actual) !== 'object') {
		console.log("input is not ");
		return false;
	}

	var newArray = new Array();
	for (var i = 0; i < actual.length; i++) {
		if (actual[i]) {
			newArray.push(actual[i]);
		}
	}
	return newArray;
}



// http://stackoverflow.com/questions/5827612/node-js-fs-readdir-recursive-directory-search
//////////////////////////////
// multi-purpose find (-- walk a file hierarchy) cross-platform(pure nodejs version) 
// 此功能用來取代 linux find 指令
// input: {path: "path", onDone: function (){}, option: "lengthOfFilename atime mtime ctime filesize"}
// output: []
//////////////////////////////
// recursive file list 
var fs = require('fs');
var path = require('path');

var walk = function (dir, done) {
	var results = [];
	fs.readdir(dir, function (err, list) {
		if (err) {
			return done(err);
		}

		var pending = list.length;
		if (!pending) {
			return done(null, results);
		}

		list.forEach(function (file) {
			//file = dir + '/' + file;
			file = SR.path.join(dir, file);
			fs.stat(file, function (err, stat) {
				if (stat && stat.isDirectory()) {
					walk(file, function (err, res) {
						results = results.concat(res);
						if (!--pending) {
							done(null, results);
						}
					});
				}
				else {
					results.push({
						file: file,
						stat: stat
					});
					if (!--pending) {
						done(null, results);
					}
				}
			});
		});
	});
};

// multi-purpose find (-- walk a file hierarchy) cross-platform(pure nodejs version) 
exports.findFiles = function (arg) {
	LOG.debug("in findFiles", l_name);
	LOG.debug(arg, l_name);
	if (!arg) {
		console.log("error: no arg");
		return;
	}

	if (!arg.path) {
		console.log("error: no arg.path");
		return;
	}

	if (!arg.onDone) {
		console.log("error: no arg.onDone");
		return;
	}

	if (typeof arg.onDone !== 'function') {
		console.log("error: arg.onDone is not a function");
		return;
	}

	walk(arg.path, function (err, results) {
		if (err) {
			//throw err;
			console.log("error: path exists?");
			arg.onDone(["error: path exists?"]);
			return;
		}
		//console.log(results);

		var r = undefined;

		if (arg.sortOption) {
			r = results.sort(function(a, b) {
				if (!a) return 0;
				if (!b) return 0;
				switch (arg.sortOption) {
					case 'filenameLocale':
						return a.file.localeCompare(b.file);
						break;
					case 'filename':
						return a.file - b.file; // length of filename
						break;
					case 'lengthOfFilename':
						return a.file.length - b.file.length; // length of filename
						break;
					case 'atime':
						return a.stat.atime - b.stat.atime; // access time of file
						break;
					case 'mtime':
						if (!a.stat) return 0;
						if (!b.stat) return 0;
						if (!a.stat.mtime) return 0;
						if (!b.stat.mtime) return 0;
						return a.stat.mtime - b.stat.mtime; // modification time of file
						break;
						// http://www.linux-faqs.info/general/difference-between-mtime-ctime-and-atime
						// ctime: ctime is the inode or file change time. The ctime gets updated when the file attributes are changed, like changing the owner, changing the permission or moving the file to an other filesystem but will also be updated when you modify a file.
						// mtime: mtime is the file modify time. The mtime gets updated when you modify a file. Whenever you update content of a file or save a file the mtime gets updated.
						// atime: atime is the file access time. The atime gets updated when you open a file but also when a file is used for other operations like grep, sort, cat, head, tail and so on.
					case 'ctime':
						return a.stat.ctime - b.stat.ctime; // creation time of file
						break;
					case 'filesize':
						return a.stat.size - b.stat.size; // size of file
						break;
					default:
						break;
				}
			});
		}
		else {
			console.log("no sortOption");
		}
		//console.log(r);

		for (var i in r) {
			if (arg.rexmatch) {
				if (r[i].file.match(arg.rexmatch)) {}
				else {
					//console.log("delete: ");
					//console.log(r[i]);
					delete r[i];
				}
			}

			if (r[i] && r[i].stat && arg.ctime && arg.ctime.start && arg.ctime.end) {
				if (r[i].stat.ctime.getTime() >= arg.ctime.start.getTime() && r[i].stat.ctime.getTime() <= arg.ctime.end.getTime()) {}
				else {
					//console.log("delete: ");
					//console.log(r[i]);
					delete r[i];
				}
			}

			if (r[i] && r[i].stat && arg.mtime && arg.mtime.start && arg.mtime.end) {
				if (r[i].stat.mtime.getTime() >= arg.mtime.start.getTime() && r[i].stat.mtime.getTime() <= arg.mtime.end.getTime()) {}
				else {
					//console.log("delete: ");
					//console.log(r[i]);
					delete r[i];
				}
			}
		}
		//console.log(r);

		r = cleanArray(r);
		if (arg.reverse && arg.reverse === true) {
			r = r.reverse();
		}

		if (arg.limit && typeof arg.limit === 'number') {
			var re = [];
			for (var i in r) {
				if (i > arg.limit - 1) {
					break;
				}
				re.push(r[i]);
			}
			r = re;
		}

		if (arg.outputFilenameOnly && arg.outputFilenameOnly === true) {
			var re = [];
			for (var i in r) {
				re.push(r[i].file);
			}
			r = re;
		}

		arg.onDone(r);
	});
};



/* Array.prototype.getUnique = function (){
   var u = {}, a = [];
   for(var i = 0, l = this.length; i < l; ++i){
      if(u.hasOwnProperty(this[i])) {
         continue;
      }
      a.push(this[i]);
      u[this[i]] = 1;
   }
   return a;
} */


exports.mkdirParent = function (dirPath, mode, callback) {
	if (!dirPath) {
		console.log("no input path");
		return false;
	}
	fs.mkdirParent = function (dirPath, mode, callback) {
		//Call the standard fs.mkdir
		fs.mkdir(dirPath, mode, function (error) {
			//When it fail in this way, do the custom steps
			if (error && error.errno === 34) {
				//Create all the parents recursively
				fs.mkdirParent(path.dirname(dirPath), mode, callback);
				//And then the directory
				fs.mkdirParent(dirPath, mode, callback);
			}
			//Manually run the callback since we used our own callback to do all these
			callback && callback(error);
		});
	};
}

////////////////////////////////////////
// 
//
////////////////////////////////////////
// to decide which partition from given path
exports.whichPartition = function (arg) {

	if (!arg) {
		console.log("no input, utility.js 1274");
		return false;
	}


	if (typeof(arg) !== 'object') {
		console.log("incorrect arg, utility.js 1279");
		return false;
	}

	if (!arg.onDone) {
		console.log("in whichPartition: no onDone");
		return false;
	}

	if (arg.onDone !== 'function') {
		console.log("in whichPartition: onDone is not a function");
		return false;
	}

	var paths = " ";
	for (var i in arg) {
		if (typeof(arg[i]) === "string")
			paths = paths + arg[i] + " ";
	}
	//console.log("paths");
	//console.log(paths);

	if (process.platform === 'linux') {
		exec("df -TP " + paths, function (err, stdout, stderr) {
			if (err) {
				console.log("utility.js error 12541292");
				console.log(err);
			}
			else {
				var partitions = [];
				var partitionTemp1 = stdout.split(" ");
				var partitionTemp2 = [];
				for (var i in partitionTemp1) {
					partitionTemp2[i] = partitionTemp1[i].split('\n');
				}
				//console.log("partitionTemp");
				for (var i in partitionTemp2) {
					for (var j in partitionTemp2[i]) {
						if (partitionTemp2[i][j].match(/\//) > -1) {}
						else {
							if (partitions.indexOf(partitionTemp2[i][j]) === -1) {
								partitions.push(partitionTemp2[i][j]);
							}
						}
					}
				}
				//console.log(partitions);
				if (arg.onDone) arg.onDone(partitions);
				return partitions;
			}
		});
	}
}

// contact monitor server to get certain info
exports.contactMonitor = function (type, para, onDone, is_broadcast) {

	var monitors = [];
	
	// choose one monitor server (randomly choose one if more than one)
	if (SR.Settings.IP_MONITOR instanceof Array) {
		if (is_broadcast) {
			for (var i=0; i < SR.Settings.IP_MONITOR.length; i++)
				monitors.push(SR.Settings.IP_MONITOR[i]);
		}
		else {
			var index = UTIL.randInteger(SR.Settings.IP_MONITOR.length);
			monitors.push(SR.Settings.IP_MONITOR[index]);
		}
	}
	else {
		monitors.push(SR.Settings.IP_MONITOR);
	}
	
	for (var i=0; i < monitors.length; i++) {

		var monitor = monitors[i] + ':' + SR.Settings.PORT_MONITOR;
		LOG.sys('contact monitor: ' + monitor, l_name);
		
		// TODO: change this from POST requests to socket-based persistant connections
		var url = 'http://' + monitor + '/' + type + '/';
		
		//LOG.warn('contact monitor url: ' + url);
		//LOG.warn(para);
		
		// send POST request
		UTIL.HTTPpost(
			url,
			para,
			function (err, response, body) {
				//LOG.debug('contactMonitor statusCode: ' + response.statusCode + ' body:', l_name);
				//LOG.warn(response, l_name);
				//LOG.debug(body, l_name);
				
				if (err)
					LOG.error(err, l_name);
				else if (response.statusCode == 200) {
					if (body === '')
						err = 'no proper response from monitor';
				}
				
				UTIL.safeCall(onDone, err, body);
			}
		);
	}
}

// build objects as part of UTIL
var files = SR.fs.readdirSync(__dirname + '/UTIL');
for (var i=0; i < files.length; i++) {
	var name = files[i].split('.')[0];
	exports[name] = require(__dirname + '/UTIL/' + name)[name];
}
