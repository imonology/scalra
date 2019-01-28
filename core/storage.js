//
//  storage.js
//
//  a generic abstraction layer to store files on distributed SR nodes, modelled after node's fs module
//
//  history:
//  	2015-05-09: first version & API definition
//
//  relies on:
//		SR.fs
//

// returns version number
exports.version = function () {
	return '0.1.0';
};

exports.unlink = function (path, callback) {
	return SR.fs.unlink(path, callback);	
};

exports.rename = function (oldPath, newPath, callback) {
	return SR.fs.rename(oldPath, newPath, callback);
};

// appendFile(filename, data[, options], callback)
exports.appendFile = function (filename, data, options, callback) {
	return SR.fs.appendFile(filename, data, options, callback);
};

//writeFile(filename, data[, options], callback)
exports.writeFile = function (filename, data, options, callback) {
	return SR.fs.writeFile(filename, data, options, callback);
};

exports.readdir = function (path, callback) {
	return SR.fs.readdir(path, callback);
};

exports.exists = function (path, callback) {
	return SR.fs.exists(path, callback);
};

exports.stat = function (path, callback) {
	return SR.fs.stat(path, callback);
};

// createReadStream(path[, options])
exports.createReadStream = function (path, options) {
	return SR.fs.createReadStream(path, options);
};


