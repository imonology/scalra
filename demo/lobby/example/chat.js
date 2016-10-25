
// create a new message queue
var l_msgqueue = new SR.MsgQueue();

SR.API.add('SET_QUEUESIZE', {
	size:	'number'	
}, function (args, onDone) {
	l_msgqueue.setLimit(args.size);
	onDone();	
});

SR.API.add('PUBLISH', {
	channel: 'string',
	msg: 'object'	
}, function (args, onDone, extra) {

	// TODO: remove following code when this function is stable
	if (SR.Settings.MODE != 'prod') {
		LOG.warn(event);
		LOG.warn('connection duration: ' + extra.conn.getDuration());

		// session function test, store speaker ('who' parameter)
		if (extra.session['_account']) {
			extra.session['who'] = extra.session['_account'];
		} else if (args.msg.who && args.msg.who !== '') {
			LOG.warn('store speaker [' + args.msg.who + '] into session');
			extra.session['who'] = args.msg.who;
		}

		// load it from session
		if (extra.session['who'])
			args.msg.who = extra.session['who'];
	}

	// publish the message
	SR.Comm.publish(args.channel, args, 'SR_MSG');

	// store to queue
	l_msgqueue.add(args.msg, args.channel);

	// no response
	onDone();
});

SR.API.add('SUBSCRIBE', {
	channel:	'string',
	para:		'+object'
}, function (args, onDone, extra) {

	// id, channel, conn
	SR.Comm.subscribe(extra.conn.connID, args.channel, extra.conn);

	// close event
	onDone();

	if (!args.para)
		return;
		
	// check if additional parameters are provided
	var msgqueue_para = args.para;
	
	// if we want the last X messages
	if (typeof msgqueue_para.last === 'number' && msgqueue_para.last > 0) {
		// get last X messages from queue
		var msg_list = l_msgqueue.get(msgqueue_para, args.channel);
		
		if (msg_list.length > 0) {
			SR.EventManager.send('SR_MSGLIST', {
				channel: args.channel,
				msgs: msg_list
			});
			return;
		}
	}
});

SR.API.add('UNSUBSCRIBE', {
	channel: 'string'
}, function (args, onDone, extra) {
	SR.Comm.unsubscribe(extra.conn.connID, args.channel);
	onDone();
});

// get number of subscribers to a channel
SR.API.add('SUBSCRIBERS', {
	channel: 'string'
}, function (args, onDone) {
	var count = SR.Comm.count(args.channel);
	onDone(null, {
		channel: args.channel,
		count: count
	});
});

// do something when a user disconnects
SR.Callback.onDisconnect(function (conn) {
	SR.Comm.unsubscribe(conn.connID);
});

SR.Callback.onStart(function () {

	// config example:
	// {limit: 1000, backup: true}
	config = {
		limit: 1000
	};
	l_msgqueue.init(config);
});
