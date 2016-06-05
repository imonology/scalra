
//
//  msgqueue.js
//
//  generic message queue
//
//    methods:
//      add(msg, name)        			// add a message to queue, providing optional name
//      remove(pos, name)               // remove a given message (at a position)
//		get(rules, name)				// get messages given a certain query criteria
//		getQueue(name)					// return the entire queue object based on its name
//      getLength(name)                 // get current number of messages
//      setLimit(limit)					// set maximum size of queue
//

// config:
//		interval: 'number'	how many seconds to store back to DB
//		limit: 'number'		the limit for number of records stored to dB
// ex: {interval: 5, limit: 1000}

// array methods override
// 

function MsgQueue () {

    // internal queue
	var queues = {};
		
	// set size limit (default to 100)
	var config = {limit: 100, backup: false};
	
	// init the message queue by loading previous data from DB
	this.init = function (c) {
		
		if (typeof c !== 'object') {
			LOG.error('config not object', 'SR.MsgQueue');
			LOG.stack();
			return;
		}
		
		// use specified parameter (as preferred) if available
		for (var key in c) 
			config[key] = c[key];
		
		LOG.sys('init MsgQueue...config: ', 'SR.MsgQueue');
		LOG.sys(config, 'SR.MsgQueue');

		if (config.backup === true) {
			LOG.sys('try to load from DB any previous data...', 'SR.MsgQueue');
				
			SR.Sync.load(queues, config, function (list) {
				LOG.warn('load sync data from DB to MsgQueue: ', 'SR.MsgQueue');
				LOG.warn(list, 'SR.MsgQueue');
			});
		}
	}

    // to store a message item onto queue
    this.add = function (msg, name) {
		name = name || 'default';
		
		// create new queue if not exist
		if (queues.hasOwnProperty(name) === false) {
			queues[name] = [];
			
			// sync it with DB, so memory messages are kept even after server shutdown
			// NOTE: this is perform one-time
			if (config.backup === true)
				SR.Sync.set(queues[name], name, config);
		}
		
		// store a message to queue
		var queue = queues[name];
		queue.push(msg);
		
		// check if limit is reached, remove first
		if (queue.length > config.limit)
			queue.shift();
	}

	// to remove a given element
	this.remove = function (pos, name) {
		name = name || 'default';
		if (queues.hasOwnProperty(name) === false)
			return;
		
		queues[name].splice(pos, 1);	
	}
	
	// to get some messages according to rules
	this.get = function (rules, name) {
		if (typeof rules !== 'object')
			return [];
		
		// check if name exists
		if (queues.hasOwnProperty(name) === false)
			return [];
		
		var queue = queues[name];
		
		if (typeof rules.pos === 'number') {
			if (rules.pos >= 0 && rules.pos < queue.length)
				return [queue[rules.pos]];
			else
				return [];
		}
		// get a certain number of messages specified by last
		else if (typeof rules.last === 'number') {
			var start = (rules.last > queue.length ? 0 : queue.length - rules.last);
			var arr = [];
			for (var i=start; i < queue.length; i++)
				arr.push(queue[i]);
			return arr;
		}
		else
			return [];
	}
	
	// return the entire queue object based on its name
	this.getQueue = function (name) {	
		
		// check if name exists
		if (queues.hasOwnProperty(name) === false)
			return undefined;

		return queues[name];		
	}
	
    // to show current length of queue
    this.getLength = function (name) {
		name = name || 'default';
		
		// check if name exists
		if (queues.hasOwnProperty(name) === false)
			return 0;		
		
        return queues[name].length;
    }

	// set global upper limit to all queues
	this.setLimit = function (l) {
		
		if (typeof l !== 'number' || l < 0)
			return;
		
		config.limit = l;
		
		var queue = undefined;
		
		// cut queue to fit limit
		for (var name in queues) {
				
			queue = queues[name];
			if (queue.length > config.limit) {
				queue = queue.slice(queue.length - config.limit);
			}
		}
	}
}

exports.icMsgQueue = MsgQueue;