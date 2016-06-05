/*

//
//  REST_web.js
//
//	a RESTful handler for request handling in monitor
//
	supported_handles:

getServer
default


*/

var l_handles = exports.REST_handles = {};


//
// local private variables to keep track of created data
//


//
//  internal functions
//
/*
// attempt to query monitor server for some info
var l_queryServer = function (name, onDone) {
	
	var url = 'http://' + SR.Settings.IP_MONITOR + ':' + SR.Settings.PORT_MONITOR + '/query/' + name.replace(/-/g, '/');
	
	LOG.warn('query server info: ' + url, 'Entry');

	UTIL.HTTPget(url, function (res_obj) {
		if (res_obj !== null)
			UTIL.safeCall(onDone, res_obj);
		else {
			// get port fail, try to trace
			LOG.stack();
			UTIL.safeCall(onDone);
		}
	});
}
*/

/*
var httpProxy = require('http-proxy');
var proxy = httpProxy.createProxyServer({});

proxy.on('error', function (e) {
	LOG.error('proxy error:', 'Entry');
	LOG.error(e, 'Entry');
});
*/

// query info for a server, returns server in the format of {IP: 'string', port: 'number}
// undefined if no servers found
var l_query = function (server_name, onDone) {

	// check if cached server info exists	
	if (l_servers.hasOwnProperty(server_name)) {
		var server = l_servers[server_name];
		
		LOG.warn('cache exists: ', 'Entry');
		LOG.warn(server, 'Entry');
		UTIL.safeCall(onDone, server);
	}
	else {
		
		// seek server IP/port info from monitor
		//l_queryServer(server_name, function (result) {
		//SR.Script['handler'].queryServer(server_name, function (result) {
		//g_handler.queryServer(server_name, function (result) {
		SR.API.queryServer({name: server_name}, function (err, result) {
			
			if (err) {
				return LOG.error(err);	
			}
			
			if (result && result.length > 0) {
				// TODO: pick a random one if more than one choices OR choose based on loading?
				var index = UTIL.randInteger(result.length);
				var info = result[index];
			
				var server = {IP: info.IP, port: info.port}
				l_servers[server_name] = server;
				onDone(server);
			}
			else
				onDone();
		});
	}	
}

var l_onError = function (e) {
	LOG.error('proxy error:', 'Entry');
	LOG.error(e, 'Entry');
};

