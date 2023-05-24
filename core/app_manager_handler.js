/* cSpell:disable */
/* global SR, LOG, UTIL */
//
//  icAppHandler.js
//
//  accepts incoming requests from game apps
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
// app server notifies manager it is ready (can register info)
// NOTE: SR_APP_READY is sent in SR.Component
l_checkers.SR_APP_READY = {
	id:             'string',
	type:			'string',
	owner:			'string',
	project:		'string',
	name:           'string',
	local_name:     'string',
	IP:             'string',
	port:           'number'
};

l_handlers.SR_APP_READY = function (event) {

	var para = event.data;

	// create app record
	var appID = SR.AppConn.createApp(event.conn.connID, para);
	var appInfo = SR.AppConn.getAppInfo(appID);

	// notify custom callbacks and pass in app server info
	SR.Callback.notify('onAppServerStart', appInfo, event.conn);
	event.done('SR_APP_READY_RES', {op: true});
};

//-----------------------------------------
// request for a user login
// (transfer user to new app, block further login from user)
// NOTE: after user request login and connect to game app
// game app will notify manager to update user location
l_checkers.USER_LOGIN = {
	acc: 'string',
	tok: 'string'
};

l_handlers.USER_LOGIN = function (event) {
	var appID = SR.AppConn.getAppID(event.conn.connID);

	// check if the request is legal
	if (SR.AppConn.checkCert(event.data.acc, event.data.tok) === false) {
		LOG.error('token incorrect, cannot accept user login to app', 'SR.AppManager');
		event.done('USER_LOGIN_R', {op: false});
		return;
	}

	// transfer user to a given app
	SR.Location.setUser(event.data.acc, SR.AppConn.getAppLocationID(appID), appID);

	SR.Callback.notify('onAppUserLogin', event.data.acc, event.conn.connID);

	// TODO: return user data if available?
	// NOTE: right now it assumes when notify the user will provide such data
	//event.done('USER_LOGIN_R', {op: true, user: user_data});
	event.done('USER_LOGIN_R', {op: true});


};

//-----------------------------------------
// request for a user logout
// (unblock user)

l_checkers.USER_LOGOUT = {
	acc: 'string'
};

l_handlers.USER_LOGOUT = function (event) {
	var appID = SR.AppConn.getAppID(event.conn.connID);

	SR.Location.delUser(event.data.acc);

	SR.Callback.notify('onAppUserLogout', event.data.acc, event.conn.connID);
	event.done('USER_LOGOUT_R', {op: true});
};

// record keeping for user connection/disconnection
l_checkers.USER_CONNECTED = {};

l_handlers.USER_CONNECTED = function (event) {

	var appID = SR.AppConn.getAppID(event.conn.connID);

	// increase user count
	SR.AppConn.updateUserCount(appID, 1);

	// notify custom callback
	SR.Callback.notify('onAppUserConnect', appID);

	event.done();
};

l_checkers.USER_DISCONNECTED = {};

l_handlers.USER_DISCONNECTED = function (event) {

	var appID = SR.AppConn.getAppID(event.conn.connID);

	// decrease user count
	SR.AppConn.updateUserCount(appID, -1);

	if (SR.AppConn.checkUserThreshold(appID, 'underload') === true) {

		// if usercount is zero, check if we need to shutdown this app server
		//SR.AppConn.stopAppServers([appID], function () {
		SR.AppConn.deleteApp(
			appID,
			() => {
				LOG.warn(
					'successfully stop app server: '
						+ appID,
					'SR.AppManager'
				);
			},
			() => {
				LOG.warn(
					'fail to stop app server: ' + appID,
					'SR.AppManager'
				);
			}
		);
	}

	// notify custom callback
	SR.Callback.notify('onAppUserDisconnect', appID);

	event.done();
};


//-----------------------------------------
// game app reports relevant stat for the app
//
l_checkers.APP_SET_STAT = {};

l_handlers.APP_SET_STAT = function (event) {

	var appID = SR.AppConn.getAppID(event.conn.connID);

	// store stat object
	var stat = event.data;
	SR.AppConn.setSingleAppStat(appID, stat);

	// notify registered callback handles for this event
	SR.Callback.notify('onStatUpdate', appID, stat);

	// no need to respond to sending app
	event.done();
};

/*
//-----------------------------------------
// response to LOBBY_REQ_USR_LOC
l_checkers.LOBBY_RES_USR_LOC =
    {
		acc: 'string',
		op:  'boolean'
	}

l_handlers.LOBBY_RES_USR_LOC =
    function (event)
    {
        event.done();
        SR.AppConn.transferUserToLobby(event.data.acc, event.data.op);
    }
*/

//-----------------------------------------
// Monitor notifes for shutdown of this lobby
//
l_checkers.LOBBY_SHUTDOWN = {};

l_handlers.LOBBY_SHUTDOWN = function (event) {
	event.done();
	LOG.warn('LOBBY_SHUTDOWN received.. stop self...', 'SR.AppManager');
	SR.AppManager.stopLobby();
};
