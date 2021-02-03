/* cSpell:disable */
/* global SR, LOG, UTIL */
//
//  socket.js
//
// a socket module that handles setting up a new socket connection
//
//  history:
//  2013-09-13  extracted from frontier.js

/*
public methods:

    SocketHandler(connHandler, eventHandler)

    // setup a new socket whether (in/out)
    setup (socket)

    // handle incoming messages
    process (socket, data)

*/

//
// local reference
//

var l_name = 'SR.Socket';

// setup a usable socket
// TODO: current implemention is too complicated --> simplify it
// TODO: is passing eventHandler necessary? (right now it's used by connector / listener separately)
var SocketHandler = function (connHandler, eventHandler) {
	// connection handler (handles 'addConnection' and 'removeConnection' actions
	if (
		!connHandler
		|| typeof connHandler.addConnection !== 'function'
		|| typeof connHandler.removeConnection !== 'function'
	) {
		LOG.error(
			'connHandler not specified or missing addConnection/removeConnection functions',
			l_name
		);
	} else {
		this.connHandler = connHandler;
	}

	// event handler (dispatch incoming message to the correct event handler
	if (!eventHandler || typeof eventHandler.dispatcher !== 'function') {
		LOG.error(
			'eventHandler not specified or missing dispatcher',
			l_name
		);
	} else {
		this.eventHandler = eventHandler;
	}

	// to allow methods be accessed within functions
	var that = this;

	//-----------------------------------------
	// parameters:
	// socket: 'object'     a socket retunred by node.js
	// data:   'string'     data received for this transmission
	// process incoming data
	this.process = function (socket, data) {
		// if no data to be delivered or socket
		if (
			socket === undefined
			|| data === undefined
			|| typeof data.length !== 'number'
		) {
			return;
		}

		var parsed = undefined;
		var buf = socket.recv_buf + data;

		// try to parse first, if failed then buffer it
		try {
			parsed = JSON.parse(buf);
		} catch (e) {
			LOG.sys(
				socket.host
					+ ':'
					+ socket.port
					+ ' JSON.parse() error, save it to buffer...'
					+ e,
				l_name
			);
			socket.recv_buf += data;
			parsed = undefined;
		}

		// we have something valid to process
		if (parsed) {
			var conn = SR.Conn.getConnObject(socket.connID);

			// NOTE: object instead of event/update name is passed
			var event = SR.EventManager.unpack(
				parsed,
				conn,
				conn.connID
			);
			SR.EventManager.checkin(
				event,
				this.eventHandler.dispatcher
			);

			// clear buffer after successful parse
			socket.recv_buf = '';
		}
	};

	// setup a usable socket (can be either a server-received incoming connection, or a outgoing client connection)
	this.setup = function (socket) {
		// start from here step 3
		// NOTE: this part is called when connection is made
		LOG.sys('setup new socket...', l_name);

		// whether this socket can be connected
		if (socket.connected === false) {
			return;
		}

		socket.setEncoding('UTF8');
		socket.setKeepAlive(true, 20 * 1000); // 20 seconds keepalive
		socket.setNoDelay(true);

		// indicates whether socket buffer is full (will set to 'true' when full)
		// if full, all sending events on this socket will pause until socket is not full
		socket.isFull = false;

		// buffer for partially received message
		socket.recv_buf = '';

		// store remote host info
		// NOTE: remoteAddress & remotePort may become invalid when socket closes,
		//       so need to keep record here...
		// NOTE: right now these info are kept mainly to display which remote host is closed/disconnected
		if (socket.hasOwnProperty('host') === false) {
			socket.host = socket.remoteAddress;
			socket.port = socket.remotePort;
		}

		/*
			var socket = conn.connector;

			try {
				// continue to next connection is send is success
				if (socket.send(data + '\n') === true) {
					continue;
				}
			}
			catch (e) {
				LOG.error('socket.send exception-' + e, l_name);

        		// print to show the message
        		LOG.error('data: ' + data, l_name);
			}
*/
		// record a new connection while attching connID to socket
		if (that.connHandler) {
			LOG.sys('notify for new socket connection...', l_name);

			// NOTE: use addConnection for *any* persistant connections (websocket/long-polling)?
			// TODO: need to check if addConnection can take function as parameter (instead of socket object)
			//that.connHandler.addConnection(socket, 'socket', {host: socket.host, port: socket.port});
			var conn = that.connHandler.addConnection(
				(res_obj, data) => {
					// do not process for empty objects
					if (
						!res_obj
						|| Object.keys(res_obj).length
							=== 0
					) {
						return false;
					}

					try {
						// continue to next connection is send is success
						if (
							socket.send(
								data + '\n'
							) === true
						) {
							return true;
						} else {
							return false;
						}
					} catch (e) {
						LOG.error(
							'socket.send exception-'
								+ e,
							l_name
						);

						// print to show the message
						LOG.error(
							'data: ' + data,
							l_name
						);
						return false;
					}
				},
				'socket',
				{ host: socket.host, port: socket.port }
			);

			// record connection info (add a 'connID' property to socket)
			socket.connID = conn.connID;
		}

		// set the socket as ready to send
		socket.connected = true;

		// when socket becomes empty again, continue sending
		socket.on('drain', () => {
			socket.isFull = false;
			socket.resume();
		});

		// NOTE: 'data' event might come BEFORE 'connect' event is triggerred
		socket.on('data', (data) => {
			that.process(socket, data);
		});

		socket.on('end', () => {
			LOG.sys(
				'connection end for: '
					+ socket.host
					+ ':'
					+ socket.port,
				l_name
			);
		});

		// handle connection error or close
		var disconnect_handler = function (err) {
			// print error
			if (err) {
				LOG.error('socket returns error: ', l_name);
				LOG.error(err, l_name);
			}

			// prevent doing close connection more than once
			if (
				socket.hasOwnProperty('connected') === false
				|| socket.connected === false
			) {
				return;
			}

			socket.connected = false;

			// NOTE: we allow disconnect to go through, to allow remote shutdown
			var hostinfo = socket.host + ':' + socket.port;

			LOG.sys('close connection for: ' + hostinfo, l_name);

			// notify callback for deletion
			if (that.connHandler) {
				that.connHandler.removeConnection(
					socket,
					() => {
						LOG.warn(
							'connection closed for '
								+ hostinfo,
							l_name
						);
					}
				);
			}
		};

		socket.on('close', disconnect_handler);
		socket.on('error', disconnect_handler);

		// attach error-catching socket write
		socket.send = that.send;

		return socket;
	};

	// error catching version of send socket message
	// NOTE: 'this' variable should access both a socket instance's variables and also the variables from the Socket.prototype
	// verify this?
	this.send = function (msg) {
		// NOTE: all original 'socket' variable have been changed to 'this'
		if (this.connected !== true) {
			return false;
		}

		LOG.sys('sending length: ' + msg.length, l_name);
		LOG.sys(msg, l_name);

		if (msg.startsWith('{"_cid"')) {
			LOG.stack();
			return false;
		}

		// send data to socket, append '\n' at end to indicate message end
		if (this.write(msg) === false) {
			// socket has slowed, lower the priority of this socket
			this.isFull = true;
			this.pause();

			LOG.warn(
				'socket buffer full. remote host: '
					+ this.host
					+ ':'
					+ this.port,
				l_name
			);
			return false;
		}

		return true;
	};
}; // end SocketHandler

// export socket object to outside
exports.icSocket = SocketHandler;
