//
//
// proxy.js
//
//  HTTP proxy to connect and forward HTTP requests between servers
//
//	This component initializes and forwards HTTP requests to another server and get results back.
//
// methods:
//		web(req, res, target, onError)
//		ws(req, res, target, onError)
//		init(onDone)
//		dispose(onDone)
//
//
// history:
//	
//	2014-06-14	start
//


/*
proxy issues:
	hanging proxy requests:
	https://github.com/nodejitsu/node-http-proxy/issues/168#issuecomment-3289492
	https://github.com/nodejitsu/node-http-proxy/issues/180
*/
var http = require('http'),
    httpProxy = require('http-proxy');
const urlParser = require('url');

exports.proxy = httpProxy;

// a cache for currently running proxy forwarder
// TODO: remove obsolete / old ones?
var l_proxies = {};

// NOTE: cannot export proxy.web directly
// target = {IP: 'string', port: 'number'};
var l_web = exports.web = function (req, res, target, onError, buffer) {

	var proxy = undefined;
	var host = target.IP + ':' + target.port;
	var options = {target: 'http://' + host};
	
	if (buffer)
		options.buffer = buffer;
	
	// changes the origin of the host header to the target URL
	// see: https://github.com/nodejitsu/node-http-proxy/blob/master/lib/http-proxy.js#L33-L50
	//options.changeOrigin = true;
	
	// check if target exists or we should start new proxy
	if (l_proxies.hasOwnProperty(host) === false) {
		LOG.warn('create new web proxy, options: ', 'SR.Proxy');
		LOG.warn(options, 'SR.Proxy');
		
		// TODO: destroy server accordingly? (if the remote server do not exist or break down?)
		proxy = httpProxy.createProxyServer(options);
		
		proxy.on('error', function (e, req, res) {		
			UTIL.safeCall(onError, e, req, res, host);
		});

		proxy.on('proxyRes', function (proxyRes, rq, rs) {
			LOG.sys('RAW Response from ' + options.target, 'SR.Proxy');
			LOG.sys(JSON.stringify(proxyRes.headers, true, 2), 'SR.Proxy');
			
			//res.setHeader('access-control-allow-origin', proxyRes.headers.access-control-allow-origin);
			//res.setHeader('access-control-allow-credentials', proxyRes.headers.access-control-allow-credentials);
		});
		
		
		// modify the request from client before sending it to the proxy server
		// ref: https://github.com/nodejitsu/node-http-proxy
		proxy.on('proxyReq', function (proxyReq, req, res, options) {
			//proxyReq.setHeader('X-Special-Proxy-Header', 'foobar');
			LOG.debug('header (received from client): ', 'SR.Proxy');
			LOG.debug(JSON.stringify(req.headers, true, 2), 'SR.Proxy');
			
			// NOTE: below does not seem to affect anything at all (for example, proxyReq's header is still 'undefined')
			//proxyReq.setHeader('content-type', req.headers['content-type']);
			//proxyReq.setHeader('cookie', req.headers['cookie']);
		});
				
		// store proxy for later uses
		l_proxies[host] = proxy;
	}
	else
		proxy = l_proxies[host];
			
	// call proxy away
	return proxy.web(req, res, options);
}

// handling ws requests (query-only)
var l_ws = exports.ws = function (req, res, target, onError) {
	
	var proxy = undefined;
	var host = target.IP + ':' + target.port;

	// check if target exists or we should start new proxy
	if (l_proxies.hasOwnProperty(host) === false) {
		
		// get a new port
		UTIL.getLocalPort(function (port) {
			if (port === 0) {
				LOG.error('cannot get local port to start ws proxy', 'SR.Proxy');
				return SR.REST.reply(res, {IP: '', port: 0});
			}
			
			LOG.warn('start ws proxy at local port: ' + port, 'SR.Proxy');
			proxy = l_startWebSocketProxy(host, port, function (e) {
				UTIL.safeCall(onError, e, req, res, host);
			});

			LOG.warn('Responding with new proxy for: ' + host, 'SR.Proxy');
			LOG.warn('port: ' + proxy.local_port, 'SR.Proxy');
			
			// respond the IP/port of the ws proxy
			// NOTE: it's possible that 'proxy' object may not be ready (esp. proxy.local_port) when returning proxy IP/port below
			// so better to respond the port directly to avoid empty port being returned
			SR.REST.reply(res, {IP: SR.Settings.SERVER_INFO.IP, port: port});				
		});		
	}
	else {
		proxy = l_proxies[host];
		
		LOG.warn('Responding with existing proxy for: ' + host, 'SR.Proxy');
		LOG.warn('port: ' + proxy.local_port, 'SR.Proxy');
		if (typeof proxy.local_port === 'undefined')
			LOG.warn(proxy, 'SR.Proxy');
		
		// respond the IP/port of the ws proxy
		SR.REST.reply(res, {IP: SR.Settings.SERVER_INFO.IP, port: proxy.local_port});	
	}
}

