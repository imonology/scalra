/*
	SMS module - send SMS via supported 3rd party providers
	
	supported service:


	Install:
		none
		
	Usage:
		
	to load (in project's "lobby/frontier.js")	
		modules: {
			'SMS': {provider: '<VENDOR_NAME>'}		// ex. PROVIDER_NAME can be ["twilio", "mitake", "kotsms"]
		}	
	
	to send:
		SR.API['SEND_SMS']({
			message: <CONTENT>, 
			targets: <TARGET_NUMBER>,
			vendor: <VENDOR>
		}, function (err, response) {
			if (err) {
				LOG.error(err);
				return;
			}
		});
*/

//
//	history:
//		2020-03-16	first version
//
//	authors:
//		Shun-Yun Hu (syhu@imonology.com)

'use strict';

// module object
var l_module = exports.module = {};
var l_name = 'Module.SMS';

// library to access 3rd party providers
var l_lib = {};
var l_provider = undefined;

// lib to send request to SMS API servers
const request = require('request');
const https = require('https');
//var iconv = require('iconv');


// SMS send for Mitake (Taiwan) SMS Service
const axios = require('axios');


// to support Object.fromEntrie
// see: https://stackoverflow.com/questions/43858714/typeerror-object-entries-is-not-a-function
if (!Object.fromEntries) {
   Object.fromEntries = function( obj ){
      var ownProps = Object.keys( obj ),
         i = ownProps.length,
         resArray = new Array(i); // preallocate the Array

      while (i--)
         resArray[i] = [ownProps[i], obj[ownProps[i]]];
      return resArray;
   };	
}


const _sendMitakeSMS = function(mobile, text) {
	return new Promise((resolve, reject) => {

		let apiURL = 'http://smsapi.mitake.com.tw/api/mtk/SmSend?';
		let username = l_lib['mitake'].config.username;
		let password = l_lib['mitake'].config.password;
		let dstaddr = mobile;
		let smbody = text;
		let CharsetURL = 'UTF8';
		let params = { username, password, dstaddr, CharsetURL, smbody };
		let requestURL = apiURL;
		requestURL += Object.keys(params).map(key => key + '=' + params[key]).join('&');
		return axios.get(requestURL)
			.then(response => {
			
				//LOG.warn('response:');
				//LOG.warn(response);
						
				if (response.hasOwnProperty('data') === false || typeof response.data !== 'string') {
					LOG.error('no data sent as SMS result', l_name);
					return resolve()
				}
			
				LOG.warn('response:');
				LOG.warn(response);
			
				// API doc: https://sms.mitake.com.tw/common/index.jsp?t=1571898741106
				// statuscode:
				// 0 預約傳送中
				// 1 已送達業者
				// 2 已送達業者
				// 4 已送達⼿機
				let results = Object.fromEntries(response.data.split('\r\n')
					.filter(k=>k.includes('='))
					.map(e=>e.split('=')));
				LOG.error(results);
			
				//let results = {statusCode: response.statusCode, statusMessage: response.statusMessage};
				//LOG.warn(results);
			
				return resolve(results);
			})
			.catch(error => {
				LOG.error(error);
				return reject(error);
			});
	});
};


//-----------------------------------------
// API definitions
//
//-----------------------------------------

