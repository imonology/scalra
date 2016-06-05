//
//  pubsub.js
//
//	channel and spatial pub/sub (SPS) functions
//
//	history:
//		2015-01-30	adapted from chat.js module as basis 
//
// module object
var l_module = {};

// a pool for all message handlers
var l_handlers = exports.handlers = {};
var l_checkers = exports.checkers = {};
var l_api = exports.api = {};

//-----------------------------------------
// define handlers (format checkers and event handlers)
//
//-----------------------------------------

// create a new message queue
var l_msgqueue = new SR.MsgQueue();

// set the upper limit of the message queue's size
l_checkers.SR_PUBSUB_QUEUE = {
	size: 'number'
};

l_handlers.SR_PUBSUB_QUEUE = function (event) {
	l_msgqueue.setLimit(event.data.size);
	event.done();
}


//
//	Subscribe
//
l_api.SR_SUB = { //Begin of SR-API
		fullname: 'SR.Module.pubsub.SR_SUB',
		name: 'SR_SUB',
		desc: 'subscribe to a given channel with options',
		input: {
			ch: {
				desc: 'name of the channel to subscribe',
				type: 'string',
				example: 'main'
			},
			last: {
				desc: 'how many recent messages to pull from the channel',
				type: 'number',
				example: '15'
			}
		},
		output: {},
		notes: 'will not return any message, howver, if "para.last" is specified, then will return SR_MSG for any previous messages'

	} //End of SR-API

//	ch: 	'string',
//	last: 	'number',
//	id:		'string',
//	area: {
//		x:	'number',
//		y:	'number',
//		r:	'number'
//	},
//	layer:	'string'

// subscribe a given message channel
l_checkers.SR_SUB = {
	//ch:    'string'
};

l_handlers.SR_SUB = function (event) {

	var data = event.data;

	// call SPS version of subscribe
	if (data.id && data.area) {
		var result = SR.Comm.sub({
			id: data.id,
			x: data.area.x,
			y: data.area.y,
			r: data.area.r,
			conn: event.conn,
			layer: data.layer
		});

		// return a list of existing nodes within subscribed area
		event.done('SR_SUB', {
			result: result
		});

		// also make a move, so that the subscriber can receive 
		// an initial list of nearby nodes within its subscribed area
		if (result === true) {
			SR.Comm.move(data.area, data.layer);
		}

		return;
	}

	// close event
	event.done();

	// check for home/garden space in 
	// id, channel, conn
	SR.Comm.subscribe(event.data.id, event.data.ch, event.conn);

	// check if additional parameters are provided
	if (typeof event.data.para === 'object') {
		var msgqueue_para = event.data.para;

		// if we want the last X messages
		if (typeof msgqueue_para.last === 'number' && msgqueue_para.last > 0) {
			// get last X messages from queue
			var msg_list = l_msgqueue.get(msgqueue_para, event.data.ch);

			if (msg_list.length > 0) {
				event.send('SR_MSGLIST', {
					channel: event.data.ch,
					msgs: msg_list
				});
				return;
			}
		}
	}
}

//	ch:		'string',
//	id:		'string',
//	layer:	'string'

// unsubscribe from a given message channel
l_checkers.SR_UNSUB = {
	//channel:    'string'
};

l_handlers.SR_UNSUB = function (event) {

	event.done();

	// call SPS version of unsubscribe
	if (typeof event.data.ch === 'undefined')
		SR.Comm.unsub({
			id: event.data.id,
			layer: event.data.layer
		});
	else
		SR.Comm.unsubscribe(event.conn.connID, event.data.ch);
}

//
//	Publish
//

//	ch:		'string',
//	msg:	'string',
//	id:		'string',
//	area:	{
//		x:	'number',
//		y:	'number',
//		r:	'number'
//	},
//	layer:	'string'

l_api.SR_PUB = { //Begin of SR-API
		fullname: 'SR.Module.pubsub.SR_PUB',
		name: 'SR_PUB',
		desc: 'publish a JSON message to a given channel',
		input: {
			ch: {
				desc: 'name of the channel to publish',
				type: 'string',
				example: 'main'
			},
			msg: {
				desc: 'a message in the form of a JSON object',
				type: 'object',
				example: '{who: "john", say: "hello"}'
			}
		},
		output: {}
	} //End of SR-API

// publish a particular message object
l_checkers.SR_PUB = {
	//channel:    'string',
	//msg:		'object'
};

l_handlers.SR_PUB = function (event) {

	// no response
	event.done();

	var data = event.data;

	// call SPS version of publish for area publication
	// TODO: is type always 'SR_MSG'?
	if (event.data.id && event.data.area) {
		SR.Comm.pub({
			id: data.id,
			x: data.area.x,
			y: data.area.y,
			r: data.area.r,
			msg: data.msg,
			layer: data.layer,
			type: 'SR_MSG'
		});
		return;
	}

	// publish the message
	SR.Comm.publish(event.data.ch, event.data, 'SR_MSG');

	// store to queue
	l_msgqueue.add(event.data.msg, event.data.ch);
}


//	id:		'string',
//	area:	{
//		x:	'number',
//		y:	'number',
//		r:	'number'
//	},
//	layer: 	'string'

// move a subscribed area to a different location
l_checkers.SR_MOVE = {};

l_handlers.SR_MOVE = function (event) {
	var data = event.data;

	// publish the message
	SR.Comm.move({
		id: data.id,
		x: data.area.x,
		y: data.area.y,
		r: data.area.r,
		layer: data.layer
	});
	event.done();
}

// get number of subscribers to a channel
l_checkers.SR_LISTSUB = {
	//channel:    'string'
};

l_handlers.SR_LISTSUB = function (event) {
	event.done('SR_LISTSUB', {
		ch: event.data.ch,
		count: SR.Comm.count(event.data.ch)
	});
}

/*
SR.Handlers.add('SR_PUB',
	function (event) {
		event.done('SR_PUB_RES', {result: true});
	}
);

SR.Handlers.SR_PUB.before = function (event, callback) {
	...
	event.data..
	callback(true);
};

SR.Handlers.SR_PUB.after = function (event) {
	
	event.done(true);
};


function (

before(in, main(in, after(in, done)));

var final = after(in, done);
var s-1 = main(in, final);
	var s-2 = before(in, s-1);
	
	s-2:	before	main(data);
	s-1:	main	after(data);
	final:	after	done(ret);
*/

//-----------------------------------------
// Server Event Handling
//
//-----------------------------------------


// when server starts
SR.Callback.onStart(function () {});

// when server starts
SR.Callback.onStop(function () {});

// do something when a user disconnects
SR.Callback.onDisconnect(function (conn) {
	SR.Comm.unsub({
		conn: conn
	});
});

// initiate connection to cloud server
l_module.start = function (config, onDone) {

	// do config checking & init

	// try to load back messages
	// config example:
	// {limit: 1000, backup: true}
	config = config || {
		limit: 1000
	};
	l_msgqueue.init(config);

	LOG.sys('pubsub module starting...config: ', 'SR.Module.pubsub');
	LOG.sys(config, 'SR.Module.pubsub');

	// add handlers
	SR.Handler.add(exports);

	UTIL.safeCall(onDone);
}

// stop / shutdown this module
l_module.stop = function (onDone) {
	UTIL.safeCall(onDone);
}

// register this module
SR.Module.add('pubsub', l_module);