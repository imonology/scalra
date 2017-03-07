//   
// log_manager.js - LOG related functions
//
//
// 2011-05-27 修正 nextTick 造成管線阻塞
// 2011-06-06 欲 log 的 pool (l_logBuffer) 另外再由一個 HASHTABLE 記錄各別欲 LOG 之內容
// 2011-06-07 closelog 可非同步執行
// 2011-07-20 更換 fifo queue algorithm (http://code.stephenmorley.org/javascript/queues/)
// 2011-08-08 fs.write 改用 fs.writeSync
//
var l_name = 'SR.Log';

//-----------------------------------------
// define local variables
//
//-----------------------------------------

// an adjustable limit for when log buffer is overload
var l_logBufferOverloadLimit = 500;

// all log files, indexed by LOGID
var l_logs = {};

// buffer storing pending log messages to write
var l_logBuffer = new SR.AdvQueue();

// record to keep track of messages still pending to be written to a given logID
var l_logBufferIdxByID = {};

var l_logLock = false;

// NOTE: by default we show & track unnamed callers ('default') 
var l_showList = ['default'];
var l_trackList = [];

// we have four error levels, each print/log a differen set
// 1: error
// 2: error + warning
// 3: error + warning + debug
// 4: error + warning + debug + sys
var l_error_level = SR.Settings.LOG_LEVEL;

//-----------------------------------------
// define local function
//
//-----------------------------------------

//-----------------------------------------
exports.createLog = function (path, filename, onSuccess, onFail) {

	if (l_logLock === true) {
		console.log(l_name + '::createLog::' + SR.Tags.ERR + 'l_logLock === true' + SR.Tags.ERREND);
		return;
	}

	var log_path = SR.path.join(path, filename);

	// ensure path exists (or create directory if not)
	UTIL.validatePath(path);

	LOG.sys(log_path, 'SR.LOG');
	SR.fs.open(log_path, 'a+', 0666,
		function (err, fd) {
			if (err) {
				console.log(l_name + '::createLog::' + SR.Tags.ERR + 'SR.fs.open() exception-' + err + SR.Tags.ERREND);
				onFail(undefined);
			} else {
				// create unique log id
				var log_id = UTIL.createUUID();

				l_logs[log_id] = {
					fd: fd,
					id: log_id,
					path: log_path,
					writing: false,
					tmpDay: '',
					closing: false,
					closed: false
				};
				onSuccess(log_id);
			}
		}
	);
}

//-----------------------------------------
// createLog (sync version)
// makes sure the function does return success or failure
exports.createLogSync = function (log_path) {

	if (l_logLock === true) {
		console.log(l_name + '::createLogSync::' + SR.Tags.ERR + 'l_logLock === true' + SR.Tags.ERREND);
		console.log(l_name + '::createLogSync::' + SR.Tags.ERR + 'logPath=' + log_path + SR.Tags.ERREND);
		return undefined;
	}

	console.log(l_name + '::createLogSync::create log=' + log_path);

	var pFD = undefined;
	try {
		pFD = SR.fs.openSync(log_path, 'a+', 0666);
	} catch (e) {
		console.log(l_name + '::createLogSync::' + SR.Tags.ERR + 'SR.fs.openSync() exception-' + e);
		return undefined;
	}

	var li = UTIL.createUUID();
	var logInst = {
		fd: pFD,
		id: li,
		path: log_path,
		writing: false,
		closing: false,
		closed: false
	};

	l_logs[li] = logInst;

	return li;
}

