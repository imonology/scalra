//
// icAppConnectorHandler.js
//
//
//game server list (server name, game type, no) idx by serverID
//go to server (by serverID)

//
// issue 2011-06-09 在 mjserver 和 lobbyserver 同步 user 資料完成前, user 有可能就對 mjserver 下指令的問題
//
//

//-----------------------------------------
// define local variables
//
//-----------------------------------------

var l_handlers = exports.handlers = {};
var l_checkers = exports.checkers = {};

//-----------------------------------------
// define local function
//
//-----------------------------------------


//-----------------------------------------
// App Manager notifes explicitly to shutdown this app server
// TODO: test if it's real AppManager sending the request, might check session info
//
l_checkers.APP_SHUTDOWN = {};

l_handlers.APP_SHUTDOWN = function (event) {
	event.done();
	SR.AppConnector.dispose();
	SR.Settings.FRONTIER.dispose();
};
