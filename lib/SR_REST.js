
/*
    Scalra HTML client-binding
    
    Purpose: to send events and get back updates from Scalra servers using RESTful interface

*/


/**
 * SR (Scalra JavaScript binding)
 * Copyright(c) 2013-2016 Imonology Inc. <dev@scalra.com>
 */

var version = '0.2.5';
var revision = '2016-08-25';

/*	
	current SR methods:
	
	init					init SR library
	setRESTServer			
	setSocketServer
	sendEvent
	validateEmail
	getParameterByName
	getQueryString
	getGUID
	createID							// get a numerical random number between 0 and 10000
	
	publish
	subscribe
	unsubscribe
	
	history:
		2014-06-24	add queryServer() to ask entry servers of WebSocket proxies
		2015-06-24  modify queryServer() to seek multiple entries then connect to the one with lowest RTT
*/

var HEADER_PARA = 'P';
var HEADER_UPDATE = 'U';
var HEADER_EVENT = 'E';

// config
var PORT_ENTRY = 8080;
var PORT_HTTP_INC 	= 0;
var PORT_HTTPS_INC 	= 1;

// default entry server's IP & port
var DEFAULT_ENTRIES = ['src.scalra.com:8080', 'dev.scalra.com:8080']; 

// timeout value in milliseconds
var TIMEOUT_QUERY = 1000;

 // helper HTTP_GET
 // src: http://stackoverflow.com/questions/247483/http-get-request-in-javascript
/* sync version
function httpGet(theUrl) {
    var xmlHttp = null;

    xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", theUrl, false );
    xmlHttp.send( null );
    return xmlHttp.responseText;
}
*/

var onHttpResponse = function (xmlHttp, onDone) {

    return function () {
        
		if (xmlHttp.readyState == 4) {
			
			if (xmlHttp.status == 200) {
            
				if (xmlHttp.responseText == "Not found") {
                	SR.Error('not found');
                	if (typeof onDone === 'function')
                    	onDone(undefined);
            	}
				
				// NOTE: it's possible xmlHttp.responseText is empty
            	else if (xmlHttp.responseText) {
				
                	var info = eval ( "(" + xmlHttp.responseText + ")" );

	                // passback the jsonData
    	            if (typeof onDone === 'function')
        	            onDone(info);
            	}               
        	}
			// return error for other status
			else {
				SR.Error('xmlHttp request fail with status: ' + xmlHttp.status);
                if (typeof onDone === 'function')
                   	onDone(undefined);				
			}
		}			
    }
};

// ref: http://stackoverflow.com/questions/1255948/post-data-in-json-format-with-javascript
var httpPost = function (url, data, onDone) {

    SR.Log('url to post: ' + url);

    // construct an HTTP request
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("POST", url, true);
    xmlHttp.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    
    // set callback when response is returned
    xmlHttp.onloadend = onHttpResponse(xmlHttp, onDone);
	//console.log('data to send:');
	//console.log(data);
	
    // send the collected data as JSON
	// TODO: may be slow in Firefox?
	xmlHttp.send(Object.keys(data).length > 0 ? JSON.stringify(data) : undefined);
}

// async version
var httpGet = function (url, onDone) {

    SR.Log('url to get: ' + url);
    
    var xmlHttp = new XMLHttpRequest(); 
    
    // set callback when response is returned
	// returns 'undefined' if no response or request failed
    xmlHttp.onreadystatechange = onHttpResponse(xmlHttp, onDone);
    xmlHttp.open("GET", url, true);
    xmlHttp.send(null);
}

// helper to convert an object to a key-value pair string
// NOTE: cannot go one-level deep for the object, use the POST method for that
// src: http://stackoverflow.com/questions/6566456/how-to-serialize-a-object-into-a-list-of-parameters
var serialiseObject = function (obj) {
	
    var pairs = [];
    for (var prop in obj) {
        if (!obj.hasOwnProperty(prop)) {
            continue;
        }
        pairs.push(prop + '=' + obj[prop]);
    }
    return pairs.join('&');	
}

var SR = (typeof module === 'undefined' ? {} : module.exports);
 
