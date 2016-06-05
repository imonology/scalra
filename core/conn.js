//
//
// conn.js
//
// Connection Management
//
// 2012-05-10  inital version 
//             (refactored code from aere_game_app, aere_lobby_user, aere_mjgame_user)
//
// Functions:
//		isConnected(connID)		// check if a connection still exists
//		getConnObject(connID)
//		getConnName(connID)
//		getConnections(conn || name)				// get all connections associated with a connection object or name
//		setConnName(connID, newName, oldName)
//		getConnCount()
//		createConnObject(type, conn_obj, from) 
//		destroyConnObject(connID)

// objects:
// 		ConnHandler(conn_module) 

//-----------------------------------------

// NOTE: conn_module must implement the following public methods:
//
//       'onConnect'           (a new connection is made)
//       'onDisconnect'		(an existing connection is disconnected)
// 

var l_timeoutWaitDispose = 1000;

//
// private methods
//

// data storing connection info, indexed by connID (uuid)
var l_conn = {};

// mapping from connection name to conn obj
var l_names = {};

var l_name = 'SR.Conn';

//
// public methods
//

// check if a connection still exists
exports.isConnected = function (connID) {
    return l_conn.hasOwnProperty(connID);
}

// get connection object
exports.getConnObject = function (connID) {
    if (l_conn.hasOwnProperty(connID))
        return l_conn[connID];
    else
        return undefined;
}

// get all connections with the same session_token
exports.getConnections = function (conn) {
	var list = [];
	var token = undefined;

	if (!conn) {
		LOG.warn('no connection object or name specified', l_name);
		return list;
	}
	
	// convert to conn object if connection name's provided
	if (typeof conn === 'string') {
		LOG.warn('name list size: ' + Object.keys(l_names).length, l_name);
		LOG.warn(l_names, l_name);
		if (l_names.hasOwnProperty(conn) === false) {
			LOG.warn('no connection object associated with name: ' + conn, l_name);
			return list;
		}
		
		token = l_names[conn];
	}
	else if (typeof conn === 'object' && typeof conn.session_token === 'string')
		token = conn.session_token;
		
	if (token) {
		// get a list of all connections with the same session token
		for (var connID in l_conn) {
			if (l_conn[connID].session_token === token)
				list.push(l_conn[connID]);
		}
	}
	LOG.sys('returning ' + list.length + ' connections from same session', l_name);
	
	return list;
}

// get a connection name from connection ID
exports.getConnName = function (connID) {
    
	var name = (l_conn.hasOwnProperty(connID) ? l_conn[connID].name : undefined);
    return name;
}

// set user account given a connection ID
exports.setConnName = function (connID, newName, oldName) {

    // first check if connection exists
    if (l_conn.hasOwnProperty(connID) === false)
        return false;
    	
    // if old account is provided, check if it matches with the one on record
    if (oldName && l_conn[connID].name !== oldName)
        return false;
	
	var conn = l_conn[connID];
	
    // change is successful
    conn.name = newName;
			
    return true;
}

// set user's session to a name so we may lookup all connections associated with a given session
// this is useful when the incoming request may not have a persistent connection (such as HTTP)
exports.setSessionName = function (conn, name) {

	if (!conn || typeof conn.session_token === 'undefined')
		return false;
	
	l_names[name] = conn.session_token;
	return true;
}

// get the name for current session
exports.getSessionName = function (conn) {

}

// get number of connections currently registered
exports.getConnCount = function () {
	return Object.keys(l_conn).length;
}

// definition for a connection object
function Connection (type, sender, from) {
	
	// provide default 'from' values
	from = from || {};
	
	// connection-specific UUID
	this.connID = UTIL.createUUID();
	
	// a project-specific / supplied name (can be account or app name)
	this.name = '';

	// sender function associated with this connection
	this.connector = sender;
	
	// store pointers on how to respond
	this.type = type;
	
	// where the connection comes from (default to nothing)
	this.host = from.host || '';
	this.port = from.port || 0;

	// time when this connection is established
	this.time =	new Date();
	
	// append cookie, if available (this is useful if the event will be relayed to another server to execute,
	// cookie can then be preserved
	if (from.cookie)
		this.cookie = from.cookie;
}

// for sockets only currently
// TODO: make it more general?
Connection.prototype.send = function (msg) {
	
	if (this.type === 'socket') {
		LOG.sys('socket send direct triggered...', l_name);
		this.connector.send(msg);
	}
}

Connection.prototype.close = function () {
	
	// TODO: should remove socket-specific tasks, or try to make it more general
	if (this.type === 'socket') {
		LOG.warn('socket close direct triggered...', l_name);
		this.connector.end();
	}
}

// get duration of the connection since its start
Connection.prototype.getDuration = function () {
	
	return (new Date).getTime() - this.time.getTime();
}

