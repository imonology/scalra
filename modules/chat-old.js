//
//  chat.js
//
//	a simple chat module
//
//	history:
//		2014-06-21	convert from /handlers to /modules and take init parameters
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
l_checkers.SR_SET_QUEUESIZE = {
	size: 'number'
};

l_handlers.SR_SET_QUEUESIZE = function (event) {
	l_msgqueue.setLimit(event.data.size);
	event.done();
}

l_api.SR_PUBLISH = { //Begin of SR-API
		fullname: 'SR.Module.chat.SR_PUBLISH',
		name: 'SR_PUBLISH',
		desc: 'publish a JSON message to a given channel',
		input: {
			channel: {
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
l_checkers.SR_PUBLISH = {
	channel: 'string',
	msg: 'object'
};

l_handlers.SR_PUBLISH = function (event) {

	// TODO: remove following code when this function is stable
	if (SR.Settings.MODE != 'prod') {
		LOG.warn(event, 'SR.Module.chat');
		LOG.warn('connection duration: ' + event.conn.getDuration(), 'SR.Module.chat');

		// session function test, store speaker ('who' parameter)
		if (event.session['_account']) {
			event.session['who'] = event.session['_account'];
		} else if (event.data.msg.who && event.data.msg.who !== '') {
			LOG.warn('store speaker [' + event.data.msg.who + '] into session', 'SR.Module.chat');
			event.session['who'] = event.data.msg.who;
		}

		// load it from session
		if (event.session['who'])
			event.data.msg.who = event.session['who'];
	}

	// publish the message
	SR.Comm.publish(event.data.channel, event.data, 'SR_MSG');

	// store to queue
	l_msgqueue.add(event.data.msg, event.data.channel);

	// no response
	event.done();
}

l_api.SR_SUBSCRIBE = { //Begin of SR-API
		fullname: 'SR.Module.chat.SR_SUBSCRIBE',
		name: 'SR_SUBSCRIBE',
		desc: 'subscribe to a given channel with options',
		input: {
			channel: {
				desc: 'name of the channel to subscribe',
				type: 'string',
				example: 'main'
			},
			para: {
				desc: 'optional parameters when subscribing to a channel',
				last: {
					desc: 'how many recent messages to pull from the channel',
					type: 'number',
					example: '15'
				}
			}
		},
		output: {},
		notes: 'will not return any message, howver, if "para.last" is specified, then will return SR_MSG for any previous messages'

	} //End of SR-API

// channel: 'string'
// [para: {last: 'number'}]

// subscribe a given message channel
l_checkers.SR_SUBSCRIBE = {
	channel: 'string'
};

l_handlers.SR_SUBSCRIBE = function (event) {

	// id, channel, conn
	SR.Comm.subscribe(event.conn.connID, event.data.channel, event.conn);
	/*
		if (event.data.	
		// notify interested parties about this subscription
		var info_channel = channel + '_info';
			if (l_channels.hasOwnProperty(channel_info)) {
				l_publish(info_channel, {channel: channel, size: Object.keys(ch).length, join: sub_id});
			}	
	*/
	// close event
	event.done();

	// check if additional parameters are provided
	if (typeof event.data.para === 'object') {
		var msgqueue_para = event.data.para;

		// if we want the last X messages
		if (typeof msgqueue_para.last === 'number' && msgqueue_para.last > 0) {
			// get last X messages from queue
			var msg_list = l_msgqueue.get(msgqueue_para, event.data.channel);

			if (msg_list.length > 0) {
				event.send('SR_MSGLIST', {
					channel: event.data.channel,
					msgs: msg_list
				});
				return;
			}
		}
	}
}

// unsubscribe from a given message channel
l_checkers.SR_UNSUBSCRIBE = {
	channel: 'string'
};

l_handlers.SR_UNSUBSCRIBE = function (event) {
	SR.Comm.unsubscribe(event.conn.connID, event.data.channel);
	event.done();
}

// get number of subscribers to a channel
l_checkers.SR_SUBSCRIBERS = {
	channel: 'string'
};

l_handlers.SR_SUBSCRIBERS = function (event) {
	var count = SR.Comm.count(event.data.channel);
	event.done('SR_SUBSCRIBERS_R', {
		channel: event.data.channel,
		count: count
	});
}

/*
SR.Handlers.add('SR_PUBLISH',
	function (event) {
		event.done('SR_PUBLISH_RES', {result: true});
	}
);

SR.Handlers.SR_PUBLISH.before = function (event, callback) {
	...
	event.data..
	callback(true);
};

SR.Handlers.SR_PUBLISH.after = function (event) {
	
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
	SR.Comm.unsubscribe(conn.connID);
});

// start the chat module
l_module.start = function (config, onDone) {

	// do config checking & init

	// try to load back messages
	// config example:
	// {limit: 1000, backup: true}
	config = config || {
		limit: 1000
	};
	l_msgqueue.init(config);

	LOG.sys('chat module starting...config: ', 'SR.Module.chat');
	LOG.sys(config, 'SR.Module.chat');

	// add handlers
	SR.Handler.add(exports);

	UTIL.safeCall(onDone);
}

// stop / shutdown this module
l_module.stop = function (onDone) {
	UTIL.safeCall(onDone);
}

// register this module
SR.Module.add('chat', l_module);
