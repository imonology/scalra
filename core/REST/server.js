/*
	server.js
	
	2012.09.18	  init
	2012.10.25		adopted from VSS to icREST


*/

// TODO: make this generic and can start multiple servers at once (used for different purposes)
// NOTE: right now the same HTTP server code is redundently coded for Monitor and FB server as well

const http = SR.http,
	 https = SR.https,
	 qs	= require('querystring');


// custom response handling to set cookie
var response = require('./response');

// TODO: simplify?
var HTTPserver = undefined;
var HTTPSserver = undefined;

// start server
exports.start = function (type, route, port) {
	
	// check to override default port
	var serverPort = port || 39900;
	var hostname = SR.Settings.DOMAIN_LOBBY;
	var myHost = (type === 'HTTPS' ? 'https' : 'http') + '://' + hostname + ':' + serverPort + '/'; 

	// main place to receive HTTP-related requests
	var handle_request = function (req, res) {
		LOG.warn('handle_request');

		// attach custom res methods (borrowed from express)
		res = UTIL.mixin(res, response);

		LOG.sys('HTTP req received, header', 'SR.REST');
		LOG.sys(req.headers, 'SR.REST');
		
		var content_type = req.headers['content-type'];

		// NOTE: multi-part needs to be handled first, because req.on('data') will not be able to process correctly
		if (typeof content_type === 'string' && content_type.startsWith('multipart/form-data; boundary=')) { 
			LOG.warn('parsing form request...', 'SR.REST');
			route(req, res);
			return;
		}
		
		// temp buffer for incoming request
		var data = '';
		var JSONobj = undefined;
		
		req.on('data', function (chunk) {
			data += chunk;
		});

		req.on('end', function () {
			
			var JSONobj = undefined;
			
			try {
				if (data !== '') {
						
					if (content_type.startsWith('application/x-www-form-urlencoded')) {
						JSONobj = qs.parse(data);
					} else if (content_type.startsWith('application/json')) {
						JSONobj = UTIL.convertJSON(decodeURIComponent(data));
					} else if (content_type.startsWith('application/sdp')) {
						JSONobj = data;
					} else {
						var msg = 'content type not known: ' + content_type;
						LOG.warn(msg, 'SR.REST');
						SR.REST.reply(res, msg);
						//res.writeHead(200, {'Content-Type': 'text/plain'});
						//res.end(msg);
						return;
					}
				}
			} catch (e) {
				var msg = 'JSON parsing error for data: ' + data + '\n content_type: ' + content_type;
				LOG.error(msg, 'SR.REST');
				//res.writeHead(200, {'Content-Type': 'text/plain'});
				//res.end(msg);
				SR.REST.reply(res, msg);
				return;
			}

			route(req, res, JSONobj);
		})
	}

	var server = undefined;
	if (type === 'HTTPS') {

		if (!SR.Keys) {
			LOG.error('no keys provided in settings.js, cannot start HTTPS server', 'SR.REST');
			return undefined;
		}

		var options = {
			key: SR.Keys.privatekey,
			cert: SR.Keys.certificate
		};

		// add CA info if available
		if (SR.Keys.ca) {
			options.ca = SR.Keys.ca			
		}		
				
		server = HTTPSserver = https.createServer(options, handle_request);
	} else {
		server = HTTPserver = http.createServer(handle_request);
	}

	// TODO: check HTTP_URL is used?
	LOG.warn('creating ' + type + ' server at port: ' + serverPort, 'SR.REST');
	server.listen(serverPort, function () {
		LOG.warn(type + ' Server running at ' + myHost, 'SR.REST');
		if (type === 'HTTPS')
			SR.REST.HTTPS_URL = myHost;
		else
			SR.REST.HTTP_URL = myHost;		
	});
	
	/*
	server.on('connection', function (socket) {
		socket.setNoDelay(true);
	});
	*/	
	
	return server;
}

// stop server
exports.stop = function (type) {
	if (type === 'HTTPS' || type === undefined) {
		if (HTTPSserver !== undefined) {
			HTTPSserver.close();
			HTTPSserver = undefined;
			delete SR.REST.HTTPS_URL;
		}
	}
	
	if (type === 'HTTP' || type === undefined) {
		if (HTTPserver !== undefined) {
			HTTPserver.close();			
			HTTPserver = undefined;
			delete SR.REST.HTTP_URL;
		}
	}
}
