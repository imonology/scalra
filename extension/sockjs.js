/*
    Interface with SockJS clients

    history:
		2014-09-15:	initialize
 
    NOTE:
        this extension relies on the sockjs module
	   
        to install:
            npm install sockjs
*/

var sockjs = require('sockjs');

// connection handler to notify socket connect/disconnect
var l_connHandler = undefined;

var l_convert = function (str) {
	var obj = {};
	str = str.split('; ');
	for (var i = 0; i < str.length; i++) {
    	var tmp = str[i].split('=');
    	obj[tmp[0]] = tmp[1];
	}
	return obj;
}

// start server
exports.start = function (http_server, onDone) {
	
	l_connHandler = SR.Settings.FRONTIER.getConnectionHandler();

	// create sockjs server
	// NOTE: it's a local variable that will be passed to outside
	var server = sockjs.createServer();
	
	// on new connection event
	server.on('connection', function (sock_conn) {
		
		// NOTE: cookie is not exposed with SockJS
		//var cookie = SR.REST.getCookie(conn);
		// see: https://www.npmjs.org/package/sockjs under "Various issues and design considerations" / Authorisation
		// see: https://github.com/sockjs/sockjs-node/pull/29#issuecomment-2733120
		var cookie = undefined;
		var conn_obj = undefined;

		if (l_connHandler) {

			// on receive new data from client event
			sock_conn.on('data', function (message) {
				//console.log(message);
				//broadcast(JSON.parse(message));
				
				// for first time we assume message is cookie
				if (!cookie) {

					cookie = SR.REST.getCookie(message);
					LOG.warn('cookie received: ', 'SR.SockJS');
					LOG.warn(cookie, 'SR.SockJS');
					
					var from = {host: sock_conn.remoteAddress, 
								port: sock_conn.remotePort,
								cookie: cookie};
					
					// create connection object for Scalra
					conn_obj = l_connHandler.addConnection(
						function (res_obj) {
								
							if (!res_obj)
								return false;
								
							sock_conn.write(JSON.stringify(res_obj));
							return true;
            
						}, 'sockjs', from);
            
					// necessary?
					sock_conn.connID = conn_obj.connID;
					
					LOG.sys('recording new sockjs connection: ' + conn_obj.connID, 'SR.SockJS');				
				}
				else {
				
					var obj = JSON.parse(message);
					var event = SR.EventManager.unpack(obj, conn_obj, conn_obj.cookie);
					SR.EventManager.checkin(event);
				}
			});

			// on connection close event
			sock_conn.on('close', function() {

            	LOG.warn('user disconnected', 'SR.SockJS');

				// remove connection object
				if (conn_obj)
					l_connHandler.removeConnection(conn_obj);
			});
		}
		
		// when error occurs (used at all?)
		sock_conn.on('error', function (code) {
			LOG.error('error code: ', 'SR.SockJS');
			LOG.error(code);
		});
	});

	// assocate sockJS server with HTTP server
	http_server.addListener('upgrade', function (req, res){
    	res.end();
	});

	// Integrate SockJS and listen on /echo
	server.installHandlers(http_server, {prefix: '/sockjs'});
	
	//LOG.warn('SockJS server started');
	UTIL.safeCall(onDone, server);
}

exports.stop = function (type) {

	// TODO: anything to shutdown?

	//LOG.warn('SockJS server stopped');
	
	/*
	// destroy io object
    if (io !== undefined)
        io = undefined;
	*/
}
