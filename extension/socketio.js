/*
    Interface with socket.io clients

    history:
        2013-03-31		init
		2014-07-07 		upgrade socket.io version 0.9.16 -> 1.0.6

	ref:
		http://stackoverflow.com/questions/2701373/websockets-authentication (obsolete)
		http://stackoverflow.com/questions/4754232/can-i-access-a-cookie-from-socket-io

	NOTE:
	known issues:
	
	double-connect
	https://github.com/Automattic/socket.io/issues/430
	https://github.com/Automattic/socket.io/issues/474#issuecomment-2833227
	> solution seems to be to define on('message') outside of on('connect') on client-side code



    NOTE:
        this extension relies on the socket.io module
	   
        to install:
            npm install socket.io
*/

// open a server at this port
var io = undefined;

// connection handler to notify socket connect/disconnect
var l_connHandler = undefined;

var l_createEventHandler = function (conn) {
	
	return function (data) {
		
		// build an event and checkin
        //var event = SR.EventManager.unpackSocketIO(data.name, data.data, conn);
		var event = SR.EventManager.unpack(data, conn, conn.cookie);
        SR.EventManager.checkin(event);
	}
}

// start server
exports.start = function (server_or_port, onDone, options) {

	// record connection handler
	//l_connHandler = conn_handler;
	
	var ss = SR.Call('socketserver.get');
	l_connHandler = ss.getConnectionHandler();	
	
	// create listen server
	io = require('socket.io').listen(server_or_port, options);
	
	//var server = io
		
	// depreciated since 1.0.x
	//io.set('match origin protocol', 'enable');
	//io.enable('match origin protocol');
	
	// enable long-polling
	//io.set('transports', ['jsonp-polling']);
	//io.set('transports', ['xhr-polling']);
	
	// ref: http://stackoverflow.com/questions/14333942/node-js-and-socket-io-transport-type-configuration-for-websocket
	/*
	io.set('transports',[
   		'xhr-polling',
		'jsonp-polling',
		'websocket', 'flashsocket', 'htmlfile'
	]);
	*/
	io.set('transports', ['polling', 'websocket']);
	
                      //'flashsocket', 
                      //'htmlfile', 
                      //'xhr-polling', 
                      //'jsonp-polling', 
                      //'polling'

	//var err_level = LOG.getLevel();
	//LOG.warn('set error level to: ' + err_level, 'SR.SocketIO');
	//io.set('log level', 2);
		
	//var handlers = SR.Handler.get().getHandlers();
	
	// set auth method & get cookie
	io.set('authorization', function (handshakeData, accept) {

		/*
		if (handshakeData.headers.cookie) {
		
			handshakeData.cookie = cookie.parse(handshakeData.headers.cookie);
			handshakeData.sessionID = connect.utils.parseSignedCookie(handshakeData.cookie['express.sid'], 'secret');

			if (handshakeData.cookie['express.sid'] == handshakeData.sessionID) {
				return accept('Cookie is invalid.', false);
			}
		}
		else {
			return accept('No cookie transmitted.', false);
		} 
		*/
		
		//LOG.warn('auth data, handshake:');
		//LOG.warn(handshakeData.headers);
						 
		accept(null, true);
	});


	// TODO: need to setup handler for *every* connection? simplify it
	io.on('connection', function (socket) {

		//LOG.warn('handshake');
		//LOG.warn(socket.handshake);
		// assume cookie exists at socket.handshake.headers.cookie
		var cookie = SR.REST.getCookie(socket.handshake.headers.cookie);
		
		LOG.sys('user connected, cookie: ', 'SR.SocketIO');
		LOG.sys(cookie);
						  		
		//LOG.warn('transport');
		//LOG.warn(socket.conn.transport);
		
		var queue = [];
		
		// check if message queue has something to send
		var checkQueue = function () {
			if (queue.length > 0) {
				if (queue.length % 500 === 0)
					LOG.warn('socketio queue: ' + queue.length);
				
				var item = queue.shift();
				socket.busy = true;
				socket.emit('SRR', item);
			}
		}
		
		// send next message when this socket is empty (drained)
		// to avoid over-send and over-buffering
		// see: socket events for engine.io's document
		// https://github.com/automattic/engine.io
		// NOTE: socket.conn refers to an engine.io socket object
		socket.conn.on('drain', function () {
			socket.busy = false;
			checkQueue();
		});
		
		// notify connection handler of the connection
		// and build connection object
		var conn = undefined;
		
		if (l_connHandler) {
			// add host/port info to connection object
			// ref: http://stackoverflow.com/questions/6458083/socket-io-get-clients-ip-address
			// NOTE: approach may change with different socket.io releases
			// for 0.9.16
			//var address = socket.handshake.address;
			//var from = (address ? {host: address.address, port: address.port} : {host: '0.0.0.0', port: 0});
			
			var from = {host: socket.request.connection.remoteAddress, 
						port: socket.request.connection.remotePort,
						cookie: cookie};
			
			conn = l_connHandler.addConnection(
					function (res_obj) {
						
						if (!res_obj)
							return false;
						
						/*
						//LOG.warn('emitting');
						// TODO: it's possible the message is queued in buffer and not sent out when too many 						
						queue.push(res_obj);
						if (socket.busy !== true)
							checkQueue();
						*/
						
						socket.emit('SRR', res_obj);
						return true;
						
					}, 'sockio', from);
			
			// TODO: remove this (find a better way)
			socket.connID = conn.connID;
		}

		LOG.sys('recording new socket.io connection: ' + socket.connID, 'SR.SocketIO');

		if (conn) {
			
			// add cookie (hack? better approach?)
			//conn.cookie = cookie;
		
			// NOTE: we assume event name sent by client is always 'SR'
			// but packet receive is of format: {name: 'string', data: 'object'}
			socket.on('SR', l_createEventHandler(conn));
		}

        // when messages are received (used?)
        socket.on('message', function (data) {
           
            LOG.error('unknown event received: ', 'SR.SocketIO');
			LOG.error(data, 'SR.SocketIO');
		});

        // when the remote client disconnects
        socket.on('disconnect', function () {
            //io.sockets.emit('user disconnected');
            LOG.warn('user disconnected', 'SR.SocketIO');

			// remove connection object
			if (l_connHandler && conn)
				//l_connHandler.removeConnection(socket);
				l_connHandler.removeConnection(conn);
        });

		// when error occurs (used at all?)
		socket.on('error', function (code) {
			LOG.warn('error code: ', 'SR.SocketIO');
		});

		/* trigger example
		// set up event triggers
	    socket.on('some_event', function (data) {
			socket.emit('news', { hello: 'world' });

		    console.log(data);
        });
		*/
	});

	LOG.warn('socket.io server started');

	UTIL.safeCall(onDone);
}

exports.stop = function () {

	// destroy io object
    if (io !== undefined)
        io = undefined;
}
