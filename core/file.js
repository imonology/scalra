/* cSpell:disable */
/* global SR, LOG, UTIL */
/*
//
//  file.js
//
//    basic file I/O
//

//
// supported functions
//

// open a given file, create if file does not exist (result notified by callback)
// 根據檔名開啟新檔案, 若不存在則會建立新檔 (透過 callback 傳結果)
//
// [I] str filename:     檔案名稱
// [O] obj onSuccess:    成功回傳
// [O] str onFail:       失敗錯誤訊息
// [I] bool to_cache:    是否要載入原檔案內容至記憶體
open(filename, onSuccess, onFail, to_cache)

// open a given file, create if file does not exist (result returned directly)
// 根據檔名開啟新檔案, 若不存在則會建立新檔 (結果直接回傳)
//
// [I] str filename:    檔案名稱
// [I] bool to_cache:   是否要載入原檔案內容至記憶體
openSync(filename, to_cache)

// close a given file (result returned by callback)
// 關閉目前所管之檔案 (透過 callback 傳結果)
//
// [O] obj onDone:    成功回傳
close(onDone)

// close a given file (result returned directly)
// 關閉目前所管之檔案 (結果直接回傳)
//
closeSync()

// return file content as string
// 以字串取得該檔案內容
//
// [R] str:              字串
getText()

// return a text array of current file content
// 取得該檔案內容的文字陣列
//
// [R] str[]:            文字陣列
getTextArray()

// write one line to file
// 寫入一無斷行字串
//
// [I] str line:        寫入之一行資料, 沒有用 '\n' 斷行
write(line)

// write one line to file with linebreak
// 寫入一有斷行字串
//
// [I] str line:        寫入之一行資料, 有用 '\n' 斷行
writeLine(line)

*/

var l_name = 'SR.File';
var that;

var icFile = exports.icFile = function (filename, onDone, to_cache) {

	// file description
	// NOTE: declare here will make it unaccessible by using 'this' if called within a callback

	// file descriptor (as public variable)
	this.fd = undefined;

	// text content as a string
	this.data = '';

	// array to store current text content
	this.textArray = [];

	// most recently written line
	this.textLine = '';

	that = this;

	if (filename) {
		this.open(filename, onDone, to_cache);
	}
};

// open new file
icFile.prototype.open = function (filename, onDone, to_cache, direct_path) {

	// check if file already exists
	// TODO: make async?
	//var logpath = direct_path || SR.path.resolve(SR.Settings.FRONTIER_PATH, '..');
	var logpath = direct_path || SR.Settings.LOG_PATH;
	UTIL.validatePath(logpath);

	var filepath = SR.path.resolve(logpath, filename);
	LOG.warn('filepath to open: ' + filepath, l_name);
	that.filepath = filepath;

	var file_exist = SR.fs.existsSync(filepath);

	SR.fs.open(filepath, 'a+', (err, fd) => {

		// print error message and return failure
		if (err) {
			console.log(SR.Tags.ERR + 'SR.fs.open() exception-' + err + SR.Tags.ERREND);
			UTIL.safeCall(onDone, 'cannot open');
			return;
		}

		// store file descriptor and notify success
		that.fd = fd;
		LOG.warn('open file success, fd: ' + that.fd, l_name);

		//console.log(SR.Tags.WARN + 'SR.fs.open() success, fd: ' + fd + SR.Tags.ERREND);

		// check whether to load existing file content to cache
		if (to_cache !== true) {
			UTIL.safeCall(onDone, null, file_exist);
			return;
		}

		SR.fs.readFile(filepath, 'utf8', (err, data) => {
			if (err) {
				UTIL.safeCall(onDone, err);
				return;
			}

			// store a copy
			that.data = data;

			// convert to text array
			var line = '';
			for (var i=0; i < data.length; i++) {

				// line break, store to next line
				if (data[i] === '\n') {
					that.textArray.push(line);
					line = '';
				}	else {
					line += data[i];
				}
			}

			// store last line
			if (line !== '') {
				that.textArray.push(line);
			}

			// return success
			UTIL.safeCall(onDone, null, file_exist);
		});
	});
};