// start a standalone ws proxy
// NOTE: currently the HTTP server can't be shutdown once started
var l_startWebSocketProxy = function (host, port, onError) {
	
	var proxy = undefined;
	
	var options = {target: 'ws://' + host, ws: true};
	LOG.warn('create new ws proxy at port: ' + port + ' options: ', 'SR.Proxy');
	LOG.warn(options, 'SR.Proxy');
	
	proxy = httpProxy.createServer(options);
		
	// install error handler (NOTE: very imporant for stability)
	proxy.on('error', function (err, req, res) {
		UTIL.safeCall(onError, err);
	});
	
	// be notified when closed
	// ref: https://github.com/nodejitsu/node-http-proxy
	proxy.on('close', function (req, socket, head) {
  		// view disconnected websocket connections
  		console.log('Client disconnected');
	});	

	// store proxy for later uses
	// NOTE: not used directly
	l_proxies[host] = proxy;

	// record local port for future references
	// NOTE: this is an important step for future queries of the proxy
	// and may need to be performed before setting the on('xx') handler(s) 
	// BUG: seems like 'local_port' info will disappear under certain circumstances
	// (after entries are shutdown & restart many times)
	l_proxies[host].local_port = port;
		
	// start to listen for requests	
	// NOTE: listen may fail or cause errors that could trigger this proxy be removed from list
	proxy.listen(port);	

	return proxy;
	
	/* 2nd version
	proxy = httpProxy.createProxyServer(options);
	
	proxy.on('error', function (e) {
		UTIL.safeCall(onError, e);
	});
	
	// start a new HTTP server just for websocket connections
	var proxyServer = http.createServer(function (req, res) {
		LOG.warn('incoming request to standalone HTTP ws proxy', 'SR.Proxy');
		proxy.web(req, res);
	});

	//
	// Listen to the `upgrade` event and proxy the
	// WebSocket requests as well.
	//
	proxyServer.on('upgrade', function (req, socket, head) {
		try {
			proxy.ws(req, socket, head);
		}
	    catch (e) {
			LOG.error('websocket error:', 'SR.Proxy');
			LOG.error(e, 'SR.Proxy');
		}
			
	});

	// TODO: may need to provide a unique port for it
	// TODO: record this http server?
	LOG.warn('starting ws proxy at port: ' + port, 'SR.Proxy');
	proxyServer.listen(port);
	
	return proxy;
	*/
}

var l_httpServer = undefined;

// NOTE: proxy now is always HTTP mode (not secured)
exports.init = function (onDone, onProxyFail) {

	// same error handling for both HTTP or WebSocket proxies
	var onError = function (e, req, res, host) {
		LOG.error('proxy error for host: ' + host + '. remove from active proxy list:', 'SR.Proxy');
		LOG.error(e, 'SR.Proxy');
		
		// remove proxy info from list
		delete l_proxies[host];
		
		// notify for proxy failure
		UTIL.safeCall(onProxyFail, host);
		
		// send back to client about the proxy error
		res.writeHead(502, {
   			'Content-Type': 'text/plain'
		});
		res.end('PROXY_ERROR: cannot access proxy: ' + host);		
	};
	
	// NOTE: will need to create dedicated HTTP server just for relaying websocket requests
	
	// create a standalone proxy server with custom logic
	l_httpServer = http.createServer(function (req, res) {

		var words = urlParser.parse(req.url, true).pathname.split("/");
		
		var target = {
			IP:		words[1],
			port: 	parseInt(words[2]),
			type:	words[3]
		};
		
		var is_websocket = (target.type === 'ws');
		LOG.sys('is_websocket: ' + is_websocket, 'SR.Proxy');
		
		// remove owner/project/server info from URL
		req.url = '/' + words.splice(4).join().replace(/,/g, '/');
		
		// perform proxy forwarding
		if (is_websocket)
			l_ws(req, res, target, onError);
		else
			l_web(req, res, target, onError);
	});
	
	// get proxy port from monitor
	UTIL.getLocalPort(function (port) {
		if (port === 0) {
	        LOG.error('cannot get valid port, cannot start proxy server', 'SR.Proxy');
			return UTIL.safeCall(onDone);
		}

		LOG.sys('get monitor assigned port: ' + port, 'SR.Frontier');
		SR.Settings.PORT_PROXY = port;
		
		l_httpServer.listen(port, function () {
			UTIL.safeCall(onDone);	
		});
	});
}

// to shutdown server
exports.dispose = function (onDone) {
	if (l_httpServer) {
		l_httpServer.close(function () {
			UTIL.safeCall(onDone);
			l_httpServer = undefined;
		});
	}
	else
		UTIL.safeCall(onDone);
}
