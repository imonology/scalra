/* cSpell:disable */
/* global SR, LOG, UTIL */

var net = require('net');
var util = require('util');
var uuid = require('./uuid');

//
// basic function overloads
//

// method: to add an additional method to a function
Function.prototype.method = function(name, func) {
	if (!this.prototype[name]) {this.prototype[name] = func;}
	return this;
};

// add the 'curry' method,
Function.method('curry', function() {
	var slice = Array.prototype.slice,
					args = slice.apply(arguments),
					that = this;

	// use 'that' to refer to 'this' outside of the return function
	return function() {
		return that.apply(null, args.concat(slice.apply(arguments)));
	};
});

// allow string to check if it begins with something
// ref: http://stackoverflow.com/questions/1767246/javascript-check-if-string-begins-with-something
String.prototype.startsWith = function(needle) {
	return (this.indexOf(needle) == 0);
};

// ref: http://stackoverflow.com/questions/280634/endswith-in-javascript
String.prototype.endsWith = function(suffix) {
	return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

// beget
if (typeof Object.beget !== 'function') {
	Object.beget = function(p) {
		var F = function() {};
		F.prototype = p;
		return new F();
	};
}

/*
// replicate a object
var clone = exports.clone = function (src)
{
    if (typeof src !== 'object' || src === null)
        return src;
    var inst = src.constructor();

    for (var i in src)
        inst[i] = clone(src[i]);
    return inst;
}

// replicate a object
// ref: http://stackoverflow.com/questions/6089058/nodejs-how-to-clone-a-object
var clone = exports.clone = function (src) {
	return JSON.parse(JSON.stringify(src));
}
*/

var extend = require('util')._extend;

// ref: http://stackoverflow.com/questions/5055746/cloning-an-object-in-node-js
var clone = exports.clone = function(src) {
	var obj2 = extend({}, src);
	return obj2;
};

// queue
function FoldArrayRev(chunkSize) {
	this._chunkSize = chunkSize || 1000;
	this._data = [
		[]
	];
	this._tail = 0;
	this._counter = 0;
}

FoldArrayRev.prototype = {
	push: function(item) {
		if (!this._data[0]) {
			this._data = [
				[]
			];
			this._tail = 0;
			return undefined;
		}
		if (this._data[this._tail].length >= this._chunkSize) {
			this._data[this._tail] = this._data[this._tail].reverse();
			this._data.push([]);
			this._tail++;
		}
		this._counter++;
		this._data[this._tail].push(item);
	},
	shift: function() {
		if (!this._data[0]) {
			this._data = [
				[]
			];
			this._tail = 0;
			return undefined;
		}
		var retVal = (this._data.length > 1) ? this._data[0].pop() : this._data[0].shift();
		if (this._data[0].length < 1) {
			this._data.shift();
			this._tail--;
		}
		this._counter--;
		return (retVal);
	},
	count: function() {
		return this._counter;
	},
	dump: function() {
		console.log(this._chunkSize);
	}
};

var AQueue = exports.AQueue = function() {
	return new FoldArrayRev(arguments[0]);
};

// integer
Number.method('integer', function() {
	return Math[this < 0 ? 'ceiling' : 'floor'](this);
});

// string trim
String.method('trim', function() {
	return this.replace(/^\s+|\s+$/g, '');
});

// Date
Date.prototype.diff = function(tar, type) {
	if (!type) {type = 'd';}
	var tmEnd = new Date(tar);
	if (isNaN(tmEnd)) {return undefined;}
	switch (type) {
	case 'ms':
		return parseInt(tmEnd - this);
	case 's':
		return parseInt((tmEnd - this) / 1000);
	case 'n':
		return parseInt((tmEnd - this) / 60000);
	case 'h':
		return parseInt((tmEnd - this) / 3600000);
	case 'd':
		return parseInt((tmEnd - this) / 86400000);
	case 'w':
		return parseInt((tmEnd - this) / (86400000 * 7));
	case 'm':
		return (tmEnd.getMonth() + 1) + ((tmEnd.getFullYear() - this.getFullYear()) * 12) - (this.getMonth() + 1);
	case 'y':
		return tmEnd.getFullYear() - this.getFullYear();
	}
};

// arguments:
// 0: file
// 1: message
// 2: method

var Say = exports.Say = function() {

	var l_currDate = new Date();
	var term = (arguments[2]) ? arguments[2] : ' ';

	var str = '-' + l_currDate.getHours() + ':'
		+ l_currDate.getMinutes() + '-'
		+ arguments[0] + '::' + term + '::' + arguments[1];

	// print to screen
	console.log(str);

	// TODO: not clean
	var l_logManager = require('./log_manager');

	// write to log
	l_logManager.log(undefined, str.toString());
};

var See = exports.See = function() {
	var term = (arguments[2]) ? arguments[2] : ' ';
	console.log(arguments[0] + '>>' + term + '>>' + util.inspect(arguments[1], true, 2));
};

/*
var Sej = exports.Sej =  function (){
  var term = (arguments[2])? arguments[2]: ' ';
  console.log(arguments[0]+'--'+term+'--'+JSON.stringify(arguments[1]));
};
*/

/* Python(ish) string formatting:
 * >>> format('{0}', ['zzz'])
 * "zzz"
 * >>> format('{x}', {x: 1})
 * "1"
 */
function format(s, args) {
	var re = /\{([^}]+)\}/g;
	return s.replace(re, (_, match) => {
		return args[match];
	});
}

var rand = exports.rand = function() {
	var f = (arguments[1]) ? arguments[0] : 0;
	var t = (arguments[1]) ? arguments[1] : arguments[0];
	return Math.floor((Math.random() * (t - f)) + f);
};