(function (exports, global) {

    /**
     * SR namespace.
     *
     * @namespace
     */
  
    var SR = exports;
  
    /**
     * version
     *
     * @api public
     */
  
    SR.version = '0.2.4';
	
    /**
     * opertion mode
     *
     * @api public
     */
  
	/*
	// useful info under window.location includes:
	
	direct
		host: 		"src.scalra.com:37074"
		hostname: 	"src.scalra.com"
		href: 		"http://src.scalra.com:37074/web/demo-chat.html"
		pathname:	"/web/demo-chat.html"
		port:		"37074"
		protocol:	"http:"

	via Entry
		host		"src.scalra.com:8080"
		hostname	"src.scalra.com"
		href		"http://src.scalra.com...obby/web/demo-chat.html"
		origin		"http://src.scalra.com:8080"
		pathname	"/syhu/Scalra/lobby/web/demo-chat.html"
		port		"8080"
		protocol	"http:"
	*/
	
	//
	//  logging-related
	//
	SR.Log = function (msg) {
		
		// by default debug is off, need to be manually enabled
		if (SR.debug)
			console.log(msg);
	}
	
	SR.Warn = function (msg) {
		// always show warning now
		console.warn(msg);
	}
	
	SR.Error = function (msg) {
		console.error(msg);
	}
	
	// basic info	
	SR.host = {
		name: (typeof connectHost === 'string' ? connectHost : window.location.hostname),
		port: parseInt(window.location.port)
	};
	
	SR.clone = function(obj) {
		return JSON.parse(JSON.stringify(obj));
	};
	
	SR.mode = SR.host.name.split('.')[0];
	SR.Log('SR mode: ' + SR.mode + ' host:');
	SR.Log(SR.host);
		
    /**
     * Protocol implemented.
     *
     * @api public
     */
  
    SR.protocol = 1.1;
  
    /**
     * client ID
     * @api public
     */
  
    // ID for self
    SR.id = 0;

	// 
	// modules
	//	

	
    //
    // local variables
    //
	
    var serverDomain = undefined; 
	var socketDomain = undefined;
	
	// see if it's secured connection
	var secured = false;
	if (typeof securedConn !== 'undefined' && securedConn === true)
		secured = true;	
	else if (window.location.protocol === "https:")
		secured = true;

	// cached entry server list (to connect to)
	var entryServers = [];
	
	// list of default entries
	var defaultEntries = [];
	
	// currently selected entry server
	var currentEntry = undefined;

	// socket for websocket connection
	// to-check, if it's genertic enough for socket.io & sockjs (?)
	var socket = undefined;
	
	// list of response handlers
	var responseHandlers = {};
	
	// generic response callback for system-defined messages
	var onResponse = function (type, para) {

		// avoid flooding if SR_PUBLISH is sending streaming data
		SR.Log('[' + type + '] received');
		switch (type) {
			//
			// pubsub related
			//
			// when a new published message arrives 
			case 'SR_MSG':
			// handle server-published messages
			case 'SR_PUBLISH':
				if (onChannelMessages.hasOwnProperty(para.channel)) {
					if (typeof onChannelMessages[para.channel] !== 'function')
						SR.Error('channel [' + para.channel + '] handler is not a function');
					else
						onChannelMessages[para.channel](para.msg, para.channel);
				}
				else
					SR.Error('cannot find channel [' + para.channel + '] to publish'); 
				return true;
				
			// when a list of messages arrive (in array)
			case 'SR_MSGLIST':	
				var msg_list = para.msgs;			
				if (msg_list && msg_list.length > 0 && onChannelMessages.hasOwnProperty(para.channel)) {
					
					for (var i=0; i < msg_list.length; i++)
						onChannelMessages[para.channel](msg_list[i], para.channel);
				}				
				return true;
				
			// redirect to another webpage
			case 'SR_REDIRECT':
				window.location.href = para.url;
				return true;
			case "SR_NOTIFY" :
				SR.Warn('SR_NOTIFY para: ');
				SR.Warn(para);
				console.log(onChannelMessages);
				if (onChannelMessages.hasOwnProperty('notify'))
					onChannelMessages['notify'](para, 'notify');
				return true;
			//
			// login related
			//
			case "SR_LOGIN_RESPONSE":
			case "SR_LOGOUT_RESPONSE":
				replyLogin(para);
				return true;
			case "SR_MESSAGE":
				alert('SR_MESSAGE: ' + para.msg);
				return true;
			case "SR_WARNING":
				alert('SR_WARNING: ' + para.msg);
				return true;
			case "SR_ERROR":
				alert('SR_ERROR: ' + para.msg);
                return true;
				
			default:
				// check if custom handlers exist and can handle it
				if (responseHandlers.hasOwnProperty(type)) {
					
					var callbacks = responseHandlers[type];
					
					// extract rid if available 
					var rid = undefined;					
					if (para.hasOwnProperty('_rid') === true) {				
						rid = para['_rid'];
						delete para['_rid'];
					}
										
					if (rid) {
						callbacks[rid](para, type);	
						
						// remove callback once done
						if (rid !== 'keep') {
							delete callbacks[rid];
						}
					}
					// otherwise ALL registered callbacks will be called
					else {
						if (Object.keys(callbacks).length > 1)
							SR.Warn('[' + type + '] no rid in update, dispatching to first of ' +  Object.keys(callbacks).length + ' callbacks');
						
						// call the first in callbacks then remove it
						// so only one callback is called unless it's registered via the 'keep_callback' flag
						for (var key in callbacks) {
							callbacks[key](para, type);
							if (key !== 'keep') {
								delete callbacks[key];
								break;
							}
						}
					}

					return true;
				}
	
				// still un-handled
				console.error('onResponse: unrecongized type: ' + type);
				return false;
		}
	}
	
	var socketEvents = ['connecting', 
						'connect_timeout',
						'connect_failed',
						'connect_error',
						'error',
						//'disconnect',
						'reconnecting',
						'reconnect_failed',
						'reconnect_error',
						'reconnect'];

	// remove a given entry server
	var removeEntry = function (entry) {
		if (typeof entry === 'number' && entry < entryServers.length) {
			entryServers.splice(entry, 1);
			return true;
		}
		else if (typeof entry === 'string') {	
			for (var i=0; i < entryServers.length; i++) {
				if (entryServers[i] === entry) {
					entryServers.splice(i, 1);
					SR.Log('remove entry: ' + entry + '. entries left: ' + entryServers.length);						
					return true;	
				}
			}
		}
		return false;
	}
	
	// connect to a new websocket
	// server_type: 'socketio' 'sockjs'
	var connectSocket = function (server_type, socket_url, connHandler, onDone) {

		// handles when connection with server is established
		var onConnect = function () {
			
			if (typeof connHandler === 'function')
				connHandler('connect');
			
			SR.Log('websocket server connected: ' + socket_url);
			if (typeof onDone === 'function')
				onDone();
		}
		
		// disconnect event
		var onDisconnect = function (obj) {
			if (typeof connHandler === 'function')
				connHandler('disconnect');
			
			SR.Warn('disconnected... obj: ');
			SR.Warn(obj);
			
			// attempt to re-connect
			if (typeof conn_options === 'object') {
				removeEntry(currentEntry);
				currentEntry = undefined;
				SR.Warn('re-connecting websocket with options');
				SR.Warn(conn_options);
				SR.setSocketServer(conn_options);
			}
		}
		
		// configure priority of protocol used
		//io.configure(function () { 
			//io.set("transports", ["xhr-polling", "flashsocket", "json-polling"]); 
		//});
				
		// connect to server
		SR.Log('connecting to server: ' + socket_url);
            
		if (server_type === 'socketio') {
            
			socket = io.connect(
				socket_url
				/*
				{	
					'reconnection delay': 10000,
					'reconnection limit': 4,
     	 			'max reconnection attempts': 4
				}
				*/
			);
			
			var generateHandler = function (name) {
				return function () {
					if (typeof connHandler === 'function')
						connHandler(name);
				}
			}
			
			// Return socket connection status and response
			for (var i=0; i < socketEvents.length; i++) {
				var event_name = socketEvents[i];
				socket.on(event_name, generateHandler(event_name));
			}
			
            // connection success
            socket.on('connect', onConnect);
			socket.on('disconnect', onDisconnect);
			
			// move this outside of 'connect' event handling (to avoid duplicates)
			socket.on('SRR', function (data) {
				SR.Log('SRR received, type: ' + data[HEADER_UPDATE]);
				onResponse(data[HEADER_UPDATE], data[HEADER_PARA]);
			});
            
            // attach customized send function
            socket.sendJSON = function (obj) {
                socket.emit('SR', obj);
            }
		}
		else if (server_type === 'sockjs') {
			socket = {};
			var url = socket_url + '/sockjs';
			SR.Log('sockjs URL to connect: ' + url);

            // Create a connection to server
            var sock = new SockJS(url);
    
            // Open the connection
			sock.onopen = function () {
				socket.opened = true;
				// send cookie explicitly
				SR.Warn('sockjs sending cookie:');
				SR.Warn(document.cookie);
				sock.send(document.cookie);
				onConnect();
			}
			
            // On connection close
            sock.onclose = onDisconnect;

            // On receive message from server
            sock.onmessage = function (e) {
                // Get the content
                var obj = JSON.parse(e.data);
				onResponse(obj[HEADER_UPDATE], obj[HEADER_PARA]);
            }
            
            // attach customized send function
			
			socket.sendJSON = function (obj) {
								sock.send(JSON.stringify(obj));
            				};
		}
		else  {
			SR.Error('unrecongizable server_type: ' + server_type + ' please check if socket.io or sockjs is used');	
		}
	}
	
	// execute a callback, safely
	SR.safeCall = function (callback) {
		
		var return_value = undefined;
	
		// first check if callback is indeed a function
		if (typeof callback !== 'function')
			return return_value;
	
		// call the callback with exception catching
		try {
			var args = Array.prototype.slice.call(arguments);
			return_value = callback.apply(this, args.slice(1));
		}
		catch (e) {
			console.error(e);
		}
	
		return return_value;		
	}
	
	// get round trip time towards a given IP:port pair
	SR.getRTT = function (ip_port, onDone) {

		var url = 'http://' + ip_port + '/event/PING';
		
		// record current time as time to send out query
		var startTime = new Date();
		
		httpGet(url, function (res) {
			if (!res) {
				SR.Error('getRTT error: ');
				onDone(ip_port, -1);
				return;
			}
			
			var type = res[HEADER_UPDATE];
			var para = res[HEADER_PARA];			
						
			// check if response is correct
			if (type === 'PONG') {
				var difference = new Date() - startTime;
				onDone(ip_port, difference);
			}
		});
	}	
	
	// get a list of registered entry servers (from primary, default entry)
	// NOTE: primary entry may return itself in the list as well
	SR.queryEntry = function (onDone) {

		// entry returned
		var results = [];
		
		// build default entry list if not available
		if (defaultEntries.length === 0) {
			
			for (var i=0; i < DEFAULT_ENTRIES.length; i++)
				defaultEntries.push(DEFAULT_ENTRIES[i]);
			
			defaultEntries.push(SR.host.name + ':' + PORT_ENTRY);
		}
		
		var host = defaultEntries[0];
		
		// version 1: just get a list of entries
		var req = 'http://' + host + '/event/getEntries';
		SR.Log('query for entry list: ' + req);

        httpGet(req, function (resObj) {
        
            if (resObj) {
				// return directly (should be an object of form {IP: string, port: number})
				var type = resObj[HEADER_UPDATE];
				var list = resObj[HEADER_PARA];
			
				if (type === 'ENTRY_LIST')
					results = list; 
				else
					SR.Error('Incorrect response: ' + type + ', expecting ENTRY_LIST to be returned');
				
				onDone(results);
			}
			else {
				SR.Log('default entry: ' + host + ' cannot be reached, try next one...');
				defaultEntries.splice(0, 1);
				setTimeout(function () {
					SR.queryEntry(onDone);
				}, 100);
				return;
			}
        });
		
		/*
		// version 2: ping each entry server learned
		
		httpGet(req, function (res) {
			if (res === undefined) {
				SR.Log('queryEntry error');
				return SR.safeCall(onDone, results);
			}

			// processing once RTT estimate is available
			var onRTTResponse = function (ip_port, RTT) {
				
				// skip query that have no results
				if (RTT < 0)
					return;
				
				SR.Log('RTT: ' + ip_port + ' (' + RTT + ')');
				
				results[ip_port] = RTT;
				
				// check if we've timeout (and if so, we return the current results list)
				if (RTT > TIMEOUT_QUERY)
					onDone(results);
			}
			
			var type = res[HEADER_UPDATE];
			var para = res[HEADER_PARA];		
		
			SR.Log('entry list:');
			SR.Log(para);
    
			// ping each of the entry server & get estimated RTT
			for (var i in para) {
				SR.getRTT(para[i], onRTTResponse);
			}
		});
		*/
	}

	// get a socket connection point (IP+port) from a given entry server	
	var queryConnectionPoint = function (entry, conn_type, fullname, onDone) {

		// we query from the given entry server		
		fullname = fullname.replace(/-/g, '/');
		var req = 'http://' + entry + '/' + fullname + '/' + conn_type;
		SR.Log('queryConnectionPoint: ' + req);
        
		// will return undefined if failed or no response
		// otherwise should be an object of form {IP: string, port: number}
		httpGet(req, onDone);
	}
	
	// query for an IP / port to connect to lobby server
	// 'fullname' should be a string of 'owner/project/name'
	// conn_type can be HTTP / HTTPS / WS
	// should return {IP: string, port: number} in 'onDone'
	SR.queryServer = function (fullname, conn_type, onDone) {
	
		// 1: if there are cached entry server, seek the entry server with lowest RTT
		// 2: if not, then query for entry server list, repeat step 1
		if (entryServers.length === 0) {
			
			// query default entry for list of entries
			SR.queryEntry(function (list) {
				
				var timeout = 100;
				
				// if nothing is found
				if (list.length === 0) {
	                SR.Warn('No Response to get entry server list, try again in 2 seconds...');
					timeout = 2000;
				}
				else {
					// if we got something
					entryServers = list;			
				}
				
				setTimeout(function () {
					SR.queryServer(fullname, conn_type, onDone);
				}, timeout);				
			});
			return;
		}

		// otherwise contact one entry
		// TODO: ping each entry then choose the one with lowest RTT
		var index = Math.floor(Math.random() * entryServers.length);

		// store entry server to try (so we can remove it later if fail)			
		currentEntry = entryServers[index];

		queryConnectionPoint(currentEntry, conn_type, fullname, function (resObj) {
				
			// check for validity of the connection point
			if (resObj && typeof resObj.IP === 'string' && typeof resObj.port === 'number')				
				return SR.safeCall(onDone, resObj);
				
			removeEntry(currentEntry);	
			SR.Warn('no ConnectionPoint from this entry, remove it & try again...');
			setTimeout(function () {
				SR.queryServer(fullname, conn_type, onDone);
			}, 100);
		});
	}

    // set up server for RESTful calls
    SR.setRESTServer = function (port_or_name, onDone) {
		
		// check correctness
		if (typeof onDone !== 'function')
			onDone = undefined;
		
		var ip_port = undefined;
		var conn_type = (secured ? 'https' : 'http');
		
		// TODO: do not hard code port here
		// by port (directly)
		if (typeof port_or_name === 'number') {
			var ip_port = SR.host.name + ':' + (port_or_name + (secured ? PORT_HTTPS_INC : PORT_HTTP_INC));
			serverDomain = conn_type + '://' + ip_port;
		}
		// by name (via entry server)
		else {
			var fullname = port_or_name.replace(/-/g, '/');
			serverDomain = conn_type + '://' + SR.host.name + ':' + PORT_ENTRY + '/' + fullname;
		}
		console.log('serverDomain: ' + serverDomain);
		SR.safeCall(onDone);		
	}

	// setup socket server
	/*
		options: {
			type:		'string',		// 'sockio', 'sockjs'
			onEvent:	'function',
			onDone:		'function',
			hostname:	'string',		// Scalra server's hostname
			port:		'number',		// server's port
			name:		'string'		// lobby server's name
		}
	*/
	// keep a reference of options when re-connecting
	var conn_options = undefined;
	
	var eventStack = []; 
	
    SR.setSocketServer = function (options) {
		
		if (typeof options !== 'object') {
			SR.Warn('no options specified for setSocketServer');
			return;
		}
		
		// keep a backup copy when we need to auto-reconnect when server breaks
		conn_options = options;
						
		//port_or_name, connHandler, onDone, hostname, server_type
				
		// NOTE: server_type may be 'socketio' or 'sockjs'
		var server_type = options.type || 'sockjs';
		var connHandler = options.onEvent || function (msg) {SR.Log('connection status: ' + msg)};
		var _onDone = options.onDone;
		var hostname = options.hostname;
		var port = options.port;
		var name = options.name;
		
		var onDone = function onDone (args) {
			SR.safeCall(_onDone, args);
			if (Array.isArray(eventStack) && eventStack.length > 0) {
				//console.log("Ejecting eventStack...");
				for (var key in eventStack) {
					SR.sendEvent(
						eventStack[key].type,
						eventStack[key].para,
						eventStack[key].onDone,
						eventStack[key].method,
						eventStack[key].keep_callback
					);
				}
				delete eventStack;
			}
		}
		
		if (port === undefined && name === undefined) {
			SR.Warn('at least a server name or a port number need to be supplied');
			return;
		}	
		
		// check if socket.io library exists
		if (server_type === 'socketio' && typeof io === 'undefined') {
			return connHandler('load Socket.IO failed');
		}
		
		if (server_type === 'sockjs' && typeof SockJS === 'undefined') {
			return connHandler('load SockJS failed');			
		}
						
		var ip_port = undefined;
		var conn_type = (secured ? 'https' : 'http');
		
		// by port (directly)
		if (typeof port === 'number') {
         
			hostname = hostname || SR.host.name;
				
			ip_port = hostname + ':' + (port + (secured ? PORT_HTTPS_INC : PORT_HTTP_INC));
			socketDomain = conn_type + '://' + ip_port;	
			connectSocket(server_type, socketDomain, connHandler, onDone);
		}
		// by name (via entry server)
		else {
			var fullname = name.replace(/-/g, '/');
			
			// ask for IP/port to make socket connection
			SR.queryServer(fullname, (secured ? 'wss' : 'ws'), function (info) {

				SR.Log('queryServer response:');
				SR.Log(info);
				if (info) {
					ip_port = info.IP + ':' + info.port;
					SR.Log('ip_port: ' + ip_port);
       				socketDomain = conn_type + '://' + ip_port;
					connectSocket(server_type, socketDomain, connHandler, onDone);				
				}
				else {
					// NOTE: some serious error has occurred, we stop here, no further attempts will be made
					SR.Error('error: queryServer fail for: ' + fullname);
				}
			});
		}
	}

	
    /**
     * 
     *
     * @param {String} type name of the event
     * @Param {Object} para parameter object to be passed
     * @api public
     */
	
    // functions
	// onDone is a optional function of format:
	// onDone(response_type, para);
	// returns whether the send was successful
	// keep_callback: 'boolean'	(whether onDone won't be erased after processing a response), default to: false
	SR.sendEvent = function (type, para, onDone, method, keep_callback) {

		// check if para is missing (callback is placed instead)
		if (typeof para === 'function') {
			SR.Log('SR.sendEvent: parameter missing, use empty {} automatically for type [' + type + '], please check your code');
			method = onDone;
			onDone = para;
			para = {};
		}
		
		// default to empty parameters
		para = para || {};

		// store response handler, if available
		var rid = SR.createID();
		if (typeof onDone === 'function') {
			
			if (responseHandlers.hasOwnProperty(type) === false)
				responseHandlers[type] = {};
			
			// whether this callback will be kept, in such case, only ONE callback is stored
			// also, no rid will be sent
			if (keep_callback === true) {
				rid = 'keep';
			}
			else {
				// store rid as part of request's parameter
				para._rid = rid;			
			}
			
			// store callback, indexed by rid
			responseHandlers[type][rid] = onDone;
		}
				
		// web-socket specific processing
		// NOTE: we'll cache requests if sockets are not yet initialized
		//if (socket) {
		if (conn_options || (typeof connectType !== 'undefined' && (connectType === 'sockjs' || connectType === 'socketio'))) {							
			// check if we will send directly or queue the event after connection is established
			if (socket.opened) {
				var obj = {};
				obj[HEADER_EVENT] = type;
				obj[HEADER_PARA] = para;
				socket.sendJSON(obj);				
			} else {
				eventStack.push({
					type: type,
					para: para,
					onDone: onDone,
					method: method,
					keep_callback: keep_callback
				});
			}
			return;
		}

		// HTTP-style event sending
        if (!serverDomain) {
            SR.Error('no server defined, cannot send event');
            return;
        }
		
		// remove rid from para
		// TODO: find better approach
		if (para.hasOwnProperty('_rid')) {
			delete para['_rid'];
		}
        
		var req = serverDomain + '/event/' + type;
		//console.log('[' + method + '] sending request: ' + req);
						
        // send message via HTTP (default to POST)
        if (method === 'GET') {
        
			// append parameters
			req += (para ? ('?' + serialiseObject(para)) : '');
						
            httpGet(req, function (resObj) {
            
                if (resObj === undefined) {
                    SR.Log('No Response');
                    return;
                }

                var type = resObj[HEADER_UPDATE];
                var para = resObj[HEADER_PARA];
                
                onResponse(type, para);
            });
        }
        else {

            httpPost(req, para, function (resObj) {
            
                if (typeof resObj === 'undefined' || Object.keys(resObj).length === 0) {
                    SR.Log('No Response');
                    return;
                }
                var type = resObj[HEADER_UPDATE];
                var para = resObj[HEADER_PARA];
                
				onResponse(type, para);
            });
        }
    }
	
	// 
	// API-related
	//
	var APIlist = [];
	
    // load server-defined API
	SR.loadAPI = function (onDone) {
		
		// clear API list
		SR.API = {};
		
		// build a specific API
		var generateAPI = function (name) {
			return function (args, onDone) {
				
				if (typeof args === 'function') {
					onDone = args;
					args = {};
				}
				
				console.log('calling API [' + name + ']...');
				
				// NOTE: by default callbacks are always kept
				SR.sendEvent(name, args, function (result) {
					if (result.err) {
						console.error(result.err);
						return SR.safeCall(onDone, result.err);
					}
					
					SR.safeCall(onDone, null, result.result);
				}, undefined, true);
			}
		}
		
		SR.sendEvent('SR_API_QUERY', function (result) {
			if (result.err) {
				console.error(result.err);
				return SR.safeCall(onDone, result.err);
			}
			console.log('API available:' + result.result);
			APIlist = result.result;
			
			// load each API
			for (var i=0; i < APIlist.length; i++) {
				var name = APIlist[i];
				SR.API[name] = generateAPI(name);
			}
				
			SR.safeCall(onDone);
		});
	}
	
	//
	// helpers
    //
	
	// e-mail validate
    // src: http://stackoverflow.com/questions/46155/validate-email-address-in-javascript
    SR.validateEmail = function (email) { 
        var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    } 	
    
    // get URL parameter
    // src: http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values
    SR.getParameterByName = function (name) {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(location.search);
        return results == null ? undefined : decodeURSRomponent(results[1].replace(/\+/g, " "));
    }
	
	// generate local GUID
	SR.getGUID = function () {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    		var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    		return v.toString(16);
		});		
	}
	
	// get a numerical random number between 0 and 10000
	SR.createID = function () {
		
		var rand = exports.rand = function() {
			var f = (arguments[1]) ? arguments[0] : 0;
			var t = (arguments[1]) ? arguments[1] : arguments[0];
			return Math.floor((Math.random() * (t - f)) + f);
		};		
		
		return rand(10000);
	}
		
	// get querystring
	SR.getQueryString = function () {
    	// get querystring from current webpage
    	// ref: http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values
    	var qs = (function (a) {
        	if (a == "") return {};
        	var b = {};
        	for (var i = 0; i < a.length; ++i)
        	{
            	var p=a[i].split('=');
            	if (p.length != 2) 
					continue;
            	b[p[0]] = decodeURSRomponent(p[1].replace(/\+/g, " "));
        	}
        	return b;
    	})(window.location.search.substr(1).split('&'));
		
		return qs;
	}
	
	//
	// pub/sub functions
	//
	
	// callback when subscribed messages are received
	var onChannelMessages = {};

	// init SR and returns an instance	
	SR.init = function (options) {

		var onDone = function () {
			console.log('loading API from server...');
			SR.loadAPI(function () {
				SR.safeCall(options.onDone);				
			});
		}
		
		if (options.type === 'http') {
		    SR.setRESTServer(options.port, onDone);
			
		} else {
		
			console.log('ready to connect to socket server...');
			SR.setSocketServer({
				port:		options.port || 0,
				type:		options.type || 'sockjs',					// 'sockio', 'sockjs'
				onEvent:	options.onEvent,
				onDone:		onDone,
				hostname:	options.hostname,			// Scalra server's hostname
				//name:		options.api_key + '-lobby'	// lobby server's name, assume server is 'lobby' by default			
			});			
		}
		
		return this;
	}
	
	// publish a particular message to a channel or to an area
	// parameters (if first parameter is an object)
	//	{
	//		channel:	'string',
	//		message:	'string',
	//		id:			'string',
	//		area:		{x: 'number', y: 'number', r: 'number'},
	//		layer:		'string'
	//	}
	SR.publish = function (channel, msg) {

		// check for object-style parameters (new version)
		if (typeof channel === 'object') {
			var obj = channel;
			var area = undefined;
			if (typeof obj.area === 'object') {
				area = {
					x: obj.area.x,
					y: obj.area.y,
					r: obj.area.z
				}
			}
			SR.sendEvent('SR_PUB', {ch: obj.channel, msg: obj.message, id: obj.id, area: area, layer: obj.layer});
			return;
		}
		
		// original version
    	SR.sendEvent('SR_PUBLISH', {channel: channel, msg: msg});
	}

	// subscribe a channel
	// parameters (if first parameter is an object)
	//	{
	//		channel:	'string',
	//		last:		'number',
	//		id:			'string',
	//		area:		{x: 'number', y: 'number', r: 'number'},
	//		layer:		'string'
	//	}
	SR.subscribe = function (channel, last, onMsg) {

		console.log('subscribing [' + channel + ']...');
		
		// set default values
		if (typeof last === 'function' && typeof onMsg === 'undefined') {
			onMsg = last;
			last = 0;
		}
		
		// check for object-style parameters (new version)
		if (typeof channel === 'object') {
			var obj = channel;
			var area = undefined;
			if (typeof obj.area === 'object') {
				area = {
					x: obj.area.x,
					y: obj.area.y,
					r: obj.area.z
				}
			}
			SR.sendEvent('SR_SUB', {ch: obj.channel, last: obj.last, id: obj.id, area: area, layer: obj.layer});
			return;
		}
		
		// original version
		onChannelMessages[channel] = onMsg;
		
		if (typeof last !== 'number')
			last = 0;
			
    	SR.sendEvent('SR_SUBSCRIBE', {channel: channel, para: {last: last}});
	}
	
	// unsubscribe from a given channel, or an id (for SPS)
	// parameters (if first parameter is an object)
	//	{
	//		channel:	'string',
	//		id:			'string'
	//	}	
	SR.unsubscribe = function (channel) {
		
		// check for object-style parameters (new version)
		if (typeof channel === 'object') {
			var obj = channel;
			SR.sendEvent('SR_UNSUB', {ch: obj.channel, id: obj.id});
			return;
		}
		
		// original version
    	SR.sendEvent('SR_UNSUBSCRIBE', {channel: channel});
	}
	
	// receive server-push notifications
	SR.enableNotify = function (onNotify) {
		//console.log('SR.enableNotify called');
		SR.subscribe('notify', 0, function (data, ch) {
			//console.log('server push for [notify]:');
			//console.log(data);
			SR.safeCall(onNotify, data);
		});
	}
	
	// parameters (if first parameter is an object)
	//	{
	//		id:			'string',
	//		area:		{x: 'number', y: 'number', r: 'number'},
	//	}	
	SR.move = function (obj) {
		SR.sendEvent('SR_MOVE', {id: obj.id, area: {x: obj.x, y: obj.y, r: obj.r}});
	}
		
	//
	//	login functions
	//
	
	// callback to return result of login
	var onLoginResponse = undefined;
	
	// helper to respond
	var replyLogin = function (res) {
		if (typeof onLoginResponse === 'function')
			onLoginResponse(res);
	}

	// login id for this user	
	SR.login_id = '';

    // login
    // return {code: err_code, msg: err_msg}
    // code:    0   success
    //          1   fail
    //          2   error
    //          3   user data incorrect
    //
    SR.login = function (type, user_data, onDone) {
		
		// verify login_id exists or generate one
		if (SR.login_id === '') {
			SR.login_id = user_data.login_id || SR.getParameterByName('login_id') || SR.getGUID();	
		}
		
		user_data = user_data || {};
		
		if (typeof onDone === 'function')
			onLoginResponse = onDone;
        
        var err_msg = '';

        var verifyUserData = function (require_email, require_password) {
        
            var account  = user_data.account || '';
			var email    = user_data.email || '';
            var password = user_data.password || '';
        
            // check account & password
            err_msg = '';

            if (account === '')
                err_msg += 'missing account\n';
			else if ((require_email || email !== '') && SR.validateEmail(email) === false)
				err_msg += 'incorrect e-mail format\n';
            
            if (require_password && password == '')
                err_msg += 'please enter password\n';
                        
            return (err_msg === '');
        }
		
		var verifyPassword = function () {
			if (user_data.password !== user_data.confirm) {
				err_msg += 'passwords do not match';
				return false;
			}
			return true;
		}
        
		//console.log('login type: ' + type);
		
		// NOTE: right now we assume certain types of response if logic check fails locally, 
		// but this makes language binding too specific, remove it in future?
        switch (type) {
				
			case 'FB': 
				SR.sendEvent('SR_LOGIN_FB', {login_id: SR.login_id, data: user_data});
			break;

            // register new account
            case 'register':
                if (verifyUserData(true, true) === false)
                    return replyLogin({code: 3, msg: err_msg});

				// TODO: encrypt password
                SR.sendEvent('SR_LOGIN_REGISTER', {login_id: SR.login_id, data: user_data});
            break;

            // login by account & password
            case 'account':
                if (verifyUserData(false, true) === false)
                    return replyLogin({code: 3, msg: err_msg});
				
                SR.sendEvent('SR_LOGIN_ACCOUNT', {login_id: SR.login_id, data: user_data});
            break;
				
            // login by token
            case 'token':				
                SR.sendEvent('SR_LOGIN_TOKEN', {login_id: SR.login_id, data: user_data});
            break;				
            
            // guest account
            case 'guest':
				SR.sendEvent('SR_LOGIN_GUEST', {login_id: SR.login_id, data: user_data});
            break;
            
            // forget password
            case 'getpass':
                if (verifyUserData(true, false) === false)
                    return replyLogin({code: 3, msg: err_msg});
				
				SR.sendEvent('SR_LOGIN_GETPASS', {email: user_data.email});
            break;

			// set new password
			case 'setpass':
				if (verifyPassword() === false)
					return replyLogin({code: 3, msg: err_msg});
				
				if (typeof user_data.token !== 'string')
					return replyLogin({code: 3, msg: 'no setpass token'});
				
				SR.sendEvent('SR_LOGIN_SETPASS', {'password': user_data.password, 'token': user_data.token});
				break;
				
			// get account from login_id
			case 'getaccount':
				SR.sendEvent('SR_LOGIN_QUERY_ACCOUNT', {});
				break;
                
            // logout
            case 'logout':
                SR.sendEvent('SR_LOGOUT', {'account': user_data.account});
            break;
				
			// add local account
			case 'addlocal':
				SR.sendEvent('SR_ADDLOCAL', user_data);
				break;
				
            default:
				// send event directly
				SR.sendEvent(type, user_data);
				break;
				//return replyLogin({code: 2, msg: 'login method unknown: ' + type});
        }
    }
		
	//
	//	init 
	//
	
    // ID for self
    SR.id = SR.getGUID();
	
})('object' === typeof module ? module.exports : (this.SR = {}), this);

