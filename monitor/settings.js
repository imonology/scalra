//
//
// settings.js
//
//

var settings = exports.settings = {}

settings.lobbyPort   = 37010;       // port for main lobby server

// name for started servers log
settings.serverList = 'startedServers.txt';

// NOTE: monitor server needs to be fault-tolerant
SR.Settings.SAFE_CALL   = true;

// cluster is enabled for monitors
SR.Settings.ENABLE_CLUSTER_MODE = true;

// XXX: please modify this before use
SR.Settings.httpAuth = {
	username: 'p@Q@3',
	password: 'd0A0*'
};
