
//
//
// app.js
//
// App Management
//
// history:
// 2011-05-27 nexttick issue
// 2011-07-20 更換 fifo queue algorithm (http://code.stephenmorley.org/javascript/queues/)
// 2011-08-17 tmdata.socket.recvFunc() 的 emitEvent 拒絕處理 event, 導致 event 在 l_myEventPool 無法刪除
// 2012-04-22 rename to aereGameFrontier from aereGameConnector
// 2012-05-26 rename to aereAppFrontier from aereGameFrontier
//
// 2012-06-25 initial version as app_manager (rename from aereAppFrontier)
//            (extracted from aere_app_conn, aere_app_frontier, aere_app_handler)
//
// 2014-04-26 remove global usage of SR.AppHandler

// game server list (server name, game type, no) indexed by serverID
// go to server (by serverID)

// 接收 gameapp data 之後交由 icLobbyFrontier event 處理
// icAppManager eventSender 用於接收 aereLobbyFrontier 之訊息再丟給指定的 aereGame app




//-----------------------------------------
// define local variables
//
//-----------------------------------------

//-----------------------------------------
// define local function
//
//-----------------------------------------

//
// app connections
//


//-----------------------------------------

// frontier object
var l_appManager = undefined;
var l_appManagerHandler = require('./app_manager_handler');

//-----------------------------------------
// NOTE: handler may also contain methods to handle customized procedure at app manager
//       when user connect/disconnect to game apps
// TODO: not a clean way to do this
exports.init = function (manager_port, onDone) {
    	
	// create Listener object
	// NOTE: we do not provide 'path', so there's not dynamic reload for AppManager's handlers
	l_appManager = new SR.Listener({
		name:			'manager',			// to identify event handler set
		port: 			manager_port,
		conn_module: 	SR.AppConn
	});

	// add default handler for app functions
	SR.Handler.add(l_appManagerHandler, 'manager');
    
	// execute all the steps for running a server
	l_appManager.init(onDone);
};

// NOTE: all the stop steps will be executed when the dispose() of the frontier is called
// function to shutdown the game frontier externally
exports.dispose = function (onDone) {
	if (l_appManager) {
		l_appManager.dispose(function () {
			l_appManager = undefined;
			UTIL.safeCall(onDone);
		});
	} else
		UTIL.safeCall(onDone);
};

// shutdown lobby externally (from monitor server)
exports.stopLobby = function () {
	
	if (SR.Settings.FRONTIER !== undefined) {
		SR.Settings.FRONTIER.dispose(function () {
			LOG.warn('frontier stopped', 'SR.AppManager');
		});
	}
};
