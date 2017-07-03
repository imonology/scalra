// init gmail OAuth2.0 access
var gmailSender = require('gmail-sender-oauth');
var gmailApiSync = require('gmail-api-sync');
var l_gmailAccessToken = undefined;

//
//  gmail.js
//
//	send mails to Gmail
//
//	history:
//		2017-07-04	first version
//
// module object
var l_module = exports.module = {};

//-----------------------------------------
// API definitions
//
//-----------------------------------------

SR.API.add('_gmailText', {
	from:		'string',
	to:			'string',
	subject:	'string',
	body:		'string'
}, function (args, onDone) {
	
	if (!l_gmailAccessToken) {
		return onDone('no gmail accessToken found!');
	}
	
	gmailSender.send(l_gmailAccessToken, args, function (err, resp) {
		if (err) {
			LOG.error(err);
			return onDone(err);
		}
		LOG.warn('email sent to Gmail with id: ' + resp.id);
		onDone(null, resp.id);
	});
})


//-----------------------------------------
// Server Event Handling
//
//-----------------------------------------

// module init
l_module.start = function (config, onDone) {
	// process config & verify correctness here
	if (typeof SR.Settings.EMAIL_CONFIG.gmailServerAuthCode === 'undefined') {
		return onDone();
	}
		
	var key_path = SR.path.resolve(SR.Settings.PROJECT_PATH, 'keys', 'client_secret.json');
	gmailSender.setClientSecretsFile(key_path);	
	
	// get accessToken if available
	if (SR.Settings.EMAIL_CONFIG.gmailAccessToken) {
		l_gmailAccessToken = SR.Settings.EMAIL_CONFIG.gmailAccessToken;
		return onDone();
	}
	
	// generate accessToken
	var serverAuthCode = SR.Settings.EMAIL_CONFIG.gmailServerAuthCode;
	
	gmailApiSync.setClientSecretsFile(key_path);
	gmailApiSync.getNewAccesToken(serverAuthCode,function (err, token){
		if (err) {
			LOG.error(err);
			return onDone(err);
		} 
		else {
			l_gmailAccessToken = token;
			LOG.warn('accessToken: ' + JSON.stringify(token));
		}
		UTIL.safeCall(onDone, null);			
	});		
}

// module shutdown
l_module.stop = function (onDone) {
	// close / release resources used
	UTIL.safeCall(onDone);	
}
