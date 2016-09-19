//
//
// settings.js
//
//

var settings = exports.settings = {}

settings.lobbyPort   = 37010;       // port for main lobby server

// NOTE: monitor server needs to be fault-tolerant
SR.Settings.SAFE_CALL   = true;

// cluster is enabled for monitors
SR.Settings.ENABLE_CLUSTER_MODE = true;

settings.keys = {
	privatekey:  './keys/privatekey.pem',
	certificate:  './keys/certificate.pem',
	ca:  './keys/ca.pem'
}

settings.mongoAccess = {"DB_name":"scalra-scalra","username":"scalra-scalra","password":"299987"};