// FIXME: doesn't work in the original version
// open new file (result returned directly)
// returns: true  (file exists & success)
//          false (file not exist & success)
//          null  (file open fail)
icFile.prototype.openSync = function (filename, to_cache) {

	//var path = SR.path.join(SR.Settings.FRONTIER_PATH, '..', 'log');
	// validate directory
	//UTIL.validatePath(path);

	// check if file already exists
	var filepath = SR.path.join(SR.Settings.LOG_PATH, filename);

	//LOG.warn('filepath:  ' + filepath);
	var file_exist = SR.fs.existsSync(filepath);

	// get file descriptor
	var fd = undefined;
	try {
		fd = SR.fs.openSync(filepath, 'a+', 0o666);
	} catch (e) {
		console.log(SR.Tags.ERR + 'SR.fs.openSync() exception-' + e + SR.Tags.ERREND);
		return null;
	}

	// print error message and return failure
	if (fd === undefined || fd === null) {
		console.log(SR.Tags.ERR + 'SR.fs.openSync() exception-' + SR.Tags.ERREND);
		return null;
	}

	LOG.error('openSync fd: ' + fd, l_name);
	// store file descriptor and notify success
	this.fd = fd;

	//console.log(SR.Tags.WARN + 'SR.fs.openSync() success, fd: ' + fd + SR.Tags.ERREND);

	// check whether to load existing file content to cache
	if (to_cache === true) {
		this.data = SR.fs.readFileSync(filepath, 'utf8');

		if (this.data === undefined || this.data === null) {
			return null;
		}

		// convert to text array
		var line = '';
		for (var i=0; i < this.data.length; i++) {

			// line break, store to next line
			if (this.data[i] === '\n') {
				this.textArray.push(line);
				line = '';
			} else {
				line += this.data[i];
			}
		}

		// store last line
		if (line !== '') {
			this.textArray.push(line);
		}
	}
	return (file_exist ? true : false);
};

icFile.prototype.getText = function () {
	return this.data;
};

// get an array of the texts in the current file
icFile.prototype.getTextArray = function () {
	return this.textArray;
};

icFile.prototype.write = function (str) {

	if (typeof this.fd === 'undefined') {
		//LOG.stack();
		return console.log(SR.Tags.ERR + 'SR.File.write fd not found for: ' + this.filepath + SR.Tags.ERREND);
	}

	SR.fs.writeSync(this.fd, str);

	// append to text str
	this.data += str;

	// store to cache
	this.textLine += str;
};

icFile.prototype.writeLine = function (str) {

	if (typeof this.fd === 'undefined') {
		//LOG.stack();
		return console.log(SR.Tags.ERR + 'SR.fs.writeLine() fd not found for: ' + this.filepath + SR.Tags.ERREND);
	}

	SR.fs.writeSync(this.fd, str + '\n');

	this.data += (str + '\n');

	// store to cache array
	this.textLine += str;
	this.textArray.push(this.textLine);

	// clear line
	this.textLine = '';
};

// close current file
icFile.prototype.close = function (onDone) {

	LOG.error('fd: ' + this.fd, 'File.close');

	if (this.fd === undefined) {
		console.log(SR.Tags.ERR + 'SR.fs.close(): file not opened' + SR.Tags.ERREND);
		return UTIL.safeCall(onDone, false);
	}

	SR.fs.close(this.fd, () => {

		// NOTE: we need to use prototype way to access 'fd'
		LOG.error('fd will be closed: ' + that.fd);
		that.fd = undefined;

		//console.log(SR.Tags.WARN + 'SR.fs.close(): file close success' + SR.Tags.ERREND);
		return UTIL.safeCall(onDone, true);
	});
};

// close current file (directly)
icFile.prototype.closeSync = function () {

	if (this.fd === undefined) {
		console.log(SR.Tags.ERR + 'SR.fs.closeSync(): file not opened' + SR.Tags.ERREND);
		return false;
	}

	LOG.error('fd: ' + this.fd, 'File.closeSync');

	var result = SR.fs.closeSync(this.fd);
	this.fd = undefined;

	return result;
};