// local helper to store one log message (to be written later)
var l_logmsg = function (logInst) {

	var log_id = logInst.id;

	// create index to buffer map, if not exist
	if (l_logBufferIdxByID.hasOwnProperty(log_id) === false)
		l_logBufferIdxByID[log_id] = [];

	l_logBufferIdxByID[log_id].push(logInst);

	l_logBuffer.enqueue(logInst,

		// callback to write log
		function (tmpLog) {

			// show notice if queued log exceeds limit (once each time multiples of the limit is reached)
			if ((l_logBuffer.getLength() > 0) && (l_logBuffer.getLength() % l_logBufferOverloadLimit === 0)) {
				console.log(l_name + '::l_writeLog::' + SR.Tags.YELLOW + 'log len=' + l_logBuffer.getLength() + SR.Tags.ERREND);
			}

			// lock individual log instance            
			if (l_logs.hasOwnProperty(tmpLog.id) === true) {
				// if we're busy writing now, wait till next time
				if (l_logs[tmpLog.id].writing === true)
					return false;

				// lock the writing for this id
				l_logs[tmpLog.id].writing = true;

				SR.fs.writeSync(tmpLog.fd, tmpLog.msg, undefined, undefined);

				// remove a flag record from topmost
				if (l_logBufferIdxByID.hasOwnProperty(tmpLog.id) === true)
					l_logBufferIdxByID[tmpLog.id].shift();

				l_logs[tmpLog.id].writing = false;
			}

			// NOTE: processing will pause here if id doesn't exist in l_logs
			// TODO: right behavior?
			return true;
		}
	);
}

//-----------------------------------------
// store a message after some checks
// NOTE: 'log_id' is optional (if not provied then default sys log will be used)
var l_log = exports.log = function (msg, log_id) {

	// if log not yet created, simply ignore
	if (log_id === undefined)
		return;

	// don't log if locked
	if (l_logLock === true) {
		console.log(l_name + '::log::' + SR.Tags.ERR + 'l_logLock === true' + SR.Tags.ERREND);
		return;
	}

	// error if no log file is found
	if (l_logs.hasOwnProperty(log_id) === false) {
		console.log(l_name + '::log::' + SR.Tags.ERR + 'log_id=' + log_id + ' not found' + SR.Tags.ERREND);
		return;
	}

	// don't log if we're closing
	if (l_logs[log_id].closing === true) {
		console.log(l_name + '::log::' + SR.Tags.ERR + 'log_id=' + log_id + ' is closing...');
		return;
	}

	// replace next line with simply \n
	var tmpMsg = msg.toString().replace(/\r\n|\r/g, '\n'); // hack
	var tmpTime = new Date();

	// log date change if occurs
	var tmpCurrDay = tmpTime.getDate();
	if (tmpCurrDay !== l_logs[log_id].tmpDay) {

		l_logs[log_id].tmpDay = tmpCurrDay;

		var dayPrint = '-------------------------------------------------------------\r\n\0\r\n\0          ' + tmpTime.getFullYear().toString() + '-' + (tmpTime.getMonth() + 1).toString() + '-' + tmpTime.getDate().toString() + '\r\n\0\r\n\0';
		var logInst = {
			id: log_id,
			fd: l_logs[log_id].fd,
			msg: dayPrint.toString()
		};

		l_logmsg(logInst);
	}

	// log message
	tmpMsg = tmpMsg + '\r\n\0';

	var logInst = {
		id: log_id,
		fd: l_logs[log_id].fd,
		msg: tmpMsg.toString()
	};

	l_logmsg(logInst);
}

//-----------------------------------------
var l_checkEmptyPool = new SR.AdvQueue();

var l_closeLog = exports.closeLog = function (log_id, onDone) {

	// check if log doesn't exist or already closed
	if (l_logs.hasOwnProperty(log_id) === false)
		return onDone(log_id);

	// return if already closing        
	if (l_logs[log_id].closing === true) {
		console.log(l_name + '::l_closeLog::' + SR.Tags.ERR + 'l_logs[' + log_id + '] already closing');
		return;
	}

	// indicate closing in progress (to prevent double closing)
	l_logs[log_id].closing = true;

	// perform actual file close
	var closeLog = function () {

		SR.fs.close(l_logs[log_id].fd,
			function () {
				console.log(l_name + '::l_closeLog::' + SR.Tags.YELLOW + 'LogID=' + log_id + ' closed.' + SR.Tags.ERREND);
				delete l_logs[log_id];
				onDone(log_id);
			}
		);
	}

	// wait for all writing done...
	//console.log(l_name + '::l_closeLog::close log file (' + log_id + ')');

	l_checkEmptyPool.enqueue({
			id: log_id,
			onSuccess: closeLog
		},

		function (item) {

			// if nothing more to write, indicate 'done'
			if (l_logBufferIdxByID.hasOwnProperty(item.id) === false) {
				console.log(l_name + '::l_checkwritingDone::no log content for [' + item.id + '] found.');
				item.onSuccess();
				return true;
			}

			// if still busy writing and still things to write for this ID
			// check again later
			if (l_logs[item.id].writing === true ||
				l_logBufferIdxByID[item.id].length > 0) {

				// re-queue
				return false;
			}

			// if done, notify, but check queue again if there's more
			item.onSuccess();
			return true;
		}
	);
}

