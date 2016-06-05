// a pool for all message handlers
var l_handlers = exports.handlers = {};
var l_checkers = exports.checkers = {};

// register serial checkers
SR.RPC.registerSerialChecker(function (serial) {
	
	LOG.warn('custom checking: ' + serial);
	
	// just check if it's a string
	if (typeof serial === 'string')
		return true;
	return false;
});