// forward requests to remote HTTP server
// NOTE: conn_type may be: 'http', 'https', 'ws', 'wss'
var l_forward = function (server_name, conn_type, path_array, res, para, req) {
	
	var server = undefined;
	
	LOG.sys('[' + conn_type + '] forwarding to: ' + server_name, 'SR.Entry');
	LOG.sys('para:', 'SR.Entry');
	LOG.sys(para);
	
	//var buffer = SR.Proxy.proxy.buffer(req);
	
	l_query(server_name, function (server) {
		
		if (typeof server === 'undefined') {
			SR.REST.reply(res, 'server info not found');
			return;
		}
		
		var IP = server.IP;
		var port = server.port;
		
		// add port number
		if (conn_type === 'https' || conn_type === 'wss')
			port += SR.Settings.PORT_INC_HTTPS;
		else
			port += SR.Settings.PORT_INC_HTTP;
		
		/*
		// version 2: send directly using SR.Proxy (copied from SR.Proxy)
		// NOTE: will hang while making request (reason yet unknown)
		var target = {
			IP:		IP,
			port: 	port,
			type:	conn_type
		};
		
		var is_websocket = (target.type === 'ws');
		LOG.sys('is_websocket: ' + is_websocket, 'Entry');
		
		// remove owner/project/server info from URL
		LOG.debug('url (before): ' + req.url, 'Entry');
		req.url = '/' +	path_array.join().replace(/,/g, '/');
		LOG.debug('url (after): ' + req.url, 'Entry');
		//req.headers["transfer-encoding"] = "chunked";
		
		// perform proxy forwarding
		if (is_websocket)
			SR.Proxy.ws(req, res, target, l_onError);
		else
			SR.Proxy.web(req, res, target, l_onError);
		*/
		
		
		// version 1: send POST request to proxy
		// NOTE: we always use http for this (even if the target server may use HTTPS)
		// NOTE: cookie & other info in request header, may be lost at this point
		var url = 'http://' + SR.Settings.SERVER_INFO.IP + ':' + SR.Settings.PORT_PROXY + '/' + IP + '/' + port + '/' + conn_type + '/' + path_array.join().replace(/,/g, '/');
		LOG.warn('forward to url: ' + url, 'Entry');
		
		// set default (or empty data object), otherwise HTTPpost will not accept
		para = para || {};
		
		// send POST request to proxy
		// NOTE: we pass the header object as well, so this becomes in fact a forwarding request 
		UTIL.HTTPpost(
			url,
			para,
			function (err, response, data) {
				if (err) {
					LOG.error('HTTP post request error:', 'Entry');
					LOG.error(err, 'Entry');
					SR.REST.reply(res, 'HTTP post request error', 'Entry');
					return;
				}
				LOG.warn('status: ' + response.statusCode, 'Entry');
				
				// check for proxy error (the server to proxy to cannot be reached)
				if (response.statusCode === 502) {
					LOG.error(data, 'Entry');
					
					// remove this proxy from cache
					delete l_servers[server_name];
					
					LOG.warn('remove from cache: ' + server_name + '. try to connect to another server in 10ms', 'Entry');
					setTimeout(function () {
						// recall forward
						l_forward(server_name, conn_type, path_array, res, para, req);				
					}, 10);
					return;
				}
				
				// original version				
				// reply the same regardless of conn_type
				// TODO: right now cannot be send back properly or not found (400)
				//var location = undefined;
				//if (response.headers['location']) {
				//	location = UTIL.getEntryServer() + server_name.replace(/-/g, '/') + response.headers['location'];
				//}
				//SR.REST.reply(res, data, {content_type: response.headers['content-type'], location: location});
				
				//LOG.warn('HTTP response data sent back to client: ', 'Entry');
				LOG.warn('headers:', 'Entry');
				LOG.warn(response.headers, 'Entry');
				LOG.sys(data, 'Entry');
	
				// re-write location
				if (response.headers['location']) {
					response.headers['location'] = UTIL.getEntryServer() + server_name.replace(/-/g, '/') + response.headers['location'];
				}
								
				// pass headers directly
				// NOTE: passing headers directly will cause returned webpages be interpreted as "lines" instead of "webpages"
				// (reason still unknown) webpages thus will not load correctly
				// but seems like if we only reply with specific header fields (cookie & content-type)
				// then the returned data will be interpreted by browser correctly		
				//SR.REST.reply(res, data, undefined, response.headers);
				
				// NOTE: below pass the cookie fields directly without processing by SR.REST.reply
				SR.REST.reply(res, data, {'set-cookie': response.headers['set-cookie'], 
										  'content_type': response.headers['content-type']});
				
				// TODO: possible to reponse websocket response directly?
				// NOTE: right now we simply return another dedicated websocket proxy port to be used later to proxy websocke directly
			},
			req.headers
		);	
		
	});

}

//
//  REST handlers
//

// obtain the IP & port of a particular server, given its type
l_handles.getServer = function (path_array, res, para, req) {

	var res_obj = {
		IP: '0.0.0.0',
		port: 0
	};

	SR.REST.reply(res, res_obj);
}

// cache for project name to server mapping
var l_servers = SR.State.get('servermap');

// default handler
l_handles.default = function (path_array, res, para, req) {
		
	var owner = path_array[1];
	var project = path_array[2];
	var server = path_array[3];
	var conn_type = (path_array[4] === 'ws' ? 'ws' : 'http');
		
	if (typeof owner !== 'string' || typeof project !== 'string' || typeof server !== 'string') {
		return SR.REST.reply(res, 'Unsupported Request');
	}

	// remove unused elements
	path_array = (conn_type === 'ws' ? path_array.splice(5) : path_array.splice(4));

	var server_name = owner + '-' + project + '-' + server;
	
	LOG.warn('ENTRY: accessing server: ' + server_name, 'Entry');
	
	return l_forward(server_name, conn_type, path_array, res, para, req);	
}


//-----------------------------------------
// Start/Stop procedures
//
//-----------------------------------------

SR.Callback.onStart(function () {
	SR.Proxy.init(
		function () {
			LOG.warn('Proxy init done', 'Entry');
		}, 
		// notify if a proxy fails
		// TODO: pretty ugly way to remove/update it
		function (host) {
			LOG.error('local proxy failed for host: ' + host + '. remove mapping...', 'Entry');
			host = host.split(':');
			var IP = host[0];
			var port = parseInt(host[1]) - SR.Settings.PORT_INC_HTTP;
			
			// remove matching server mapping
			for (var name in l_servers) {
				var info = l_servers[name];
				if (info.IP === IP && info.port === port) {
					LOG.warn('remove mapping for server: ' + name, 'Entry');
					delete l_servers[name];
					return;
				}
			}
		});
});

SR.Callback.onStop(function () {
	SR.Proxy.dispose();
});

SR.REST.addHandler(l_handles);
