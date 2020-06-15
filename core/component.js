//
//
// component.js
//
// Component Management
//
// 2012-06-04    initial version
//
// 2012-06-11    rename from step to component
// 2012-07-06   add icAppConnector

// cache of all components
var l_components = {};

// check whether a component is available
exports.isInstalled = function (name) {
	return l_components.hasOwnProperty(name);
};

// TODO: remove usage of SR.Settings.FRONTIER.getHostAddress()

//-----------------------------------------
// get predefined step for creating log files
// NOTE: this is replaced by /modules/log.js

// l_components['Log'] = exports.Log = function (path, log_name) {
			
// var stepLog = {
		
// name: 'Log',

// // define the init step
// start : function (onDone) {

// if (log_name.match(/[a-z]*$/) && log_name.match(/[a-z]*$/)[0]) {
// log_name = log_name.match(/[0-9a-zA-Z]*$/)[0];
// }			
			
// //create log name
// // universal ISO format
// //var log_id = new Date().toISOString();
// // use local ISO format
// var log_id = UTIL.localISOString(new Date());
// log_id = log_id.replace(/:/g, '-');
            
// var fullpath = SR.path.join(path, '..', 'log');
// LOG.sys('log path: ' + fullpath, 'SR.Component');
			
// // store for later use (useful in notifying monitor)
// SR.Settings.SERVER_INFO.log = log_name + '.' + log_id;

// var debug_file = SR.Settings.SERVER_INFO.log + '.log';
// var error_file = SR.Settings.SERVER_INFO.log + '.err';

// SR.Log.createLog(fullpath, debug_file,
// function (pID) {
				
// LOG.setLogHandle(pID);

		            // SR.Log.createLog(fullpath, error_file,
				        // function (id) {
// LOG.setLogHandle(id, 'error'); 
// UTIL.safeCall(onDone);
// },
		                // function () {
				            // UTIL.safeCall(onDone);
// }
// );
// },
// onDone
// );
// },

// // define the stop procedure
// stop: function (onDone) {

// // dispose log file
// SR.Log.disposeAllLogs(onDone);
// }
// }
	
// return stepLog;
// }

// DB
l_components['DB'] = exports.DB = function (collection_names, shutdown_if_fail) {

	var stepDB = {
		
		name: 'DB',

		start : function (onDone) {
			SR.Module.init('DB', {collections: collection_names, shutdown_if_fail: shutdown_if_fail}, function (result) {
				LOG.warn('onDone is called for DB Component...', 'SR.Component');
				UTIL.safeCall(onDone, true);
			});
		},

		stop : function (onDone) {
			SR.Module.dispose('DB', onDone);
		}
	};

	return stepDB;
};

//
// AppManager
//
// input:
//
l_components['AppManager'] = exports.AppManager = function () {

	var stepAppManager = {
		
		name: 'AppManager',

		start : function (onDone) {

			var manager_port = SR.Settings.FRONTIER.getHostAddress().port + SR.Settings.PORT_INC_APP_MANAGER;
			LOG.warn('init AppManager... port: ' + manager_port, 'SR.Component');

			SR.AppManager.init(manager_port,
				function () {
					LOG.sys('init AppManager done...', 'SR.Component');
					UTIL.safeCall(onDone);
				}
			);
		},

		stop : function (onDone) {

			LOG.sys('notify all app server to shutdown', 'SR.Component');
        
			// notify all app servers to disconnect 
			// wait for replies from all apps	
			SR.Execute.stop([],
				function () {
					LOG.sys('shutdown all app servers', 'SR.Component');
                    
					// stop manager
					LOG.sys('dispose AppManager...', 'SR.Component');
                               
					SR.AppManager.dispose(onDone);
				}
			);   
		}
	};

	return stepAppManager;

}; // end AppManager