// create a connection object
var l_createConnObject = exports.createConnObject = function (type, sender_func, from) {

    // create info for the connection & create unique UUID
    var conn = new Connection (type, sender_func, from);
	
	// perform socket-specific functions ('socket' or 'sockio', 'sockjs')
	// TODO: find a better way to identify persistent connections
	if (type.startsWith('sock')) {

		// record the connection (so it can later be retrived based on connID, or be removed when disconnect)
		l_conn[conn.connID] = conn;
	}

	LOG.sys('[' + conn.type + '] connection created: ' + conn.connID + ' (' + conn.host + ':' + conn.port + ')', l_name);

	return conn;
}

// remove a connection object
var l_destroyConnObject = exports.destroyConnObject = function (connID) {
	
	if (l_conn.hasOwnProperty(connID)) {
	
		LOG.sys('connection destroyed: ' + connID + ' type: ' + l_conn[connID].type, l_name);
		delete l_conn[connID];
				
		// remove session data for this connection
		// NOTE: this is not symmetric (storing session should be here as well)
		if (SR.State.get(connID) !== undefined) {
			LOG.warn('removing session info for connID [' + connID + ']', l_name);
			SR.State.delete(connID);
		}	
		
		return true;
	}
	return false;
}

// dummy connection module
var l_conn_module = {
	onConnect: function () {
	},
	onDisconnect: function () {
	}	
};

exports.ConnHandler = function (conn_module) {

	// use one or the default dummy
	conn_module = conn_module || l_conn_module;
	
	// private record for all connections at this handler
	var connections = {};

	// add a new handler for connection/disconnection
	// TODO: simplify/remove this?
	this.addConnHandler = function (handler) {

		var old_module = conn_module;

		// replace with new one
		conn_module = {
							
			onConnect: function (conn) {
				UTIL.safeCall(handler.onConnect, conn);
			
				// call original
				old_module.onConnect(conn);
			},

			onDisconnect: function (conn, onDone) {
				UTIL.safeCall(handler.onDisconnect, conn);
				
				// call original
				old_module.onDisconnect(conn, onDone);
			}
		}
	}

    // handle new connection
    this.addConnection = function (send_func, type, from) {
        
		var conn = l_createConnObject(type, send_func, from);
        
		// record the connection info
		connections[conn.connID] = true;

        // notify project-specific app
		UTIL.safeCall(conn_module.onConnect, conn);
	
		return conn;
    };

	// 
    // handle when a disconnection occurs, does the following:
	// 1. checks if there are pending messages at the socket to be sent,
	// 2. call custom onDisconnect()
	// 3. destroy the connection object on record
	// 
    this.removeConnection = function (socket, onDone) {

        if (socket === undefined) {
            LOG.error('socket undefined', l_name);
            return UTIL.safeCall(onDone);
        }

		// close socket (may cause additional events be fired?)		
		if (typeof socket.end === 'function')
			socket.end();

        // if connection ID doesn't exist
        if (socket.hasOwnProperty('connID') === false) {
            LOG.error('connID not found for this socket', l_name);
            return UTIL.safeCall(onDone);
        }

        // wait for all event processing done on this socket
        SR.EventManager.waitSocketsEmpty(socket, 
            function () {
                    
				LOG.sys('no pending events on socket: ' + socket.connID, l_name);
                
                // if connection record doesn't exist
                if (l_conn.hasOwnProperty(socket.connID) === false) {
                    LOG.error('connID not found: ' + socket.connID, l_name);
                    return UTIL.safeCall(onDone);
                }

				LOG.sys('calling custom onDisconnect...', l_name);                
                
				// NOTE: we make a copy of the conn object parameters to pass to user-implemented onDisconnect
				// TODO: remove this?
				var conn = {};
				var original = l_conn[socket.connID];
				for (var key in original) {
					if (typeof original[key] !== 'function')
						conn[key] = original[key];
				}

				var callback = function () {
					LOG.warn('no need to call onDone callback in onDisconnect() now, please remove it', l_name);
				}

				// TODO: remove the usage of custom onDisconnect
                UTIL.safeCall(conn_module.onDisconnect, conn, callback);
								
                // delete conn info
				l_destroyConnObject(socket.connID);
				delete connections[socket.connID];

                UTIL.safeCall(onDone);
            }
        );
    };

    // close down all connections
    this.removeAll = function (onDone) {

		// NOTE: log may be closed b now
        // if nothing to delete
        if (Object.keys(connections).length === 0) {

            return UTIL.safeCall(onDone);
        }

		var pending_count = 0;
		// loop through each connection to disconnect
        for (var connID in connections) {
			LOG.sys('removing connID: ' + connID, l_name);
            if (l_conn[connID].type.startsWith('sock')) {
				pending_count++;
				this.removeConnection(l_conn[connID].connector, function () {
					pending_count--;
					if (pending_count === 0)
						UTIL.safeCall(onDone);
				})
			}
            // TODO: remove other types of connections?
        }		
    };
}