//-----------------------------------------
var l_doneStatus = {};


var l_checkDone = function (onDone) {

	var queue = new SR.AdvQueue();
	queue.enqueue({
			onDone: onDone
		},

		// item handler
		function (obj) {

			// check if any delete array item is not yet done
			if (Object.keys(l_doneStatus).length > 0) {

				for (var key in l_doneStatus) {
					if (l_doneStatus[key] === false)
						return false;
				}
			}

			obj.onDone();
			return true;
		}
	);
};

var l_onAllClosed = undefined;
var l_checkDoneBusy = false;
var l_checkLogClose = function () {
	for (var key in l_logs) {
		if (l_logs[key].closing === true) {
			setTimeout(l_checkLogClose, 100); //等待久些
			return;
		}
	}

	l_onAllClosed();
	l_checkDoneBusy = false;
}

// finish all existing logging and close log files
exports.disposeAllLogs = function (onSuccess) {

	//console.log(l_name + '::disposeAllLogs::dispose all log file...');

	// wait for current logs closing
	var waitClosing = function (onDone) {

		// refuse any write or log creation
		l_logLock = true;

		//console.log(l_name + '::disposeAllLogs::waitClosing...');
		console.log(l_name + '::disposeAllLogs::closing ' + Object.keys(l_logs).length + ' log files...');

		l_onAllClosed = onDone;

		if (l_checkDoneBusy === false) {
			l_checkDoneBusy = true;
			l_checkLogClose();
		}
	}

	var step0 = function (onDone) {
		//console.log(l_name + '::disposeAllLogs::step0...');

		if (Object.keys(l_logs).length === 0) 
			return onDone();
			
		l_doneStatus = {};

		for (var key in l_logs)
			l_doneStatus[key] = false;

		for (var key in l_logs) {
			l_closeLog(key,	function (rid) {
				l_doneStatus[rid] = true;
			});
		}

		// check if all logs are closed
		l_checkDone(onDone);
		
		console.log(l_name + '::disposeAllLogs::' + SR.Tags.YELLOW + 'queued messages num=' + l_logBuffer.getLength() + SR.Tags.ERREND);
	}

	var step1 =
		function (onDone) {
			l_logLock = false;
			onSuccess();
			onDone();
		}

	var jq = SR.JobQueue.createQueue();
	jq.add(waitClosing);
	jq.add(step0);
	jq.add(step1);
	jq.run(); 	
}

var l_output = function (level, msg, func, fid_array, colortag) {

	// if output message's error level is too high then don't show
	if (l_error_level < level)
		return;
	
	// by default nothing's shown or logged
	var to_show = false;
	var to_log = false;
	
	// print to screen conditions: 
	// 1. if caller's function name was previously specified via LOG.show()
	// 2. if 'all' is specified in function list
	// 3. if the message was not associated with a func name, but 'default' is specified
	// NOTE: default to show nothing
	if (l_showList.length > 0) {
		if (l_showList.indexOf(func) >= 0 ||
			l_showList.indexOf('all') >= 0 ||
			(!func && l_showList.indexOf('default') >= 0)) {
			to_show = true;	
		}
	}

	// write to specific-function log file (if specified)
	// conditions:
	// 1. if the func name is specified previously via LOG.track()
	// 2. if 'all' is specified
	// 3. if 'default' is specified and the message was not categorized
	if (l_trackList.length > 0) {
		if (l_trackList.indexOf(func) >= 0 ||
			l_trackList.indexOf('all') >= 0 ||
			(!func && l_showList.indexOf('default') >= 0)) {
			to_log = true;
		}
	}
	
	// NOTE: error is ALWAYS output to both screen & log files
	if (level === 1) {
		to_show = to_log = true;	
	}
	
	// do nothing is nothing should be shown or logged
	if (!to_show && !to_log)
		return;

	// convert msg & add color tags (if exist)
	msg = l_convert(msg);
	if (colortag)
		msg = colortag + msg + SR.Tags.ERREND;
	
	var curr = new Date();
	var term = func || ' ';
  if (typeof term === 'object')
    term = JSON.stringify(term);

	// generate output string
	var str = '-' + curr.getHours() + ':' + curr.getMinutes() + '-' + term + '::' + msg;
	
	// output to screen
	if (to_show)
		console.log(str);
	
	if (to_log) {
		// write function-specific log
		// if func is empty but we're recording all, use 'default' as func name
		func = func || 'default';
		
		// attach date to output string
		// TODO: merge with write to log below?
		msg = UTIL.getDateTimeString().substring(0, 8) + str + '\n';
		SR.fs.appendFile('./log/func_' + func + '.log', msg, function (err) {
			if (err) {
				console.error("LOG writes incorrectly.");
				console.error(err);
			}
		});
	}	

	// write general log
	for (var i = 0; i < fid_array.length; i++)
		l_log(str, fid_array[i]);		
}

