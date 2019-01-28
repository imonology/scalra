//
//  connector.js
//
//  a socket initiator to a remote host
//
//  history:
//  2013-09-14  adopted from frontier
  


/*

    functions:
    
    addHandler(handlers)
    connect(ip_port, onDone)
    disconnect(onDone)
    isConnectorReady()
    send(packet_type, para, expected_response, onResponse)
	dispose(onDone)

    config: {
		name:			'string',		// name of connector (used to get handlers)
        onConnect:		'function',		// optional connection handler
		onDisconnect:	'function',		// optional disconnection handler
		eventHandler: 	'object'			// optional event handler (currently unused)
    }
*/

exports.icConnector = function (config) {
	
	// check required parameters
	if (config === undefined)
		config = {};
	if (typeof config.onConnect !== 'function' && typeof config.onDisconnect !== 'function')
		LOG.warn('no connection handlers specified in config, connect/disconnect event may not be notified', 'SR.Connector');
		
	//
	// local variables
	//
    
	// a node.js connection (socket) object 
	var l_socket = undefined;
	
	// a connection object encapsulating the socket (used for send messages)
	var l_conn = undefined;
    
	// use a provided, existing event handler set (if name is provided in config), or a new one
	var l_eventHandler = SR.Handler.get(config.name);

	// init connection handler 
	// external app to call when establishing new connection	
	var l_connHandler = new SR.Conn.ConnHandler(config);    

	// socket handler (handling new socket connections)
	var l_socketHandler = new SR.Socket(l_connHandler, l_eventHandler);    
           
	//
	// public functions
	//
	
	// store a handler for incoming events
	// handlers should provide the following properties:
	//    'handlers'
	//    'checkers'
	//
	// or these methods:
	//    'getFormatCheckers'
	//    'getMessageHandlers'
	// return # of handlers added
	var l_addHandler = this.addHandler = function (handlers) {
                             
		// perform loading of checkers & handlers
		var num = l_eventHandler.load(handlers);
		LOG.sys('adding ' + num + ' handlers', 'SR.Connector.addHandler');
		return num;
	};

	// start processing
	// 	onDone: {
	// 		err: 		'object',		// error object
	//		endpoint:	'string'		// string of the IP/port of the host
	//  }
	this.connect = function (ip_port, onDone) {

		// shutdown first if already exists
		if (l_socket !== undefined) {
			try {
				l_socket.end();
			} catch (e) {
				LOG.error('l_socket.end() exception-' + e, 'SR.Connector');
			}
		}

		try {
			LOG.warn('init a connection to: ' + ip_port.IP + ':' + ip_port.port + '...', 'SR.Connector');
            
			l_socket = SR.net.createConnection(ip_port.port, ip_port.IP, function () {
				
				// this callback is called when 'connection' event is fired   
				l_socket.connected = true;
                
				// store remote address & port
				// NOTE: because l_socket.remoteAddress doesn't exist
				l_socket.host = ip_port.IP;
				l_socket.port = ip_port.port;

				// setup socket's various properties & handling methods
				// NOTE: after setup the socket will receive a connID
				l_socketHandler.setup(l_socket);
				
				// record connection object for later use
				// TODO: can we simply record & use l_conn instead of l_socket? 
				l_conn = SR.Conn.getConnObject(l_socket.connID);

		        LOG.sys('outgoing connection: ' + l_socket.host + ':' + l_socket.port, 'SR.Connector');  
				UTIL.safeCall(onDone, undefined, l_socket);
			});
			
			l_socket.on('error', function (e) {
				LOG.error('socket connection error: ', 'SR.Connector');
				LOG.error(e);
				UTIL.safeCall(onDone, e);
			});
		} catch (e) {
			LOG.error('connector exception-' + e, 'SR.Connector');
			l_disconnect(onDone, e);
		}
	};

	//-----------------------------------------
	// shutdown all connected sockets (clients)
	// NOTE: this can also be called from outside via 'dispose' method
	var l_disconnect = this.disconnect = function (onDone) {

		// shutdown connector, if exist
		if (l_socket === undefined) 
			return UTIL.safeCall(onDone);
				
		try {
			l_socket.on('close', function (err) {
				if (err)
					LOG.warn('connection to [' + l_socket.host + ':' + l_socket.port + '] was closed with error');
				// call callback when connection is fully closed     
			});
            
			l_socket.end();
			l_socket = undefined;
		} catch (e) {
			LOG.error('l_socket.end() exception-'+e, 'SR.Connector');
			l_socket = undefined;
		}			
		UTIL.safeCall(onDone);        
	}; 

	// check whether connector has successfully connected to remote server
	this.isConnectorReady = function () {
		return (l_socket !== undefined && l_socket.connected);
	};

	//
	// Connector methods
	//
 
	// send something to remote host
	this.send = function (packet_type, para, expected_response, onResponse) {
        
		// see if we need to register responder
		// TODO: hide _cid attachment to EventManager
		var cid = l_eventHandler.addResponder(expected_response, onResponse);
            
		// send out message 
		if (l_conn)
        	SR.EventManager.send(packet_type, para, [l_conn], cid);
		else
			LOG.error('no outgoing connection established, cannot send', 'SR.Connector');
	};
	
	// end this connector
	this.dispose = function (onDone) {
		LOG.warn('dispose called...', 'SR.Connector');
		l_disconnect(onDone);
	};

}; // end icConnector

