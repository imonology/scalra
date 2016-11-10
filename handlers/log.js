//
//  log.js
//
//	for displaying server execution screen log handlers
//

// a pool for all message handlers
var l_handlers = exports.handlers = {};
var l_checkers = exports.checkers = {};


//
//	Log Display System
//

// get the log output for the following running game/project
l_checkers.SR_SUBSCRIBE_LOG = {
	/*
    owner:   	'string',
	project:	'string',
	name:		'string',
	//id:			'string'
	*/
};

l_handlers.SR_SUBSCRIBE_LOG  = function (event) {
	LOG.warn('SR_SUBSCRIBE_LOG called');
	var channel;
	var info = event.data;
	
	if (info.owner && info.project && info.name)
		channel = info.owner + '-' + event.data.project + '-' + event.data.name;
	else if (info.id)
		channel = info.id;
	// no valid info
	else {
		LOG.error('SR_SUBSCRIBE_LOG parameter error');
		return event.done('LOG', {result: false, data: 'SR_SUBSCRIBE_LOG parameter error'});
	}
	
	var result = SR.StreamManager.subscribe(channel, event.conn);
	event.done('LOG', {result: result, data: 'SR_SUBSCRIBE_LOG for channel [ ' + channel + ']: ' + result});
	
	/*
        // if we want the last X messages
        if (typeof msgqueue_para.last === 'number' && msgqueue_para.last > 0) {
            // get message from queue
            var msg_list = l_msgqueue.get(msgqueue_para, event.data.channel);
        	event.done('SR_MSGLIST', {channel: event.data.channel, msgs: msg_list});	
		}
	*/
}

l_checkers.SR_UNSUBSCRIBE_LOG = {
    id:   	'string'
};

l_handlers.SR_UNSUBSCRIBE_LOG  = function (event) {
	LOG.warn('SR_UNSUBSCRIBE_LOG called');
	
	var result = SR.StreamManager.unsubscribe(event.data.id, event.conn);
	event.done('LOG', {result: result, data: 'SR_UNSUBSCRIBE_LOG for channel [ ' + event.data.id + ']: ' + result});
}





