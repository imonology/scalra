
/*
    SR.Require
 
    to include user-provided 3rd party libraries

*/

// include user library
exports.lib = function (user, file) {
	//LOG.warn('lib path: ' + SR.Settings.PATH_LIB);
	var fullpath = SR.Settings.PATH_LIB + user + SR.Settings.SLASH + file;
	//LOG.warn('full path: ' + fullpath);
	return require(fullpath);
}

// include system extensions
exports.ext = function (file) {
	return require('../extension/' + file);
}