var event = exports.event = function(code, data) {
	var packet = {};
	packet[SR.Tags.EVENT] = code;
	packet[SR.Tags.PARA] = data;
	return packet;
};

var update = exports.update = function(code, data) {
	var packet = {};
	packet[SR.Tags.UPDATE] = code;
	packet[SR.Tags.PARA] = data;
	return packet;
};

var rt = exports.rt = function(code, data) {
	return {
		'rt': code,
		'data': data
	};
};
var ex = exports.ex = function(code, data) {
	return {
		'ex': code,
		'ref': data
	};
};
var mj = exports.mj = function(code, data) {
	return {
		'mj': code,
		'ref': data
	};
};
var um = exports.um = function(code, data) {
	return {
		'um': code,
		'data': data
	};
};
var im = exports.im = function(code, data) {
	return {
		'im': code,
		'data': data
	};
};

var ocm = exports.ocm = function(code, data) {
	return {
		'ocm': code,
		'ref': data
	};
};
var icm = exports.icm = function(code, data) {
	return {
		'icm': code,
		'ref': data
	};
};

var State = exports.State = function() {
	var _state = 0;
	var _tmborn = new Date();
	var _tmlast = new Date();

	return {
		tmborn: function() {
			return _tmborn;
		},
		get: function() {
			return _state;
		},
		set: function() {
			_state = arguments[0];
		},
		idle: function() {
			return (new Date()) - _tmlast;
		},
		poke: function() {
			_tmlast = new Date();
		}
	};
};

var EventedObject = exports.EventedObject = function() {
	var _u = {};
	_u.on = function(tag, func) {
		_u[tag] = func;
	};
	return _u;
};

var ev = exports.ev = function(type, data, cb) {
	return {
		'type': type,
		'data': data,
		'cb': cb
	};
};

var eventuality = exports.eventuality = function(that) {
	var reg = {};
	that = that || {};

	that.proc = function(event) {
		var array;
		var func;
		var handler;
		var type = typeof event === 'string' ? event : event.type;

		if (reg.hasOwnProperty(type)) {
			array = reg[type];
			for (var i = 0; i < array.length; ++i) {
				handler = array[i];

				func = handler.method;
				if (typeof func === 'string') {func = this[func];}

				func.apply(this, handler.param || [event]);
			}
		}
		return this;
	};

	that.on = function(type, method, param) {
		var handler = {
			'method': method,
			'param': param
		};

		if (reg.hasOwnProperty(type)) {reg[type].push(handler);} else {reg[type] = [handler];}

		return this;
	};

	return that;
};

var send = exports.send = function() {
	var socket = arguments[0];
	var obj = arguments[1];
	var ret = socket.write(JSON.stringify(obj) + ',');
	if (ret === false) {See('', ret, 'SOCKET_BUFFER_IS_FULL @ ' + new Date());}
};

var recv = exports.recv = function(msg) {
	return JSON.parse('[' + msg.substring(0, msg.length - 1) + ']');
};

//var sej = Sej.curry('basekit');
//var see = See.curry('basekit');
var _buf = '';
var recv2 = exports.recv2 = function(data) {
	var out = '';

	while (true) {
		var idx = data.search('\n');
		if (idx === -1) {
			_buf += data;
			break;
		} else {
			out = out + _buf + data.slice(0, idx);
			data = data.substr(idx + 1); // +1 means '\n'
			_buf = '';
		}
	}

	return JSON.parse('[' + out.substring(0, out.length - 1) + ']');
};

var getRecv = exports.getRecv = function(cb) {
	if (cb === undefined) {
		console.error('getRecv lacks callback');
		return;
	}
	var _ver = '1';
	var _buf = '';
	var _cb = cb;
	return function(data) {
		while (true) {
			var idx = data.search('\n');
			if (idx === -1) {
				_buf += data;
				break;
			} else {
				_cb(JSON.parse(_buf + data.slice(0, idx))); // return a msg
				data = data.substr(idx + 1); // +1 means '\n'
				_buf = '';
			}
		}
	};
};

var quicklog = exports.quicklog = function(s, logpath) {
	if (logpath === undefined) {logpath = './quick.log';}
	var fs = require('fs');
	s = s.toString().replace(/\r\n|\r/g, '\n'); // hack
	var fd = fs.openSync(logpath, 'a+', '0666');
	fs.writeSync(fd, s + '\n');
	fs.closeSync(fd);
};

var connector = exports.connector = function(port, ip, hndEX, hndOCM, hndSRM, hndMJ) {
	var conn = net.createConnection(port, ip);
	var _send = function(obj) {
		conn.write(JSON.stringify(obj) + '\n');
	};
	var _recv = getRecv((cmd) => {
		if (cmd === undefined) {return;}

		try {
			if (cmd.ex) {hndEX(cmd);}
			if (cmd.ocm) {hndOCM(cmd);}
			if (cmd.icm) {hndSRM(cmd);}
			if (cmd.mj) {hndMJ(cmd);}
		} catch (ex) {
			See(ex);
		}
	});

	conn.setEncoding('UTF8');
	conn.setTimeout(1200 * 1000);
	conn.send = _send;
	conn.recv = _recv;

	conn.on('data', (data) => {
		if (data.length < 1) {return;}
		_recv(data);
	});

	conn.on('end', () => {});
	conn.on('close', () => {}); //conn.connect(port, ip);
	conn.on('error', (ex) => {
		Say(ex.errno + ' ' + ex.message, 'FRONTIER');
	});
	return conn;
};

// quick function to get current UTC epoch
exports.getEpoch = function() {
	return Math.floor((new Date()).getTime() / 1000.0);
};

// quick function to convert a UTC epoch to date object
exports.getDateByEpoch = function(epoch) {
	return new Date(epoch * 1000);
};