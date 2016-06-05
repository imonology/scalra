//
//
// isAppConnector.js
//
//
// 2011-07-20 更換 fifo queue algorithm (http://code.stephenmorley.org/javascript/queues/)
// 2011-08-17 tmdata.socket.recvFunc() 的 emitEvent 拒絕處理 event, 導致 event 在 l_myEventPool 無法刪除
// 2013-09-14 replace usage of SR.Frontier with SR.Connector
//
//

//-----------------------------------------
// define local variables
//
//-----------------------------------------

// time in millisecond to reconnect with manager
var l_timeoutReconnect = SR.Settings.TIMEOUT_RECONNECT;

// info about this app
var l_appinfo = undefined;

//-----------------------------------------
// define local function
//
//-----------------------------------------

var l_connHandler = {

    // custom handling for new connections
    onConnect: function (conn) {
        LOG.warn('AppManager connected', 'SR.AppConnector');
    },

    // custom handling for removing a connection
    onDisconnect: function (conn) {
        
		LOG.error('AppManager disconnected', 'SR.AppConnector');
		
		if (SR.Settings.APPSERVER_AUTOSHUT === true) {
		
			// shutdown this frontier
			l_dispose();
			SR.Settings.FRONTIER.dispose();
		}
		else {
			LOG.warn('auto-shutdown is false, attempt to re-connect AppManager in ' + l_timeoutReconnect + ' ms...');

			// keep app server alive and try to re-connect if lobby shuts down
			setTimeout(l_connect, l_timeoutReconnect);
		}
    }
}

//-----------------------------------------
// external functions
//

// send an event to server while registering a response callback for the message
// if a response is expected, the expected response (res_type) and callback (onDone) can be specified
// TODO: l_appConnector.notifyLobby should be more generic (replaced with SR.RPC.remoteEvent ?)
var l_notifyLobby = exports.notifyLobby = function (packet_type, para, res_type, onDone) {
	if (l_appConnector)
		return l_appConnector.send(packet_type, para, res_type, onDone);
	
	LOG.error('AppConnector not yet init, this function can only be called from App servers to communicate with lobby', 'notifyLobby');
	LOG.stack();
	return UTIL.safeCall(onDone);
}

// app connector object
var l_appConnector = undefined;
var l_appConnectorHandler = require('./app_connector_handler');


//-----------------------------------------
/*
app_info: {
	name,
	local_name,
	IP:
	port:
}

ip_port: {
	IP: 'string',
	port: 'number'
}

handler: {
	checkers: 'object',
	handlers: 'object'
}

*/

var l_ip_port = undefined;
var l_onDone = undefined;

// register myself as a app to app manager
// do it after connector init success
var l_register = function () {

	LOG.warn('appinfo sent to lobby:');
	LOG.warn(l_appinfo);
	
    // notify AppManager we're ready
    l_notifyLobby('SR_APP_READY', l_appinfo, 'SR_APP_READY_RES',
        function (event) {

            if (event.data.op === true)
                LOG.sys('SR_APP_READY returns ok', 'l_HandlerPool');
            else
                LOG.error('SR_APP_READY returns fail', 'l_HandlerPool');

			// call onDone if exists (but just once)
            if (l_onDone) {
				UTIL.safeCall(l_onDone);
				l_onDone = undefined;
			}			
        }
    );
}

// attempt to connect to manager
var l_connect = function (ip_port, onDone) {

	if (l_appConnector === undefined) {
		LOG.warn('appConnector not init, cannot connect');
		return;
	}
	
	// retrieve from previous connect attempt, also store for later connect attempt
	// TODO: will need to change when lobby port becomes not fixed
	ip_port = ip_port || l_ip_port;
	l_ip_port = ip_port;
	
	// store callback to be called later
	// TODO: better approach?
	l_onDone = onDone || l_onDone;
	
	l_appConnector.connect(ip_port, function (err, socket) {
		if (err) {
			LOG.error('connection to manager: ' + ip_port.IP + ':' + ip_port.port + ' fail, try again in ' + l_timeoutReconnect + ' ms');
			
			// TODO: do not keep trying, but rather try to re-connect after being notified by monitor server
			setTimeout(l_connect, l_timeoutReconnect);
		}
		// connection is successful
		else {
			LOG.warn('connection to manager: ' + ip_port.IP + ':' + ip_port.port + ' established');
			l_register();
		}
	});
}

// initialize with the lobby server's IP & port, and the app server's info to be sent
exports.init = function (ip_port, app_info, onDone) {
    
	// check if local_name exists, or set a default one
	// TODO: remove usage of 'local_name' in future?
	if (typeof app_info.local_name !== 'string')
		app_info.local_name = app_info.name;
	
    // NOTE: only handlers are passed, but no user app is passed in to handle incoming connections
    l_appinfo = app_info;

	// NOTE: name parameter will determine which handler set to get,
	// in this case we want to use the same as the main app server's
	// so remoteEvent from lobby -> app server may work
	// TODO: better way for this?
	l_appConnector = new SR.Connector(l_connHandler);

    // add default handler for app functions
    l_appConnector.addHandler(l_appConnectorHandler);

	// setup notify to AppManager when users connect/disconnect
    SR.Callback.onConnect(function (conn) {

        // notify AppManager of user connection
        l_notifyLobby('USER_CONNECTED', {});
    });

    SR.Callback.onDisconnect(function (conn) {
    
        // notify AppManager of user disconnection
        l_notifyLobby('USER_DISCONNECTED', {});
    });
		
	// establish connection
    LOG.warn('connecting to AppManager: ' + ip_port.IP + ':' + ip_port.port, 'SR.AppConnector');	
	l_connect(ip_port, onDone);
}

// function to shutdown the connector externally
// NOTE: all the stop steps will be executed when dispose() is called
var l_dispose = exports.dispose = function (onDone) {
	if (!l_appConnector)
		return UTIL.safeCall(onDone);
	
	l_appConnector.dispose(function () {
		l_appConnector = undefined;	
		UTIL.safeCall(onDone);
	});
}

// verify if client login token is correct (check with app manager)
exports.verifyClient = function (account, token, onDone) {

    // notify lobby of the login of this user (transfer to this app at lobby)
 
    // NOTE: user data is sent as response in USER_LOGIN_R    
    l_notifyLobby('USER_LOGIN', {acc: account, tok: token}, 
                'USER_LOGIN_R',
                function (event) {
					UTIL.safeCall(onDone, event.data.op, event.data.user);
                }
    );
}

// notify app manager of a client disconnection
exports.disposeClient = function (account, onDone) {

    // notify lobby of the login of this user (transfer to this app at lobby)    
    // NOTE: user data is sent as response in USER_LOGIN_R
    l_notifyLobby('USER_LOGOUT', {acc: account}, 'USER_LOGOUT_R',
                function (event) {
					UTIL.safeCall(onDone, event.data.op);
                }
    );
}

// store app stat to app manager
exports.updateStat = function (statObj) {
    
    // NOTE: we do not expect a response for setting stat
    l_notifyLobby('APP_SET_STAT', statObj);
}

// perform same functions, except remotely
// TODO: replace this with calls to SR.RPC directly
var l_remoteAction = exports.remoteAction = function (svc_name, func_name, parameters) {
	
	// remote action is not required at lobby, perform local action
	if (SR.Settings.SERVER_INFO.type === 'lobby') {
		return false;
	}

	LOG.warn('local service not available, call RPC for: ' + func_name);	
	return SR.RPC.call(svc_name, func_name, parameters, l_appConnector);	
}
