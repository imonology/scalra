// a pool for all message handlers
var l_handlers = exports.handlers = {};
var l_checkers = exports.checkers = {};

//-----------------------------------------
// define handlers (format checkers and event handlers)
//
//-----------------------------------------

l_handlers.VERIFY_EMAIL = function (event) {

	var email = event.data.email;
	
	if (typeof email === 'undefined')
		return event.done('VERIFY_EMAIL_R', {error: 'no email specified'});
	
	var url = SR.Notify.getVerifyURL(
		{successURL: 'http://src.scalra.com:8080/test/demo/lobby/web/token_success.html',
		 failURL: 'http://src.scalra.com:8080/test/demo/lobby/web/token_fail.html',
		 invalidURL: 'http://src.scalra.com:8080/test/demo/lobby/web/token_invalid.html',
		}, 
		{
			onetime: true,
			timeout: 1
		},
		function (result) {
			// mark verified...
			LOG.warn('verify URL click result: ');
			LOG.warn(result);
		}		
	);
	
	UTIL.emailText({	to: email,
						  	type: 'html',
							subject: 'Verify Your E-mail',
						  	text: 	 'To verify, please click: <a href="' + url + '">' + url + '</a>'});

	event.done('VERIFY_EMAIL_R', {url: url});
}
