//
//  icAppConn.js
//
//	connection handler for AppManager
//
//
// 2011-07-20 更換 fifo queue algorithm (http://code.stephenmorley.org/javascript/queues/)
// 2012-05-26 remove getAppBySocket() function
//
//
/*
functions:
isApp(appID)
getAppID(connID)
getAppInfo(appID)
onConnect(conn)
onDisconnect(conn)

createApp(connID, info)
updateUserCount(appID, modifier)
checkUserThreshold(appID, type)
getAvailableApp(location_name)
getServerCapacity(loc)
getAppLocationID(appID)
getSingleAppStat(appID)
setSingleAppStat(appID, stat)
getAppLocationID(appID)
queryAppServers(name, onDone)
requestTransferUserToLobby(account, onSuccess, onFail)
transferUserToLobby(account, pOp)
sendApp(appID, packet_type, para)
createCert(pAccount)
checkCert(pAccount, pToken)
removeCert(pAccStr)
*/


//-----------------------------------------
// define local variables
//
//-----------------------------------------

// connection module manager, should provide:
// 'isConnected'
// 'getConnObject'

// map for app info, indexed by serverID
// see 'createApp' for actual app info content
var l_apps = {};

// map from connID to serverID
var l_conn2app = {};

//-----------------------------------------
// define local function
//
//-----------------------------------------

//-----------------------------------------
// define external function
//
//-----------------------------------------

// check if an appID is valid
exports.isApp = function (app_id) {
	
	if (l_apps.hasOwnProperty(app_id) === false) {
		LOG.warn('appID [' + app_id + '] not found, list:');
		for (var id in l_apps)
			LOG.warn('appID: ' + id, 'SR.AppConn.isApp');
	}
	return l_apps.hasOwnProperty(app_id);
}

var l_getAppID = exports.getAppID = function (connID) {
	if (l_conn2app.hasOwnProperty(connID) === false) {
		LOG.error('cannot find appID via connID: ' + connID, 'SR.AppConn.getAppID');
		return undefined;
	}
	return l_conn2app[connID];
}

// get basic info about a app server
var l_getAppInfo = exports.getAppInfo = function (app_id) {
	
	if (l_apps.hasOwnProperty(app_id) === false) {
		LOG.warn('appID [' + app_id + '] not found, list:');
		for (var id in l_apps)
			LOG.warn('appID: ' + id, 'SR.AppConn.getAppInfo');
	}
	return l_apps[app_id];
}

// custom handling for new connection
exports.onConnect = function (conn) {
	LOG.warn('incoming connection to AppManager, connID: ' + conn.connID, 'onConnect');
}

//-----------------------------------------
// custom handling for removing a connection
exports.onDisconnect = function (conn) {
	
	// NOTE: possible this connection is one-time only (to request for server, such as SR_RES_QUERY_SERVER),
	// and not connection from an app
	if (l_conn2app.hasOwnProperty(conn.connID) === false) {
		LOG.error('disconnection does not represent an app server: ' + conn.connID);
		return;
	}
	
	// lookup appID and notify other registered callbacks
	var appID = l_conn2app[conn.connID];
	delete l_conn2app[conn.connID];
	
	var appInfo = l_getAppInfo(appID);
	
	// notify custom callbacks and pass in app server info
	SR.Callback.notify('onAppServerStop', appInfo, conn);

	// NOTE: this is where we clean up a app's info if it disconnects abnoramlly	
	l_deleteApp(appID);
};

// register a new app
exports.createApp = function (connID, info) {

    // if connection doesn't exist
    if (SR.Conn.isConnected(connID) === false) {
        LOG.error('connID: '+ connID +' not found.', 'createApp');
        return;
    }
	
    // check if app already exists
    if (l_apps.hasOwnProperty(info.id) === true) {
        LOG.error('appID: ' + info.id + ' already exists', 'createApp');
        return;
    }

	LOG.warn('connID: ' + connID + ' info:', 'createApp');
	LOG.warn(info);

    var appInfo = {
		
        id:             info.id,		// unique app ID
		owner:			info.owner,
		project:		info.project,
        name:           info.name,		// name of the app
		type:			info.type,
        local_name:     info.local_name,

        // public IP/port of this app
        IP:             info.IP,
        port:           info.port,
		connID:			connID,

        // location ID of the app (assigned by this app)
        locationID:     SR.Location.getLocationID(info.name, info.local_name),

        // number of users at this app
        usercount:      0,

        // app-related stat (should be customizable)
        stat:           undefined
    }

    LOG.sys('App info for ' + appInfo.local_name + ' (' + appInfo.name + '): ', 'createApp');
    LOG.sys('locationID: ' + appInfo.locationID + ' @ ' + appInfo.IP + ':' + appInfo.port, 'createApp');
        
    // store new app
    l_apps[info.id] = appInfo;

	// store connID to serverID mapping
	l_conn2app[connID] = info.id;
		
    return info.id;
}

