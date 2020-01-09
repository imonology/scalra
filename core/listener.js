//
//  listener.js
//
//  a listen server based on socket connection, will handle incoming events via custom event handlers
//  and connect/disconnect events via a connection module
//
//  history:
//  2013-09-13  extracted from frontier.js
  
/*
public methods:
    
    init(onDone)
    dispose(onDone)
    isReady()
    getConnectionHandler()
    

handler:
{
    checkers:   'object',       // a map based on {}
    handlers:   'object'        // a map based on {}
}

conn_module:
{
    onConnect: 'function',
    onDisconnect: 'function'
}

config:
{
	name:		 'string',		// listener name (a label to identify handler set)
    port:        'number',		// which port to listen
    conn_module: 'object',		// how to handle connect/disconnect
}
*/

// main listener object
exports.icListener = function (config) {
			    
	// check required parameters
	if (config.port === undefined)
		return LOG.error('required parameter missing in config: port', 'SR.Listener');
    
	//
	// local variables
	//
    
	// init connection handler 
	// external app to call when establishing new connection
	// NOTE: we provide a default connection module so that frontier 
	// can still have a connection handler to use	
	var l_connHandler = new SR.Conn.ConnHandler(config.conn_module);

	// add handling of connect/disconnect events
	l_connHandler.addConnHandler({
		onConnect: function (conn) {
			SR.Callback.notify('onConnect', conn);	
		},
		
		onDisconnect: function (conn) {
			SR.Callback.notify('onDisconnect', conn);
		}
	});
	
	// event handler
	var l_eventHandler = SR.Handler.get(config.name);
    
	// socket handler (handling new socket connections)
	var l_socketHandler = new SR.Socket(l_connHandler, l_eventHandler);
        
	// if true, shutting down will refuse any connections
	var l_shutting_down = false; 
  
	// a server object  
	var l_server = undefined;
    
	// IP & port of this server
	var l_IPport = {};

	//
	// public functions
	//

	// get connection handler
	this.getConnectionHandler = function () {
		return l_connHandler;
	};
    	
	// store a handler for incoming events
	// handlers should provide the following properties:
	//    'handlers'
	//    'checkers'
	//
	// or these methods:
	//    'getFormatCheckers'
	//    'getMessageHandlers'
	// return # of handlers added
	/*
    
        obj: {
            handlers: 'object',             // a map {} storing handlers
            checkers: 'object',             // a map {} storing format checkers
            getFormatCheckers: 'function',  // obtain format checkers
            getMessageHandlers: 'function'  // obtain message handlers
        }
    
        info: {
            obj:  'object',     // a handler object
            name: 'string',     // global name for the handler
            file: 'string'      // file name for the handler
        }
    
    */

	// start processing
	// if 'load_console' is false, then do not load console handler
	this.init = function (onDone) {

		// shutdown first if already exists
		if (l_server) {
			try {
				l_server.close();
				l_server = undefined;
			} catch (e) {
				LOG.error('l_server.close() exception-' + e, 'SR.Listener');
			}
		}
    
		// convert port if not number
		if (typeof config.port === 'string')
			config.port = parseInt(config.port);
            
		LOG.debug('init socket server at port: ' + config.port, 'SR.Listener');
        
		try {
			
			// pass in callback to handle new incoming socket connections

			// start from here step 2
			l_server = SR.net.createServer(l_socketHandler.setup);
    
			// get local IP
			UTIL.getLocalIP(function (local_IP) {
            
				LOG.sys('local IP: ' + local_IP + ' listening at: ' + config.port, 'SR.Listener');
            
				l_IPport.IP   = local_IP;
				l_IPport.port = config.port;
                
				l_server.listen(l_IPport.port, function () {
					
					// store server IP	
					LOG.sys('server ready @' + l_IPport.IP + ':' + l_IPport.port, 'SR.Listener');
					l_server.is_ready = true;
													
					// call done callback if provided 
					UTIL.safeCall(onDone, true);
				});
				
				l_server.on('error', function (e) {
					LOG.error('server [' + l_IPport.IP + ':' + l_IPport.port + '] start exception:', 'SR.Listener');
					LOG.error('project [' + SR.Settings.SERVER_INFO.owner + '-' + SR.Settings.SERVER_INFO.project + '-' + SR.Settings.SERVER_INFO.name + ']', 'SR.Listener');
					LOG.error('unable to bind, check if port [' + l_IPport.port + '] is occupied', 'SR.Listener');
					LOG.error(e, 'SR.Listener');	
					//l_dispose();
					
					UTIL.safeCall(onDone, false);
			        //throw new Error('unable to bind, check if port [' + l_IPport.port + '] is occupied');						
				});
			});
		} catch (e) {
			LOG.error('create server exception-'+e, 'SR.Listener');
			//l_dispose();
			UTIL.safeCall(onDone, false);
		}
	};

	//-----------------------------------------
	// shutdown all connected sockets (clients)
	// NOTE: this can also be called from outside via 'dispose' method
	var l_dispose = this.dispose = function (onDone) {
		LOG.warn('disposing and shutting down...', 'SR.Listener');

		// if we're already shutting down (e.g., Ctrl-C is pressed again)
		// then perform force shutdown        
		if (l_shutting_down === true) {
			LOG.warn('already shutting down, force close-down', 'SR.Listener');
                            
			process.exit();
			return;
		}

		// NOTE: shutting down flag should be set as late as possible
		// as some shutdown steps may require receiving messages from remote hosts
		// setting this flag will cause server to stop responding to incoming messages 
		l_shutting_down = true;

		// disconnect all clients
		l_connHandler.removeAll(function () {
        
			// shutdown server, if exist
			if (l_server) {
				try {
					l_server.close();
					l_server = undefined;
				} catch (e) {
					LOG.error('l_server.close() exception-' + e, 'SR.Listener');
					LOG.stack();
				}
			}
        
			// don't use LOG as log manager is already closed
			console.log('server [' + l_IPport.IP + ':' + l_IPport.port + '] stopped...');
        
			// call done callback if provided
			// NOTE: only exit process if this is NOT an internal server
			// (that is, a server created within the process of another server)
			if (onDone)
				UTIL.safeCall(onDone);
			else
				process.exit();
		});
        
	}; 

	// check whether server is successfully created
	this.isReady = function () {
		return (l_server && l_server.is_ready === true);
	};

	// 
	// local functions
	// 
	
}; // end icListener
