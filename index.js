/* cSpell:disable */
/* global SR, LOG, UTIL */

module.exports = function (version) {

	// check if Scalra is already loaded and provide warning
	if (typeof SR !== 'undefined') {
		LOG.error('Scalra version [' + SR.version + '] already loaded...please avoid double-loading');
		LOG.stack();
		return;
	}

	var fs = require('fs');
	var ver = version || 'curr';

	console.log('execution mode: ' + ver);

	// NOTE: starting from 0.0.5.0, global.js is not under /common
	var path = __dirname + '/' + ver + '/common/global.js';
	//console.log('path: ' + path);

	if (fs.existsSync(path) === false) {
		path = './' + ver + '/global.js';
		if (fs.existsSync(path) === false) {
			path = './global.js';
		}
	}
	require(path);

	// record path to main server (frontier) file
	// ref: http://stackoverflow.com/questions/13227489/how-can-one-get-the-file-path-of-the-caller-function-in-node-js
	var dir = require('path').parse(module.parent.filename).dir;
	//console.log('dir of caller: ' + dir);
	SR.FRONTIER_PATH = dir;
};