// remove a registered app
var l_deleteApp = exports.deleteApp = function (appID, onSuccess, onFail) {

    LOG.sys('del appID = ' + appID, 'l_deleteApp');

    // check if the app is registered
    if (l_apps.hasOwnProperty(appID) === false) {
        LOG.error('appID=' + appID + ' not found.', 'deleteApp');
        UTIL.safeCall(onFail, appID);
    }

    // delete transfer requests to lobby
    // delete respective users so requests are not processed

    // get all users at this app
    var accounts = SR.Location.getAppUsers(appID);
    var requests = 0;

    for (var i=0; i < accounts.length; ++i) {
        // remove all transfer request to lobby
        if (l_transferLobbyRequests.hasOwnProperty(accounts[i]) === true) {
            requests++;        
            delete l_transferLobbyRequests[accounts[i]];
        }
    }

    LOG.warn('delete ' + requests + ' transfer to lobby requests', 'l_deleteApp');
        
    // remove app from location records
    SR.Location.delApp(appID);

    //
    // remove app info / record
    //
       
    // delete app
    delete l_apps[appID];

	//SR.Execute.onStopped(appID);
	
    UTIL.safeCall(onSuccess, appID);
}

// increase/decrease user count at a given app
exports.updateUserCount = function (appID, modifier) {
    
    if (l_apps.hasOwnProperty(appID) === false) {
        LOG.error('app not found for id: ' + appID, 'updateUserCount');
        return false;    
    }

    l_apps[appID].usercount += modifier;
    return true;
}

// check if a user count matches the level for a particular server setting
// type can be 'overload' or 'underload'
exports.checkUserThreshold = function (appID, type) {
	
	// check if server exists
	if (l_apps.hasOwnProperty(appID) === false) {
		LOG.warn('app server [' + appID + '] does not exist, cannot check user threshold', 'SR.AppConn.checkUserThreshold');
		return false;
	}
	
	if (type === 'overload') {
		var threshold = UTIL.userSettings('servers', 'overload') | 0;
		if (threshold !== 0 && l_apps[appID].usercount >= threshold)
			return true;
	}
	else if (type === 'underload') {
		var threshold = UTIL.userSettings('servers', 'underload');
		if (threshold !== undefined && l_apps[appID].usercount <= threshold)
			return true;
	}
	return false;
}

//-----------------------------------------
// obtain the info for an available app for a given server
// NOTE: this is an important function, and may need to provide load balancing
var l_getAvailableApp = exports.getAvailableApp = function (server_name) {

    // TODO: find a better way?
    var info = {};
    var lowest = 100000000;          // app with lowest load (online users)
    var lowest_appID = undefined;    // appID 

	// get maxmium user limit per server
	var max_count = UTIL.userSettings('servers', 'overload') | 0;
	
	LOG.sys('checking available app server for [' + server_name + '] max_per_server: ' + max_count, 'getAvailableApp');
		
    for (var appID in l_apps) {

        var app = l_apps[appID];

        // check if the app is connected and locationID matches
        if (SR.Conn.isConnected(app.connID) === false ||
			app.name !== server_name) {
			//LOG.warn('serverID: ' + appID + ' (connID: ' + app.connID + ') is not connected or name does not match location name', 'getAvailableApp');
            continue;
		}

        //LOG.sys('ID: ' + app.id + ' IP: ' + app.IP + ' port: ' + app.port, 'getAvailableApp');

        // check if this app has the least number of people for this location, 
		// but also its user count cannot exceed maximum
        if ((max_count === 0 || app.usercount < max_count) && 
			app.usercount < lowest) {
            lowest = app.usercount;
            lowest_appID = appID;
        }
    }

    // store info for the app with lowest number of people
    if (lowest_appID !== undefined) {
        info = {
            appID:    lowest_appID,
			owner:    l_apps[lowest_appID].owner,
			project:  l_apps[lowest_appID].project,
            name:     server_name,
            IP:       l_apps[lowest_appID].IP,
            port:     l_apps[lowest_appID].port
        }
    }

    return info;
}

// get how many servers left can be started
var l_getServerCapacity = exports.getServerCapacity = function (loc) {
	var max_server = UTIL.userSettings('servers', 'max') | 0;

	var list = l_queryAppServers(loc);
	var list_len = Object.keys(list).length;
	LOG.warn('there are currently ' + list_len + ' [' + loc + '] servers, maxium startable: ' + max_server);
	
	// should not auto-start any server
	if (max_server === 0)
		return 0;
	
	return (list_len >= max_server ? 0 : max_server - list_len);
}

