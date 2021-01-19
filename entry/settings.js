/* global SR, LOG, UTIL */

//
//
// settings.js
//
//

var settings = global.g_settings = {};

//settings.lobbyPort = 8000;       // default socket port

// NOTE: monitor server needs to be fault-tolerant
SR.Settings.SAFE_CALL   = true;

settings.keys = {
	privatekey:  './keys/privatekey.pem',
	certificate:  './keys/certificate.pem',
	ca:  './keys/ca.pem'
};

settings.mongoAccess = {'DB_name':'scalra-Scalra','username':'scalra-Scalra','password':'720688'};
