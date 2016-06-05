//
//  serverserver.js
//
//	a basic socket server
//
//	history:
//		2016-01-10	extracted from frontier.js
//

// module object
var l_module = exports.module = {};

// a pool for all message handlers
var l_handlers = exports.handlers = {};
var l_checkers = exports.checkers = {};
var l_api = exports.api = {};

var l_name = 'SR.Module.socketserver';

//-----------------------------------------
// Handlers (format checkers and event handlers)
//
//-----------------------------------------



//-----------------------------------------
// Server Event Handling
//
//-----------------------------------------

// default IP & port
var l_ip_port = exports.ip_port = {};

// a SR.Listener object  
var l_server = undefined;

//
// external functions
//

// get server instance
exports.get = function () {
	return l_server;	
}

SR.Callback.onStart(function () {
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
	
	// process config & verify correctness here	
	LOG.warn('init socket server...', l_name);
	
	// NOTE: base port previously indicate 'socket port', but now will be 'HTTP' port
	var start_server = function () {
		
		LOG.warn('starting [' + SR.Settings.SERVER_INFO.type + '] server at base port: ' + l_ip_port.port, l_name);
		
		// NOTE: name will determine which handler set to get/store
		// create a listener that'll listen to the default socket port for this server
		l_server = new SR.Listener({
			port:           l_ip_port.port + SR.Settings.PORT_INC_SOCKET,
			conn_module:    config.conn_handler
		});
		
		// always load system.js (NOTE: before other handlers)
		SR.Handler.addByFile({name: 'system',	file: 'system.js', owner: 'SR'}, config.path);
		
		// result may be true or false
		l_server.init(function (result) {
			if (result === false) {
				LOG.error('server init fail, listen port: ' + l_ip_port.port, l_name);
				
				// NOTE: this is redundant judgement with frontier's 
				//LOG.warn('treat this server as APP server, loading AppConnector...', l_name);
				//SR.Module.addStep(SR.Component.AppConnector());
				
				// TODO: try to close down more gracefully, right now this will trigger many 
				// unnecessary shutdown steps (& print too many error messages not useful)
				//l_dispose();
			}
			else {
				LOG.warn('server is ready & running...', l_name);
								
				// for entry server, we report the entry server HTTP base port
				// TODO: cleaner approach?
				if (SR.Settings.SERVER_INFO.type === 'entry')
					SR.Settings.SERVER_INFO.port = SR.Settings.PORT_ENTRY_ACTUAL;
				
				// NOTE: this is redundant judgement with frontier's 
				//else if (SR.Settings.SERVER_INFO.type === 'lobby') {
				//	LOG.warn('treat this server as LOBBY server, loading AppManager...', l_name);
				//	SR.Module.addStep(SR.Component.AppManager());
				//}
			}
			
			UTIL.safeCall(onDone, true);
		});
	}
	
	// get main server port
	// the rules are:
	//	    1. for lobby with assigned port, use the assigned port in project's settings.js	
	//		2. monitor server: port is assigned in SR.Settings.PORT_MONITOR
	// 		3. for all else (app servers or unassigned lobby), port is assigned by monitor server (valid for local host)
	
	// determine server port		
	var get_port = function (onDone) {
		
		// make sure lobby port is a number			
		if (typeof SR.Settings.Project.lobbyPort === 'string')
			SR.Settings.Project.lobbyPort = parseInt(SR.Settings.Project.lobbyPort);		
		
		// for lobby server with assigned port
		if (SR.Settings.SERVER_INFO.type === 'lobby' && typeof UTIL.userSettings('lobbyPort') === 'number')
			return UTIL.safeCall(onDone, UTIL.userSettings('lobbyPort'));		
		
		// assign specific port for monitor
		if (SR.Settings.SERVER_INFO.type === 'monitor')
			return UTIL.safeCall(onDone, SR.Settings.PORT_MONITOR);
	
		// for app servers or for unassigned lobby server, we need to get an available port from monitor server	

		// NOTE: we get up to 10 ports per server (lobby, app, entry)
		var size = (SR.Settings.SERVER_INFO.type === 'entry' ? 1 : SR.Settings.PORT_RESERVED_SIZE);
		
		UTIL.getLocalPort(function (port) {
			if (port === 0) {
				LOG.error('cannot get valid port, cannot start server', l_name);
				UTIL.safeCall(onDone, false);
				return l_dispose();
			}
			
			LOG.sys('get monitor assigned port(s): ' + port, l_name);
			
			// return only the first one
			UTIL.safeCall(onDone, (typeof port === 'number' ? port : port[0]));
		}, size);
	}
	
	// determine server IP & port then start server
	// get my own local IP (for future uses)
	UTIL.getLocalIP(function (local_IP) {
		LOG.sys('get local IP: ' + local_IP, l_name);
		l_ip_port.IP = local_IP;
				
		get_port(function (port) {
			l_ip_port.port = port;
			LOG.warn('server base port: ' + l_ip_port.port, l_name);
			
			// update server info with ip & port
			SR.Settings.SERVER_INFO.IP   = l_ip_port.IP;
			SR.Settings.SERVER_INFO.port = l_ip_port.port;

			// finally we start the server
			start_server();
		});				
	});
}

// module shutdown
l_module.stop = function (onDone) {
	// close / release resources used
	
	// shutdown server, if exist
	if (l_server) {
		l_server.dispose(function () {
	
			LOG.warn('socket server stopped...', l_name);				
			l_server = undefined;
			UTIL.safeCall(onDone, true);			
		});
	}
}
