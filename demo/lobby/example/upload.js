//
// sample to download files previously uploaded
//

// a pool for all message handlers
var l_handlers = exports.handlers = {};
var l_checkers = exports.checkers = {};


l_checkers.SHOW_UPLOAD = function (data, session) {
	if (session.hasOwnProperty('_account') && typeof session['_account'] === 'string')
		return true;
	return false;
};

l_handlers.SHOW_UPLOAD = function (event) {
	var path = SR.Settings.FRONTIER_PATH + '/../upload/';
	
	SR.fs.readdir(path, function (err, files) {
		LOG.warn('files returned:');
		event.done({files: files});
	});
}


// download a particular file in the upload directory
l_checkers.DOWNLOAD = {
	filename:	'string'
};

l_handlers.DOWNLOAD = function (event) {
	
	var path = SR.Settings.FRONTIER_PATH + '/../upload/' + event.data.filename;
	LOG.warn('retriving path: ' + path);
	event.done("SR_RESOURCE", {address: path, 
							   header: {}
							  });
};