// convert obj to msg
var l_convert = function (obj) {
	//return (typeof obj === 'object' ? JSON.stringify(obj, null, 4) : obj);
	return (typeof obj === 'object' ? SR.sys.inspect(obj) : obj);
}

// TODO: find a method to automatically determine caller
// ref: http://stackoverflow.com/questions/6715571/how-to-get-result-of-console-trace-as-string-in-javascript-with-chrome-or-fire
var l_logger = exports.logger = function (msg, caller) {

	// file handles
	var _fid_debug = undefined;
	var _fid_error = undefined;

	// specify error level
	this.setLevel = function (level) {
		l_error_level = level;
	}

	// get error level
	this.getLevel = function () {
		return l_error_level;
	}

	// store file handle for the log files
	this.setLogHandle = function (id, type) {
		if (type === 'error')
			_fid_error = id;
		else
			_fid_debug = id;
	}

	// output system-level debug message
	this.sys = function (msg, caller) {
		l_output(4, msg, caller, [_fid_debug]);
	}

	// output application-level debug message	
	this.debug = function (msg, caller) {
		l_output(3, msg, caller, [_fid_debug]);
	}

	// output warning messages
	this.warn = function (msg, caller) {
		l_output(2, msg, caller, [_fid_debug], SR.Tags.WARN);
	}

	// output error messages
	this.error = function (msg, caller) {
		l_output(1, msg, caller, [_fid_debug, _fid_error], SR.Tags.ERR);
	}

	// print stack trace of current execution
	this.stack = function () {
		var e = new Error('dummy');
		var stack = e.stack.replace(/^[^\(]+?[\n$]/gm, '')
			.replace(/^\s+at\s+/gm, '')
			.replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@')
			.split('\n');

		this.error(stack);
	}

	// print status of log system
	this.status = function (func) {
		console.log("LOG.status");
		console.log(l_showList);
		console.log(l_trackList);
	}

	// show specifical messages from a given function
	this.show = function (list) {
		if (typeof list === 'string')
			l_showList = l_showList.concat([list]);
		else if (Array.isArray(list)) {
			l_showList = l_showList.concat(list);
		}
	}

	// hide specifical messages from a given function
	this.hide = function (list) {

		// if no arguments, hide all
		if (!list) {
			l_showList = [];
			return;
		}

		// convert string to array form		
		if (typeof list === 'string')
			list = [list];

		if (!Array.isArray(list))
			return;

		// remove the ones given in func list from show list 'l_showList'
		for (var key in list) {
			var index = l_showList.indexOf(list[key]);
			if (index !== -1)
				l_showList.splice(index, 1);
		}
	}

	// start recording log to files		
	this.track = function (list) {
		if (typeof list === 'string')
			l_trackList = l_trackList.concat([list]);
		else if (list && Array.isArray(list)) {
			l_trackList = l_trackList.concat(list);
		}
	}

	// stop recording log to files
	this.untrack = function (list) {

		// if no arguments, hide all
		if (!list) {
			l_trackList = [];
			return;
		}

		// convert string to array form		
		if (typeof list === 'string')
			list = [list];

		if (!Array.isArray(list))
			return;

		// remove the ones given in func list from show list 'l_trackList'
		for (var key in list) {
			var index = l_trackList.indexOf(list[key]);
			if (index !== -1)
				l_trackList.splice(index, 1);
		}
	}

	// NOTE: depreciated usage
	// wrappers for backward compability
	this.enable_show = function (func) {
		return this.show(func);
	}

	this.disable_show = function (func) {
		return this.hide(func);
	}

	this.enable_logfile = function (func) {
		return this.track(func);
	}

	this.disable_logfile = function (func) {
		return this.untrack(func);
	}


	/*
		this.func = function (func, msg) {
			if (!func) return;
			switch (typeof(func)) {
				case 'string':
					switch (func) {
						case 'enable':
							_functionEnabled = true;
						break;
						case 'disable':
							_functionEnabled = false;
						break;
						default:
							if ( ! l_functionEnabled ) return;
							if (_showFunction && _showFunction.indexOf(func) >= 0) console.log(msg);
							var current_time = (new Date()).toString();
							msg = '\n# function log ---------------------- ' + current_time + '\n' + msg;
							SR.fs.appendFile('./log/function_' + func + '.log', msg, function (err) {
								if (err) {
									console.log("LOG writes incorrectly.");
									//process.exit(99);
									console.log(err);
								}
							});
						break;
					}
				break;
				case 'object':
					if (Array.isArray(func)) {
						_showFunction = func;
						console.log("The following LOG messages will be shown: ");
						console.log(_showFunction);
					}
				break;
				default:
				break;
			}
		}
		*/

	// perform event log
	this.event = function (type, data, onDone) {

		// record timestamp event to DB
		SR.DB.setData(SR.Settings.DB_NAME_SYS_EVENT, {
				type: type,
				time: new Date(),
				data: data
			},
			function () {
				LOG.sys('server event [' + type + '] record success', 'SR.LOG');
				UTIL.safeCall(onDone);
			},
			function () {
				LOG.error('server event [' + type + '] record fail', 'SR.LOG');
				UTIL.safeCall(onDone, 'server event [' + type + '] record fail');
			}
		);
	}

	// query event logs
	// condition: {
	//	type:	'string',
	//	start:	'ISODate',
	//	stop:	'ISODate'
	// }
	this.query = function (condition, onDone) {
		//console.log("in log_manager.js query: condition");
		//console.log(condition);

		// if no parameters are passed, assuming to query all
		if (typeof condition === 'function')
			onDone = condition;

		// keep everything, modify time range if neccessary
		// FIXME: Need a better way for DB obstraction.
		if (condition) {

			// range query by time
			// ref: http://stackoverflow.com/questions/2943222/find-objects-between-two-dates-mongodb
			// assuming condition.start or condition.stop are ISODate objects
			// NOTE: order for $gte & $lt may matter in Mongo 2.0.4
			// see: http://stackoverflow.com/questions/9895888/order-of-lt-and-gt-in-mongodb-range-query
			// NOTE: didn't see the ordering matters, though to be safe, use $lt first

			// use user input .time by default
			if ('undefined' === typeof condition.time) {
				var time = {};

				if (condition.start)
					time.$gt = condition.start;
				if (condition.end)
					time.$lt = condition.end;

				if (Object.keys(time).length > 0)
					condition.time = time;
			}

			delete condition.start;
			delete condition.end;


			// limit the number of records returned
			/*
			if (typeof condition.limit === 'number')
				query.limit = condition.limit;
			*/
		}

		LOG.sys('query: ', 'SR.LOG');
		LOG.sys(condition, 'SR.LOG');

		SR.DB.getArray(SR.Settings.DB_NAME_SYS_EVENT,
			function (result) {
				LOG.sys('query system event success', 'SR.LOG');
				UTIL.safeCall(onDone, result);
			},
			function (result) {
				LOG.error('query system event fail', 'SR.LOG');
				UTIL.safeCall(onDone);
			}, condition);
	}
}