//
// AppConnector
//        init icAppConnector to connect to a AppManager
//
// input:
//        ip_port: IP & port of the app manager,
//        handler: custom handler for incoming messages
//      info: {ip, port, eng_name, local_name}
//
// TODO: simplify?
l_components['AppConnector'] = exports.AppConnector = function () {

	// TODO: if init fails, then all subsequent steps should not occur
	var stepAppConnector = {
		
		name: 'AppConnector',

		start: function (onDone) {

			// check if required settings exist
			if (UTIL.userSettings('lobbyPort') === undefined) {
				LOG.error('lobby port setting not available in settings.js file', 'SR.Component');
				return UTIL.safeCall(onDone, false);
			}
			
			// IP & port setting of app manager
			var manager_ip_port = {IP: SR.Settings.IP_LOBBY, port: UTIL.userSettings('lobbyPort')};
			manager_ip_port.port += SR.Settings.PORT_INC_APP_MANAGER;

			// prepare app server info (prepare default then see if we can overwrite)			
			var para = UTIL.clone(SR.Settings.SERVER_INFO);

			// NOTE: currently, name is the server's directory name
			//       local_name is specified in the project's settings.js
			
			// add legacy info			
			// TODO: check if still necessary or can be removed			
			var app_info = UTIL.userSettings('apps', para.name);
			LOG.warn('app_info detected by AppConnector:', 'SR.Component');
			LOG.warn(app_info);
			
			if (app_info && app_info.local_name) {
				para.local_name = app_info.local_name;
				LOG.warn('load local name: ' + para.local_name, 'SR.Component');
			}
			
			// initialize AppConnector
	        LOG.sys('init SR.AppConnector... connecting AppManager', 'SR.Component');

			SR.AppConnector.init(manager_ip_port, para,
				function () {
					if (SR.Settings.FRONTIER.isServerReady() === false) {
						SR.Settings.FRONTIER.dispose();
						return;
					}

					UTIL.safeCall(onDone);			
				}
			);
		},

		stop: function (onDone) {

			// disconnect from app manager
			LOG.sys('disconnect from app manager...', 'SR.Component');

			SR.AppConnector.dispose(onDone);
		}

	}; // end stepAppConnector

	return stepAppConnector;

}; // end AppConnector


//
// REST Service
//
// input:
//        port:            port to listen for RESTful requests
//

// REST Service
l_components['REST'] = exports.REST = function (type, handle_list, port) {

	// default to HTTP
	type = type || 'HTTP';
		
	var stepRESTService = {

		name: 'REST-' + type,
		
		start : function (onDone) {

			// convert port to numerical value
			if (port && typeof port === 'string')
				port = parseInt(port);

			var REST_port = port || 
				            SR.Settings.FRONTIER.getHostAddress().port + 
						    (type === 'HTTPS' ? SR.Settings.PORT_INC_HTTPS : SR.Settings.PORT_INC_HTTP);

			LOG.sys('init icREST...type: ' + type + ' port: ' + REST_port, 'SR.Component');

			// start REST server given type, port, keys
			var server = SR.REST.init(type, REST_port, UTIL.userSettings('keys'));

			// store server
			//l_components[type] = server;
			
			// set default REST handlers
			SR.REST.addHandler(SR.REST.Handler);
			//SR.REST.addHandler('REST_upload.js');
			SR.REST.addHandler('REST_web.js');
		
			// NOTE: this has been moved to monitor server
			//SR.REST.addHandler('REST_execute.js');
			
			// set custom REST handlers
			if (handle_list && handle_list.length > 0) {
				for (var i=0; i < handle_list.length; i++)
					SR.REST.addHandler(handle_list[i]);
			}
			
			UTIL.safeCall(onDone);
		},

		stop : function (onDone) {

			LOG.sys('dispose icREST [' + type + ']...', 'SR.Component');
			
			// NOTE: type will determine which kind of server to stop (HTTP or HTTPS)
			SR.REST.dispose(type);
			UTIL.safeCall(onDone);
		}
	};

	return stepRESTService;

}; // end REST


//
// FB Connect Extension
//
// input:
//      para:            parameters for the FB app, including:
//      app_id:          FB-specific app ID
//      app_secret:      FB-specific app secret
//      app_url:         the actual application URL after login is done            

// FB Connect Extension
l_components['FB'] = exports.FB = function () {

	var step = {

		name: 'FB',
		
		start : function (onDone) {

			var app_list = UTIL.userSettings('FB');

			if (app_list === undefined) {
				LOG.error('missing FB field in settings.js', 'SR.Component');
				return UTIL.safeCall(onDone);
			}

			var keys = UTIL.userSettings('keys');
			var FB_port = SR.Settings.FRONTIER.getHostAddress().port + 
				          (keys !== undefined ? SR.Settings.PORT_INC_HTTPS : SR.Settings.PORT_INC_HTTP);

			var domain = UTIL.userSettings('domain');
			if (domain === undefined) {
				LOG.error('"domain" setting not found in settings.js', 'SR.Component');
				return UTIL.safeCall(onDone);
			}
			LOG.warn('init icFB...port: ' + FB_port + ' domain: ' + domain, 'SR.Component');
			
			SR.SNS.FB.start(FB_port, domain, keys, function () {
				// add individual apps to FB extension
				for (var i=0; i < app_list.length; i++)
					SR.SNS.FB.add(app_list[i]);

				UTIL.safeCall(onDone);
			});
		},

		stop : function (onDone) {

			LOG.sys('dispose icFB...', 'SR.Component');
			SR.SNS.FB.stop();
			UTIL.safeCall(onDone);
		}
	};

	return step;

}; // end FB


