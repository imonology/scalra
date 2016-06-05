//
//  stream.js
//
//  a stream object that allows incoming & outgoing streams to be handled simutaneously 
//
//  history:
//  2013-10-08  adapted from source sample 'stream-server.js' at jsmpeg
//              see: https://github.com/phoboslab/jsmpeg
//              src: https://raw.github.com/phoboslab/jsmpeg/master/stream-server.js
    
/*
public methods:
    
    StreamServer(config)
    
    
*/


//
// local reference
//

/*
    config: {
        secret: 'string',
        IN_PORT: 'number',
        OUT_PORT: 'number',
		type: 'string'
    }
	
	type: 'ws'       (websocket server)
	      'socketio' (socket.io server)
*/

var StreamServer = function (config) {

    // check parameters
    if ((typeof config.IN_PORT !== 'number' && 
        typeof config.OUT_PORT !== 'number')) {
    
        LOG.warn('config needs to define parameters: IN_PORT or OUT_PORT');
        return; 
    }
	
	var server_type = config.type || 'MPEG';

    var STREAM_SECRET = config.secret;
		IN_PORT = config.IN_PORT || 8082,
		OUT_PORT = config.OUT_PORT || 8084,
		STREAM_MAGSR_BYTES = 'jsmp'; // Must be 4 bytes
		
	// channel info
	var l_channels = {};
        
    var socketServer = undefined;
    var streamServer = undefined;

    this.start = function () {
    
        // Websocket Server
        socketServer = new (require('ws').Server)({port: OUT_PORT});
		
		// process incoming connection of subscribers
        socketServer.on('connection', function (socket) {

			// generate unique clientID
			var clientID = UTIL.createUUID();
			var clientData = socketServer.clients[socketServer.clients.length - 1];
			
			var channel = undefined;
			LOG.sys( 'New WebSocket Connection (' + socketServer.clients.length + ' total) id: ' + clientID );
					 
			// we start to handle after receiving channel name to subscribe
			// NOTE: the incoming content is not string type
			socket.on('message', function (name) {

                try {
 
                    /*
					var obj = JSON.parse(name.data);
					LOG.warn(obj);
					*/
                    
					// extract info
					if (l_channels.hasOwnProperty(name) === false) {
						var msg = 'no stream registered for channel [' + name + ']';
						LOG.warn(msg);
						socket.send(msg);
						return;
					}
					
					// record channel name
					channel = name;
					
					// get parameters
					var params = l_channels[channel].para;
		        
					// NOTE: we convert string to numbers with | 0			
					var width = (params[0] || 320) | 0;
					var height = (params[1] || 240) | 0;
					
					LOG.warn('params:');
					LOG.warn(params);
					LOG.warn('client to receive channel: ' + channel + ' w: ' + width + ' h: ' + height);
                
					// record this user's reference as part of the channel subscribers
					// NOTE: we record clientData, not socket
					l_channels[channel].users[clientID] = clientData;   
					
					LOG.warn('channel [' + channel + '] has ' + Object.keys(l_channels[channel].users).length + ' users', 'message');
					
					// Send back magic bytes and video size to the newly connected socket
					// struct { char magic[4]; unsigned short width, height;}
					var streamHeader = new Buffer(8);
					streamHeader.write(STREAM_MAGSR_BYTES);
					streamHeader.writeUInt16BE(width, 4);
					streamHeader.writeUInt16BE(height, 6);
					socket.send(streamHeader, {binary:true}); 
                
                }
                catch(e) {
                    LOG.error(e);
                }    
			});
			
			// handles closing in-coming connection
			socket.on('close', function (code, message) {
				LOG.sys( 'Disconnected WebSocket (' + socketServer.clients.length + ' total)' );
				
				// remove user record (i.e., socket) from channel
				if (l_channels.hasOwnProperty(channel)) {		
					delete l_channels[channel].users[clientID];
					LOG.warn('client [' + clientID + '] unsubscribe from channel [' + channel + ']');
				}
			});
        });
    
        socketServer.broadcast = function (channel, data, opts) {
		
			// go over all clients for a given channel
			if (l_channels.hasOwnProperty(channel) === false) {
				LOG.warn('channel [' + channel + '] not registered, cannot broadcast');
				return;
			}
			//LOG.warn('channel [' + channel + '] has ' + Object.keys(l_channels[channel].users).length + ' users', 'broadcast');
			
			var clients = l_channels[channel].users;
			
			for (var id in clients) {
				
				try {
					//this.clients[i].send(data, opts);
					clients[id].send(data, opts);
				}
				catch(e) {
					LOG.warn('client[' + id + '] fails to send to channel [' + channel + ']');
				}
			}
        };
    
        // HTTP Server to accept incoming MPEG Stream
        streamServer = require('http').createServer(function (request, response) {
			var params = request.url.substr(1).split('/');			
			var channel = params[0];
        
			if (channel) {
				LOG.sys(
					'Stream Connected: ' + request.socket.remoteAddress + 
					':' + request.socket.remotePort + ' channel: ' + channel
				);
				
				//' size: ' + width + 'x' + height
				
				
				// remove first element (channel name) and store the rest as parameters
				params.splice(0, 1);
				l_channels[channel] = {
					para: params,		// app-specific parameters in string array format
					users: {}			// user clients conneted awating message updates
				}
				
				request.on('data', function(data) {
					if (socketServer)
						socketServer.broadcast(channel, data, {binary:true});
				});
			}
			else {
				LOG.sys(
					'failed connection: '+ request.socket.remoteAddress + 
					request.socket.remotePort + ' - no channel specified.'
				);
				response.end();
			}
        }).listen(IN_PORT);
    
        LOG.warn('Listening for stream on http://'+ SR.Settings.SERVER_INFO.IP +':'+IN_PORT+'/<channel>/<para1>/<para2>/<para3>/...', 'SR.Stream');
        LOG.warn('Awaiting WebSocket connections on ws://' + SR.Settings.SERVER_INFO.IP + ':'+OUT_PORT+'/', 'SR.Stream');
    }
    
    this.stop = function () {

        if (socketServer) {
            socketServer.close();
        }
        
        if (streamServer) {
            streamServer.close();
        }
    }
    
} // end StreamServer

