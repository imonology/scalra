/*
	gmail module - send mails to Gmail server via OAuth2.0
	based on the gmail-sender-oauth npm 
	
	ref: https://www.npmjs.com/package/gmail-sender-oauth
		
	Usage:
		this module will replace original behavior in UTIL.emailText if loaded
		
		steps to use:
			1. prepare a "client_secret.json" file in /keys directory (of scalra module or project)
				see: https://developers.google.com/gmail/api/quickstart/nodejs
				(click on "Enable Gmail API")
				
			2. generate ServerAuthCode
			3. generate AccessToken
			
		see: https://www.npmjs.com/package/gmail-sender-oauth#authentication-with-access-token
		for how to perform step #2 and #3
		NOTE: the file "client_secret.json" should be placed in same directory as the generator code,
		when generating ServerAuthCode
		
			4. set generated ServerAuthCode and AccessToken into scalra's /config.js
			
				// mail server config
				EMAIL_CONFIG: {
					 user:   	'<GMAIL_USERNAME>',
					 password:	'<GMAIL_USERPASS>',
					 host:		'smtp.gmail.com',
					 ssl:		true,
					 gmailServerAuthCode: '<SERVER_AUTH_CODE>',
					 gmailAccessToken: {"access_token":"","refresh_token":"","token_type":"Bearer","expiry_date":0000}
				},			
*/


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
var l_name = 'Module.gmail';

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
			LOG.error(err, l_name);
			return onDone(err);
		}
		LOG.warn('email [' + args.subject + '] sent to: ' + args.to + ' (id: ' + resp.id + ')', l_name);
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
	
	LOG.error('loading gmail modules...');
	LOG.stack();
	
	var onAccessToken = function () {
		//LOG.warn('accessToken: ' + JSON.stringify(l_gmailAccessToken), l_name);			
		
		// check if gmail is loaded as the ONLY email module, default to true
		if (config.only !== false) {

			// replace UTIL.emailText
			UTIL.emailText = function (msg, onD) {

				// see if conversion is needed
				// ref: https://stackoverflow.com/questions/11206443/how-can-i-check-if-variable-contains-chinese-japanese-characters
				if (msg.subject.match(/[\u3400-\u9FBF]/)) {
					// encode subject to allow Chinese
					// ref: https://stackoverflow.com/questions/27695749/gmail-api-not-respecting-utf-encoding-in-subject
					// base64: https://stackoverflow.com/questions/246801/how-can-you-encode-a-string-to-base64-in-javascript				
					// example subject: =?utf-8?B?${convertToBase64(subject)}?=
					LOG.warn('subject is Chinese/Japanese, convert it..', l_name);
					msg.subject = '=?utf-8?B?' + new Buffer(msg.subject).toString('base64') + '?=';	
				}

				SR.API._gmailText({
					from:		msg.from,
					to:			msg.to,
					subject:	msg.subject, 
					body:		msg.text,
				}, onD)
			}		
		}		
		
		UTIL.safeCall(onDone, null);		
	}
			
	var loadSecret = function () {
		gmailSender.setClientSecretsFile(key_path);	

		// get accessToken if available
		if (SR.Settings.EMAIL_CONFIG.gmailAccessToken) {
			l_gmailAccessToken = SR.Settings.EMAIL_CONFIG.gmailAccessToken;
			return onAccessToken();
		}

		// generate accessToken
		var serverAuthCode = SR.Settings.EMAIL_CONFIG.gmailServerAuthCode;

		gmailApiSync.setClientSecretsFile(key_path);
		gmailApiSync.getNewAccesToken(serverAuthCode,function (err, token){
			if (err) {
				LOG.error(err, l_name);
				return onDone(err);
			} 

			l_gmailAccessToken = token;
			onAccessToken();
		});		
	}
	
	// load client_secret.json file
	var key_path = SR.path.resolve(SR.Settings.PROJECT_PATH, 'keys', 'client_secret.json');
	SR.fs.stat(key_path, function (err) {
		if (err) {
			key_path = SR.path.resolve(SR.Settings.SR_PATH, 'keys', 'client_secret.json');
			SR.fs.stat(key_path, function (err) {
				if (err) {
					LOG.error('cannot find client_secret.json under either project or scalra directory', l_name);
					return onDone('client_secret.json not found');
				}
				loadSecret();
			})	
		}
		loadSecret();
	});
}

// module shutdown
l_module.stop = function (onDone) {
	// close / release resources used
	UTIL.safeCall(onDone);	
}