// sample event
SR.API.add('SEND_SMS', {
	from:		'+string',
	message:	'+string',
	targets:	'+string',
	vendor:		'+string'
}, function (args, onDone, extra) {
	    
	// TODO: verify correctness
	if (!args.targets) {
		return onDone('No SMS Targets specified!');
	}
	
	if (!args.message) {
		return onDone('No SMS message specified!');
	}
			
	var msg = encodeURIComponent(args.message);
	
	// time to send the SMS
	let now = Math.floor(Date.now() / 1000).toString();	
	
	// set default vendor if not specified
	if (typeof args.vendor === undefined) {
		args.vendor = l_provider;
	}
	
	// check if config exists
	if (l_lib.hasOwnProperty(args.vendor) === false) {
		return onDone('No config for SMS vencor [' + args.vendor + ']');		
	}
	
	// print some message
	LOG.warn('SEND_SMS has been called', l_name);
	LOG.warn('args:', l_name);
	LOG.warn(args, l_name);
		
	switch (args.vendor) {
		case 'twilio':
			// Send message using callback
			l_twilio.messages.create({
			  from: args.from,
			  to: args.targets,
			  body: args.message
			}, function(err, result) {
				if (err) {
					LOG.error(err);
					return onDone(err);
				}

				LOG.warn('Created message using callback', l_name);
				LOG.warn(result, l_name);

				// send back response
				onDone(err, result);		
			});			
			break;
		
		case 'kotsms':

			var kotsms = l_lib[l_provider].config; 
							
			// Convert from js string to an encoded buffer.
			//const iconv = require('iconv-lite');
			//var buf = iconv.encode(msg, 'big5');
			
			// real-time send
			var url = 'https://api2.kotsms.com.tw/kotsmsapi-1.php?username=' +
				kotsms.username + '&password=' + kotsms.password + '&dstaddr=' +
				args.targets + '&smbody=' +
				encodeURIComponent(msg);

			LOG.warn('URL to rerquest:');
			LOG.warn(url);

			request.get({
				uri:url,
				//encoding: null
			}, function(err, resp, body){
				if (err) { 
					LOG.error(err);
					return onDone(err);
				}
				LOG.warn(body.url);
				LOG.warn(body.explanation);

				var bodyWithCorrectEncoding = iconv.decode(body, 'iso-8859-1');
				console.log(bodyWithCorrectEncoding);
				onDone(null, "request success");		
			});			
			break;
		
		case 'mitake':
			_sendMitakeSMS(args.targets, msg)
				.then(response => {
					return onDone(null, {target: args.targets, time: now, response});										
				});
		
			break;
		
		default:
			var err = 'unsupported SMS vendor: ' + args.vendor;
			LOG.error(err, l_name);
			return onDone(err);		
	}
		
});




//-----------------------------------------
// Server Event Handling
//
//-----------------------------------------

// module init
l_module.start = function (config, onDone) {
		
	// process config & verify correctness here
	if (SR.Settings.Project.hasOwnProperty('SMS_CONFIG') === false ||
		SR.Settings.Project.SMS_CONFIG.hasOwnProperty(config.provider) === false) {
		LOG.error('SMS provider [' + config.provider + ' setting cannot be found, cannot initialize!', l_name);
		return UTIL.safeCall(onDone);
	}
	
	// store default provider, if any
	l_provider = config.provider;
	
	LOG.warn('loading support for SMS provider [' + l_provider + ']...', l_name);
	l_lib[l_provider] = {
		config: SR.Settings.Project.SMS_CONFIG[l_provider]
	};
		
	// perform vendor-specific init
	switch (l_provider) {
		case 'twilio': {
			
			// twilio SMS
			var Twilio = require('twilio'); 

			var accountSid = l_lib[l_provider]['TWILIO_ACCOUNT_SID']; 
			var token = l_lib[l_provider]['TWILIO_AUTH_TOKEN'];

			// Uncomment the following line to specify a custom CA bundle for HTTPS requests:
			// process.env.TWILIO_CA_BUNDLE = '/path/to/cert.pem';
			// You can also set this as a regular environment variable outside of the code

			l_twilio = new Twilio(accountSid, token);

			// Callback as first parameter
			l_twilio.calls.each(function(call) {
				LOG.warn('twilio callback: ', l_name);
				LOG.warn(call.sid, l_name);
			});
		}
		break;			
	}
	
	UTIL.safeCall(onDone);
}

// module shutdown
l_module.stop = function (onDone) {
	// close / release resources used
	UTIL.safeCall(onDone);	
}