// export socket object to outside
exports.icStream = StreamServer;


//var l_logChannels = {};

// create a new message queue
var l_msgqueue = new SR.MsgQueue(); 

// record a registered user of execution output

exports.subscribe = function (channel, conn, last) {
	
	var count = SR.Comm.count(channel);
	return (SR.Comm.subscribe(conn.connID, channel, conn) !== count);
	
	/*
    // if we want the last X messages
    if (typeof info.last === 'number' && info.last > 0) {
        // get message from queue
        var msg_list = l_msgqueue.get(msgqueue_para, event.data.channel);
    	event.done('SR_MSGLIST', {channel: event.data.channel, msgs: msg_list});	
	}
	*/	
	
	
/*	
	// NOTE: replace with pub/sub?
	if (l_logChannels.hasOwnProperty(channel) === false)
		l_logChannels[channel] = {};
	
	// check for redundency
	if (l_logChannels[channel].hasOwnProperty(conn.connID) === false) {
		l_logChannels[channel][conn.connID] = conn;
		
		LOG.warn('conn ' + conn.connID + ' subscribe channel [' + channel + ']');
		return true;
	}
	else {
		LOG.warn('connection object already subcribed for channel [' + channel + ']');
		return false;
	}
*/
	
}

exports.unsubscribe = function (channel, conn) {
	return SR.Comm.unsubscribe(conn.connID, channel); 
}

exports.publish = function (channel, msg) {

	LOG.sys('publish to channel [' + channel + ']:', 'SR.Stream');
	LOG.sys(msg);
	
    // store to queue
    l_msgqueue.add(msg, channel);
	
    return SR.Comm.publish(channel, msg, 'LOG');	
    
	/*
	if (l_logChannels.hasOwnProperty(channel) === false)
		return false;
	
	var connections = l_logChannels[channel];
	var list = [];
	
	// convert map to array
	for (var connID in connections) {
		list.push(connections[connID]); 
	}
	
	SR.EventManager.send('LOG', msg, list);
	return true;
	*/
}