//
// socket.io Service
//
// input:
//        port:            port to listen for socket.io requests
//

// socket.io Service
l_components['SocketIO'] = exports.SocketIO = function (type) {

	type = type || 'HTTP';
		
	var step = {

		name: 'SocketIO-' + type, 
		
		start : function (onDone) {

			var port = SR.Settings.FRONTIER.getHostAddress().port + SR.Settings.PORT_INC_SOCKETIO;
			console.log('port listening on - ',port);
			// check if we'll use secured socket.io
			var options = undefined;
			
			if (type === 'HTTPS' && SR.Keys) {
				options = {
					key: 	SR.Keys.privatekey,
					cert: 	SR.Keys.certificate
				};
			}
			
			// check if we'll use port or server to init socketio, depending on whether HTTP server exists
			
			var server_or_port = undefined;
			
			//if (l_components.hasOwnProperty(type)) {
			if (SR.REST.server.hasOwnProperty(type)) {
				LOG.warn('starting Socket.IO server under ' + type + ' server', 'SR.Component');
				//server_or_port = l_components[type];
				server_or_port = SR.REST.server[type];
			} else {
			
				LOG.warn('starting Socket.IO server wth port: ' + port, 'SR.Component');
				server_or_port = port;
			}
			
			// pass frontier's event dispatcher to handle incoming events
			// TODO: better approach?
			//SR.SocketIO.start(server_or_port, SR.Settings.FRONTIER.getConnectionHandler(), function () {
			SR.SocketIO.start(server_or_port, function () {
				UTIL.safeCall(onDone);
			}, options); 
		},

		stop : function (onDone) {

			LOG.sys('dispose icSocketIO...', 'SR.Component');
			SR.SocketIO.stop();
			UTIL.safeCall(onDone);
		}
	};

	return step;

}; // end SocketIO

//
// SockJS Service
//
// input:
//        type:		type of server ('HTTP' 'HTTPS')
//

// SockJS Service
l_components['SockJS'] = exports.SockJS = function (type) {

	type = type || 'HTTP';
	
	var step = {
		
		created : false,
		name: 'SockJS-' + type,
		
		start : function (onDone) {

			var http_server = undefined;
			
			//if (l_components.hasOwnProperty(type)) {
			if (SR.REST.server.hasOwnProperty(type)) {
				LOG.sys('starting SockJS [' + type + '] server', 'SR.Component');
				http_server = SR.REST.server[type];
			} else {
				var errmsg = 'an HTTP or HTTPS server must be started first';
				LOG.error(errmsg, 'SR.Component');
				return UTIL.safeCall(onDone, errmsg);
			}
			
			SR.SockJS.start(http_server, function (s) {
				// record server created
				this.created = true;
				LOG.warn('SockJS [' + type + '] server started', 'SR.Component');
				UTIL.safeCall(onDone);
			});
		},

		stop : function (onDone) {
			
			LOG.sys('dispose SockJS [' + type + '] server...', 'SR.Component');

			if (this.created === true)
				SR.SockJS.stop(type);
			else
				LOG.warn('SockJS [' + type + '] server not created, cannot dispose', 'SR.Component');
			
			UTIL.safeCall(onDone);
		}
	};

	return step;

}; // end SockJS


//
// streaming server Service
//
// input:
//        port:            port to listen for socket.io requests
//

// streaming server Service
l_components['Stream'] = exports.Stream = function () {
	
	var stream_server = undefined;

	var step = {
		
		name: 'Stream',

		start : function (onDone) {
			var base_port = SR.Settings.FRONTIER.getHostAddress().port;
			var port_in = base_port + SR.Settings.PORT_INC_STREAM_IN;
			var port_out = base_port + SR.Settings.PORT_INC_STREAM_OUT;

			LOG.sys('init SR.Stream, port_in: ' + port_in + ' port_out: ' + port_out, 'SR.Component');

			// pass frontier's event dispatcher to handle incoming events
			// TODO: better approach?
			stream_server = new SR.Stream({
				IN_PORT: port_in,
				OUT_PORT: port_out
			});
			stream_server.start();
			UTIL.safeCall(onDone);
		},

		stop : function (onDone) {

			LOG.sys('dispose SR.Stream...', 'SR.Component');
			if (stream_server)
				stream_server.stop();
			UTIL.safeCall(onDone);
		}
	};

	return step;

}; // end Stream