//-----------------------------------------
// get locationID based on appID
exports.getAppLocationID = function (appID) {
    return (l_apps.hasOwnProperty(appID) ? l_apps[appID].locationID : undefined);
}

//-----------------------------------------
var l_getSingleAppStat = exports.getSingleAppStat = function (appID) {
    return (l_apps.hasOwnProperty(appID) ? l_apps[appID].stat : undefined);
}

// set stat for a single app
exports.setSingleAppStat = function (appID, stat) {
    if (l_apps.hasOwnProperty(appID) === false)
        LOG.error('app not found for: ' + appID, 'setSingleAppStat');
    else
        l_apps[appID].stat = stat;
}

// get a list of appIDs of all connected apps
var l_queryAppServers = exports.queryAppServers = function (name, onDone) {

    var list = {};

    for (var appID in l_apps) {

		// check if we only return app servers of a particular name
		if (name !== undefined && l_apps[appID].name !== name)
			continue;
		
        list[appID] = l_apps[appID];
    }

	// return list via callback if provided
	UTIL.safeCall(onDone, list);
	
    return list;
}


/*
//-----------------------------------------
var l_transferLobbyRequests = {}; //idx by account

// ask a app whether a user can be transferred to 
// NOTE: obsolete method, should remove it
exports.requestTransferUserToLobby = function (account, onSuccess, onFail) {

    // ignore if already requested
    if (l_transferLobbyRequests.hasOwnProperty(account) === true) {
        LOG.warn('already requested', 'requestTransferUserToLobby');
        return UTIL.safeCall(onFail);
    }

    // get user's current appID
    var appID = SR.Location.getUserAppID(account);
    
    if (appID === undefined) {
        //app not found
        LOG.warn('cannot find user current appID', 'requestTransferUserToLobby');
        return UTIL.safeCall(onFail);
    }

    // sotre a transfer request
    var reqObj = {
            acc: account,
            onSuccess: onSuccess,
            onFail: onFail
    };

    l_transferLobbyRequests[ account ] = reqObj;

    // ask app server whether a given user can leave (LOBBY_REQ_USR_LOC)
	// NOTE: replace with SR.RPC.remoteEvent
    SR.EventManager.send('LOBBY_REQ_USR_LOC', {acc:account}, [SR.Conn.getConnObject(appID)]);
}
*/

/*
//-----------------------------------------
// app responds whether can return to lobby
exports.transferUserToLobby = function (account, pOp) {
	
    if (l_transferLobbyRequests.hasOwnProperty(account) === false) {
        LOG.error('account='+account+' not found.', 'transferUserToLobby');
        return;
    }

    if (pOp === true) 
        UTIL.safeCall(l_transferLobbyRequests[account].onSuccess, account);
    else
        UTIL.safeCall(l_transferLobbyRequests[account].onFail, account);
        
    // delete request
    delete l_transferLobbyRequests[account];
}
*/

//-----------------------------------------
// send data to a particular app
var l_sendApp = exports.sendApp = function (appID, packet_type, para) {

	// translate appID to connID
	if (l_apps.hasOwnProperty(appID) === false) {
		LOG.error('appID: ' + appID + ' not found.', 'SR.AppConn.sendApp');
		LOG.stack();
		return;
	}
	
	var connID = l_apps[appID].connID;
		
    // check if connection exists
    if (SR.Conn.isConnected(connID) === false)
		return LOG.error('connID: ' + connID + ' not connected', 'SR.AppConn.sendApp');
    
    //...
	LOG.sys('send msg to appID: ' + appID, 'sendApp');
    SR.EventManager.send(packet_type, para, [SR.Conn.getConnObject(connID)]);
}

//-----------------------------------------
var l_certPool = {};

// create temp certificates (i.e., token) for a client to authenticate itself to a app
exports.createCert = function (pAccount) {
        var tmpCert =
            {
                tok:        UTIL.createUUID(),
                expTime:    ''
            };

        l_certPool[pAccount] = tmpCert;

        return tmpCert.tok;
    }

//-----------------------------------------
// check cert was the one issued
exports.checkCert = function (pAccount, pToken) {
        if (l_certPool.hasOwnProperty(pAccount) && l_certPool[pAccount].tok === pToken)
        {
            // TODO: check expire time
            return true;
        }
        return false;
    }

//--------------------------------------
// remove an existing cert
exports.removeCert = function (pAccStr) {

    if (l_certPool.hasOwnProperty(pAccStr) === true)
        delete l_certPool[pAccStr];
    else
        LOG.error('cert not found', 'removeCert');    
}
