// a pool for all message handlers
var l_handlers = exports.handlers = {};
var l_checkers = exports.checkers = {};


// configurable current version number
var l_currVersion = 7;

l_handlers.UPDATE_FILE = function (event) {

	if (event.data.ver < l_currVersion) {
		LOG.warn('version is old, update file...');
		// TODO: load data from some place (file or DB)
		var file = {name: 'somepic.jpg', data: ''};
		event.done('UPDATE_FILE_R', {result: true, file: file});
	}
	else {
		LOG.warn('file is most updated');
		event.done('UPDATE_FILE_R', {result: false});
	}
}
