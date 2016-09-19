
/*
    SR.Require
 
    to include user-provided 3rd party libraries

*/

// include user library
exports.lib = function (user, file) {
	//LOG.warn('lib path: ' + SR.Settings.PATH_LIB);
	if (SR.Settings.hasOwnProperty('PATH_LIB') === false) {
		return undefined;
	}
	
	var fullpath = SR.path.join(SR.Settings.PATH_LIB, user, file);
	//LOG.warn('full path: ' + fullpath);
	return require(fullpath);
}

// include system extensions
exports.ext = function (file) {
	return require(SR.path.join('..', 'extension', file));
}