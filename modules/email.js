/*
	email module - send mails via supported 3rd party email providers
	
	supported service:
		SendGrid (https://sendgrid.com)	doc: https://app.sendgrid.com/guide/integrate/langs/nodejs

	Install:
		SendGrid
		npm install --save @sendgrid/mail

	Usage:
		
	to load (in project's "lobby/frontier.js")	
		modules: {
			'email': {provider: '<PROVIDER_NAME>'}		// ex. PROVIDER_NAME can be a string such as "SendGrid"
		}	
	
	to send:
		UTIL.emailText({
			to: 		'<RECEIVER_ADDRESS>',
			from:		'<SENDER_EMAIL>',
			subject:	'<EMAIL_SUBJECT>',
			text:		'<EMAIL_CONTENT>'
		});
*/

//
//	history:
//		2020-03-09	first version
//
//	authors:
//		Shun-Yun Hu (syhu@imonology.com)

// module object
var l_module = exports.module = {};
var l_name = 'Module.email';

// library to access 3rd party email providers
var l_lib = {};
var l_provider = undefined;

//-----------------------------------------
// API definitions
//
//-----------------------------------------

SR.API.add('_emailText', {
	from:		'string',
	to:			'string',
	subject:	'string',
	text:		'+string',
	html:		'+string'
}, function (args, onDone) {

	// process config & verify correctness here
	if (!l_provider || l_lib.hasOwnProperty(l_provider) === 'undefined') {
		LOG.error('email provider [' + l_provider + '] setting cannot be found, cannot send email!', l_name);
		return onDone();
	}
	
	// fill in default sender
	if (typeof args.from === 'undefined') {
		LOG.warn(SR.Settings, l_name);
		args.from = SR.Settings.Project.adminMail;
		LOG.warn('default from: ' + args.from, l_name);
	}
	
	LOG.warn('sending to [' + l_provider + ']...', l_name);
	LOG.warn(args, l_name);
	
	l_lib[l_provider].send(args, onDone);
})


//-----------------------------------------
// Server Event Handling
//
//-----------------------------------------

// module init
l_module.start = function (config, onDone) {
		
	// process config & verify correctness here
	if (typeof SR.Settings.EMAIL_CONFIG.hasOwnProperty(config.provider) === 'undefined') {
		LOG.error('email provider [' + config.provider + ' setting cannot be found, cannot initialize!', l_name);
		return onDone();
	}
	
	l_provider = config.provider;
	
	LOG.warn('loading support for email provider [' + l_provider + ']...', l_name);
	l_lib[l_provider] = {
		config: SR.Settings.EMAIL_CONFIG[l_provider]
	};
	
	//LOG.warn(l_lib);
	
	// load email client library
	switch (l_provider) {
		case 'SendGrid': {
			// using Twilio SendGrid's v3 Node.js Library
			// https://github.com/sendgrid/sendgrid-nodejs
			const sgMail = require('@sendgrid/mail');
			LOG.warn('setting SendGrid API key: ' + l_lib[l_provider].config.SENDGRID_API_KEY, l_name);
			sgMail.setApiKey(l_lib[l_provider].config.SENDGRID_API_KEY);
			
			/* will produce error
			sgMail.send({
					to: 'dev@imonology.com',
					from: 'test@example.com',
					subject: 'SendGrid initialized for ImonCloud',
					text: 'and easy to do anywhere, even with Node.js',
					html: '<strong>and easy to do anywhere, even with Node.js</strong>'			
			}, function (e) {
				if (e) {
					LOG.error(e, l_name);	
				}
			});
			*/
			
			l_lib[l_provider].send = function (msg, onSendDone) {
				sgMail.send(msg, onSendDone);
			};
		}
		break;
			
		case 'gmail': {

			l_lib[l_provider].send = function (msg, onSendDone) {
				SR.API._gmailText({
					from:		msg.from,
					to:			msg.to,
					subject:	msg.subject, 
					body:		msg.text,
				}, onSendDone)				
			}
		}
		break;
			
		default: 
			LOG.error('email provider [' + l_provider + '] not supported', l_name);
			break;
	}
			
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

		SR.API._emailText({
			from:		msg.from,
			to:			msg.to,
			subject:	msg.subject, 
			text:		msg.text,
			html:		msg.html,			
		}, onD)
	}
	
	UTIL.safeCall(onDone, null);
}

// module shutdown
l_module.stop = function (onDone) {
	// close / release resources used
	UTIL.safeCall(onDone);	
}
