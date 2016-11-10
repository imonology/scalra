//
//  chat.js
//
//	a simple chatroom handler
//

// a pool for all message handlers
var l_handlers = exports.handlers = {};
var l_checkers = exports.checkers = {};

//-----------------------------------------
// define handlers (format checkers and event handlers)
//
//-----------------------------------------


// mass mail event (format)
/*
{
   from:    "you <username@gmail.com>",  
   list:    "someone <someone@gmail.com>, another <another@gmail.com>",
   cc:      "else <else@gmail.com>",
   bcc:		"else else <elseelse@gmail>",
   subject: "testing emailjs",
   text:    "i hope this works",    
   to:      "official receiver <official@gmail.com>"
   size:		20,						// number of mails to send at a time
   interval:	1,						// how many seconds between each send
   type:	'html'
}
*/
l_checkers.SR_MASS_MAIL = {
	from: 		'string',
	list:		'string',
	subject: 	'string',
	text:		'string',
};

l_handlers.SR_MASS_MAIL = function (event) {
    
	// print some message
	LOG.debug('SR_MASS_MAIL called');
	LOG.warn(event.data);	
	
	var timeout = event.data.interval || 0;
	if (typeof timeout === 'string')
		timeout = parseInt(timeout);

	// how many to send at once
	var size = event.data.size || 0;
	if (typeof size === 'string')
		size = parseInt(size);	

	// divide workload into array
	var receivers = event.data.list.split(',');
	var total = receivers.length;
	
	LOG.warn('prepare to send mass mail to ' + total + ' receivers, ' + size + ' mails at once, every: ' + timeout + ' seconds');
	
	var data = UTIL.clone(event.data);
	delete data.list;
	delete data.size;
	delete data.interval;
	
	var list = [];
	var send_once = function () {
			
		LOG.warn('size: ' + size + ' receiver length: ' + receivers.length, 'send_once');
		// if interval or size not specified, send all
		if (timeout === 0 || size === 0)
			list = receivers;
		else {
			var curr_size = (size >= receivers.length ? receivers.length : size);
			list = receivers.slice(0, curr_size);
			receivers = receivers.slice(curr_size, receivers.length);
			
			LOG.warn('list this time: ' + list.length + ' receivers left: ' + receivers.length);
		}
		
		var curr_receivers = list.toString();
		LOG.warn('receiver this time: ' + curr_receivers);
		data.bcc = curr_receivers;

		// send mail and respond accordingly
		UTIL.emailText(data, 
						function (msg) {
							LOG.warn('send mail success: ' + msg);	
						}, 
						function (msg) {
							LOG.warn('send mail fail: ' + msg);
						});		
		
		// check if more to send
		if (receivers.length === 0) {
			LOG.warn('finish sending all mails to ' + total + ' receivers');
			return;
		}
		else
			setTimeout(send_once, timeout * 1000);		
	};
	
	send_once();
	event.done('SR_MASS_MAIL_REPLY', {result: true, msg: 'prepare to send to ' + total + ' receivers'});
}

/*
// set the upper limit of the message queue's size
l_checkers.SR_SYS_QUERY_SERVER = {
    server:   'string'
};

l_handlers.SR_SYS_QUERY_SERVER = function (event) {
	LOG.warn('SR_SYS_QUERY_SERVER called');
	
  	var server_name = event.data.server;

	SR.AppHandler.queryAppServer(server_name, function (ip_port) {
		LOG.sys('server_name to lookup: ' + server_name + ' respond with IPport: ' + ip_port);	
	    event.done('SRR_SYS_QUERY_SERVER', {server: server_name, IPport: ip_port});
	});
}
*/

//-----------------------------------------
// Callback Events
//
//-----------------------------------------
/*
// do something when a user disconnects
SR.Callback.onDisconnect(function (conn) {
	
});
*/
