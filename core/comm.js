//
//  comm.js
//
//	communication layer functions, including:
//  	1. spatial publish / subscribe (SPS) functions 
//		2. channel-based publish / subscribe (pub/sub) functions
//
//		channel pub/sub
//			subscribe(sub_id, channel, [conn | func])
//			unsubscribe(sub_id, channel)
//			publish(channel, msg, packet_type)
//			list()
//			count(channel)
//			onUnsubscribed(function (sub_id) {})
//		
//		spatial pub/sub
//			sub({sub_id, x, y, r})
//			unsub(sub_id)
//			pub({sub_id, x, y, r, msg})
//			move({sub_id, x, y, r})
//
//		VAST functions (unused & may be obsolete)
//			createNode(sub_id, layer, pos, onPosition, onMessage, onDone)
//			deleteNode(ident, onDone)
//
//
// channel pub/sub
//

var l_name = 'SR.Comm';

// list of currently existing channels
var l_channels = {};

// list of unused channels currently pending removal
var l_timeouts = {};

// list of callbacks to notify when unsubscribe occurs
var l_onUnsubscribe = [];

// channel subscription
exports.subscribe = function (sub_id, channel, conn) {

	LOG.sys('[' + sub_id + '] subscribes channel [' + channel + ']', 'subscribe');

	if (typeof conn !== 'object' && conn.connID) {
		LOG.warn('cannot subscribe without a valid connection', 'subscribe');
	} else {

		// remove timer to remove this channel
		if (l_timeouts.hasOwnProperty(channel)) {
			LOG.sys('channel [' + channel + '] subscribed again, remove its removal timer');
			clearTimeout(l_timeouts[channel]);
			delete l_timeouts[channel];
		}

		// check if we need to create a new channel
		if (l_channels.hasOwnProperty(channel) === false) {

			LOG.warn('new channel [' + channel + '] created', 'subscribe');
			// store a new list of subscribers
			l_channels[channel] = {};
		}

		// store connection, but only if it's a new subscription (avoid multiple subscriptions to same channel)
		var sub_list = l_channels[channel];

		if (sub_list.hasOwnProperty(sub_id) === false) {
			sub_list[sub_id] = conn;
		}
	}

	// return number of subscribers in current channel
	return Object.keys(sub_list).length;
}

var l_removeChannel = function (channel) {
	return function () {
		LOG.warn('channel [' + channel + '] is empty, removed after: ' + SR.Settings.TIMEOUT_UNUSED_CHANNEL_REMOVAL + ' seconds', 'unsubscribe');
        delete l_channels[channel];
		delete l_timeouts[channel];				
	}
}

// unsubscribe from existing channel(s)
exports.unsubscribe = function (sub_id, channel) {
    
	LOG.sys('[' + sub_id + '] unsubscribes channel [' + (channel || 'all') + ']', 'unsubscribe');

	// channels to unsubscribe from
	var channels = [];

    // check if channel specified exists
	if (channel !== undefined) {
        if (l_channels.hasOwnProperty(channel) === false) {
            LOG.warn('cannot find channel [' + channel + '] to unsubscribe', 'unsubscribe');
            return false;
        }
		channels.push(channel);
	}
	else {
		// if channel is not specified, then unsubscribe from all
		for (var name in l_channels)
			channels.push(name);
	}

	// list of unsubscribed channels (to show)
	var unsub_list = '';

	for (var i=0; i < channels.length; i++) {
		
		var target_channel = l_channels[channels[i]];

        // check if subscriber exists in this channel
        if (target_channel.hasOwnProperty(sub_id) === false)
			continue;

		unsub_list += (channels[i] + ' ');

        // perform unsubscribe from this channel
        delete target_channel[sub_id];
		
		// notify interested parties of the unsubscription
		for (var j=0; j < l_onUnsubscribe.length; j++) {
			UTIL.safeCall(l_onUnsubscribe[j], sub_id);	
		}

        // set to destroy channel if empty after some time
        if (Object.keys(target_channel).length === 0) {

			var channel_name = channels[i];
			
			// set timeout and store timer's id (to revoke timer if later subscribed again)			
			l_timeouts[channel_name] = setTimeout(l_removeChannel(channel_name), SR.Settings.TIMEOUT_UNUSED_CHANNEL_REMOVAL * 1000);
        }
	}

	// print which to unsubscribe from
	LOG.warn('[' + sub_id + '] unsubscribes from: ' + unsub_list);

    return true;
}

// automatic unsubscribe when a connection breaks
SR.Callback.onDisconnect(function (conn) {
	SR.Comm.unsubscribe(conn.connID);
});

// notify interested parties when unsubscribe occurs
exports.onUnsubscribed = function (onEvent) {
	if (typeof onEvent !== 'function') {
		return LOG.error('argument is not a valid callback function', l_name);	
	}
	
	l_onUnsubscribe.push(onEvent);
}

// channel publication
// returns success or not (true/false)
var l_publish = exports.publish = function (channel, msg, packet_type) {
	// check if channel exists
	if (l_channels.hasOwnProperty(channel) === false) {
		LOG.sys('channel [' + channel + '] has no subscriber', 'publish');
		return false;
	}

	// set default packet type to 'SR_PUBLISH' (also re-package message to include channel name, to be unpack at client)
	if (typeof packet_type === 'undefined') {
		packet_type = 'SR_PUBLISH';
		msg = {channel: channel, msg: msg};
	}

	// get list of subscribers
	var subscribers = l_channels[channel];

	// go over all subscribers and send them message
	var connections = [];
	var conn;
	for (var sub_id in subscribers) {

		conn = subscribers[sub_id];

		// if what's stored is callback, then simply call it
		if (typeof conn === 'function') {
			conn(packet_type, msg);
			continue;
		}

		// check if connection is valid		
		if (conn === undefined) {
			LOG.warn('connection for subscriber [' + sub_id + '] no longer valid, remove it', 'SR.Comm.publish');
			delete subscribers[sub_id];
			continue;
		}

		LOG.sys('sending to: ' + sub_id, 'publish');
		connections.push(conn);
	}

	//LOG.warn('publish [' + packet_type + '] to ' + connections.length + ' connections', l_name);
	return SR.EventManager.send(packet_type, msg, connections);
}

// return a list of current channels 
exports.list = function () {
	var channel_list = [];
	for (var name in l_channels) {
		channel_list.push(name);
	}
	return channel_list;
}

// return number of subscribers of a channel
exports.count = function (channel) {

	var count = 0;
	
	// if a channel is specified
	if (typeof channel === 'string') {
		if (l_channels.hasOwnProperty(channel) === false)
			LOG.warn('channel [' + channel + '] does not exist');
		else
			count = Object.keys(l_channels[channel]).length;
	}
	// get count for all channels
	else {		
		for (var ch in l_channels)
			count += Object.keys(l_channels[ch]).length;	
	}
	
	//LOG.sys('get number of subscribers for channel [' + channel + ']: ' + count);

	return count;
}

//
// spatial pub/sub
//
//			sub({id, x, y, r, conn, layer})
//			unsub({conn, id, layer})
//			pub({id, x, y, r, msg, layer, type})
//			move({id, x, y, r, layer})
//

// layers of subscriptions
var l_layers = {};

// records mapping from connections to subscriptions
var l_conns = {};

// name of default layer
var l_defaultLayer = '_';

// ref: http://stackoverflow.com/questions/20916953/get-distance-between-two-points-in-canvas
// get distance between two points with x, y coordinates
var l_dist = function (pt1, pt2) {
	return Math.sqrt((pt2.x -= pt1.x) * pt2.x + (pt2.y -= pt1.y) * pt2.y);
}

// find a list of subscribers covering a given point or area
var l_getSubscribers = function (area, layer) {
	
	// check if layer exists
	if (l_layers.hasOwnProperty(layer) === false)
		return [];
	
	// get all current subscriptions at this layer
	var subs = l_layers[layer];
	
	// prepare list of connection of subscribers matching / covering the area
	var connections = [];
	
	// check each subscription to see if it overlaps with the given area
	for (var id in subs) {
		var subscription = subs[id];
		
		// check for overlaps (distance between the two centers is less than sum of radii)
		if (l_dist(subscription, para) <= (subscription.r + para.r))
			connections.push(subscription.conn);
	}
	
	return connections;
}


exports.sub = function (para) {
	var layer = para.layer || l_defaultLayer;

	// get the collection of subscriptions in this layer
	var subs = (l_layers.hasOwnProperty(layer) ? l_layers[layer] : (l_layers[layer] = {}));
	
	if (typeof para.x === 'number' &&
		typeof para.y === 'number' &&
		typeof para.r === 'number') {
		subs[para.id] = {x: para.x, y: para.y, r: para.r, conn: para.conn};
		l_conns[para.conn.connID] = {id: para.id, layer: layer};
		return true;
	}
	return false;
}

exports.unsub = function (para) {
	var layer = para.layer || l_defaultLayer;
	var id = para.id;
	
	// check if this request is comes from connection break-down
	if (para.conn) {
		if (l_conns.hasOwnProperty(para.conn.connID) === false)
			return false;
			
		var sub = l_conns[para.conn.connID];
		
		id = sub.id;
		layer = sub.layer;
		
		delete l_conns[para.conn.connID];
	}
	
	if (l_layers.hasOwnProperty(layer) && l_layers[layer].hasOwnProperty(id)) {
		delete l_layers[layer][id];
		
		// check if layer is empty
		if (Object.keys(l_layers[layer]).length === 0)
			delete l_layers[layer];
		
		return true;
	}
	return false;
}

// check over existing subscriptions to see which will receive the publications
// returns number of matching subscriptions
exports.pub = function (para) {
	var layer = para.layer || l_defaultLayer;

	var conn_list = l_getSubscribers(para, layer);
		
	if (conn_list.length === 0)
		return 0;
		
	var packet_type = para.type || 'SR_PUB';
	
	// publish to all matching subscriptions
	return SR.EventManager.send(packet_type, para.msg, conn_list);
}

// change subscribed area
exports.move = function (para) {
	var layer = para.layer || l_defaultLayer;
	
	if (l_layers.hasOwnProperty(layer) === false || l_layers[layer].hasOwnProperty(para.id) === false)
		return false;

	var subscription = l_layers[layer][para.id];
	
	// update subscription info
	subscription.x = para.x || subscription.x;
	subscription.y = para.y || subscription.y;
	subscription.r = para.r || subscription.r;
	
	// notify nodes who can see (subscribe) me of the movement
	var conn_list = l_getSubscribers(subscription, layer);	
	var packet_type = 'SR_MOVE';

	// publish to all matching subscriptions
	return SR.EventManager.send(packet_type, para, conn_list);
}

//
//	VAST-based SPS 
//		2015-01-31 (obsolete for now)
//

/*
// local reference to created VAST nodes, indexed by node ident
var l_nodes = {};


// info contains:
//		id:     unique node ID
//		layer:  layer in which node exists
//		pos:    initial position for node
//      radius: initial radius for the node
//		posCB:  position callback
//		msgCB:  message callback

function Node(info) {

	// copy required parameters to form ident
	this.ident  = info.apikey + ':' + info.layer + ':' + info.name;
	this.pos    = info.pos;
	this.radius = info.radius || 0;

	// reference to VAST node created
	this.vastnode = undefined;

	// callbacks to update info
	this.onPosition = info.posCB;
	this.onMessage  = info.msgCB;				   

	LOG.warn('new SPS node created:');
	LOG.warn(this.ident);

	// copy other parameters
	// TODO: cleaner approach?
	for (var key in info)
		if (this.hasOwnProperty(key) === false)
			this[key] = info[key];

	return this;
}

// spatial subscribe
//   para: {
//		center: {
//			x: 'number',
//			y: 'number'
//		},
//		radius:	number
//   }

Node.prototype.subscribe = function (para, onDone) {

	if (this.vastnode === undefined) {
		LOG.error('node not yet init, cannot subscribe', 'SR.Comm.Node.subscribe');
		return false;
	}

	// check if radius exists (subscribe nearby)
	if (typeof para.radius !== 'undefined') {
		
		// check if center exists (subscribe area)
		if (typeof para.center !== 'undefined')			
			this.pos = para.center;

		// update radius 
		this.radius = para.radius;

		// send AOI change
		SR.VAST.publishPos(this.vastnode, this.pos, this.radius, function () {
			UTIL.safeCall(onDone, true);
		});	
	}

	UTIL.safeCall(onDone, false);
}

// spatial unsubscribe
Node.prototype.unsubscribe = function (onDone) {
	
	// modify subscription radius to 0
	this.radius = 0;

	// send AOI change
	SR.VAST.publishPos(this.vastnode, this.pos, this.radius, function () {
		UTIL.safeCall(onDone);
	});
}

// spatial publish
Node.prototype.publish = function (para, onDone) {

	// nothing to publish
	if (typeof para.msg === 'undefined')
		return UTIL.safeCall(onDone, false);

	var msg    = para.msg;
	var pos    = (typeof para.pos === 'object' ? para.pos : this.pos);
	var radius = (typeof para.radius !== 'undefined' ? para.radius : 0);

	// TODO: spread the message

	UTIL.safeCall(onDone, true);
}

// spatial move
Node.prototype.move = function (para, onDone) {
	
	if (typeof para !== 'object')
		return UTIL.safeCall(onDone, false);

	// store new position
	this.pos = para;

	var that = this;

	LOG.warn('vastnode: ' + this.vastnode, 'SR.Comm.Node.move');
	LOG.warn('pos: ' + JSON.stringify(this.pos) + ' radius: ' + this.radius);

	// send position change
	SR.VAST.publishPos(this.vastnode, this.pos, this.radius, function () {

		// notify neighbors (about both pos updates and node left)
		// and also self (about new nodes in my view)
		var lists = SR.VAST.getLists(that.vastnode);

		var new_list = lists[0];
		var left_list = lists[1];
		var notify_list = lists[2];
		var unsub_list = lists[3];

		LOG.warn('new: ' + new_list.length + ' left: ' + left_list.length + ' notify: ' + notify_list.length + ' total_nodes: ' + Object.keys(l_nodes).length);

		// notify neighbors of my movement
		for (var i=0; i < notify_list.length; i++) {
			var ident = notify_list[i];
			LOG.warn('notify neighbor: ' + ident, 'SR.Comm.Node.move');

			if (l_nodes.hasOwnProperty(ident) === false) {
				LOG.error('VAST node [' + ident + '] not found in reference', 'SR.Comm.Node.move');
				continue;
			}

			// TODO: combine them so it's just one notify message (instead of many...)
			var node = l_nodes[ident];
			UTIL.safeCall(node.onPosition, {ident: that.ident, pos: that.pos, to: ident});
		}

		// notify neighbors to unsubscribe myself
		for (var i=0; i < unsub_list.length; i++) {
			var ident = unsub_list[i];
			LOG.warn('notify neighbor to unsubscribe: ' + ident, 'SR.Comm.Node.move');

			if (l_nodes.hasOwnProperty(ident) === false) {
				LOG.error('VAST node [' + ident + '] not found in reference', 'SR.Comm.Node.move');
				continue;
			}

			// TODO: combine them so it's just one notify message (instead of many...)
			var node = l_nodes[ident];
			UTIL.safeCall(node.onPosition, {ident: that.ident, pos: null, to: ident});
		}

		// notify myself of new & left nodes
		for (var i=0; i < new_list.length; i++) {
			var ident = new_list[i];

			if (l_nodes.hasOwnProperty(ident) === false) {
				LOG.error('VAST node [' + ident + '] not found in reference', 'SR.Comm.Node.move');
				continue;
			}

			var node = l_nodes[ident];
			UTIL.safeCall(that.onPosition, {ident: ident, pos: node.pos, to: that.ident});
		}

		for (var i=0; i < left_list.length; i++) {
			var ident = left_list[i];
			UTIL.safeCall(that.onPosition, {ident: ident, pos: null, to: that.ident});
		}
		
		UTIL.safeCall(onDone, true);
	});	
}

// create a new VAST node (for communication)
exports.createNode = function (id, layer, pos, onPosition, onMessage, onDone) {

	// store node info to Node
	var info = {
	    apikey: SR.Settings.Project.projectName || 'SR', 
		layer:  layer,
		name:   id,
		pos:    pos,
		posCB:  onPosition,
		msgCB:  onMessage
	};

	var node = new Node(info);

	// TODO: error check & potentially return 'undefined' if parameters are not right
	
	// register new node
	// NOTE: we pass in 
	SR.VAST.createNode(info, node.pos, function (created_node) {
		
		// store created VAST node
		node.vastnode = created_node;

		LOG.warn('VAST node created, ident: ' + node.ident + '...', 'SR.Comm.createNode');

		// keep reference for node ident structure
		// TODO: simplify / remove this?
		node.ident_info = {
			apikey: info.apikey,
			layer:  info.layer,
			name:   info.name};
		
		// keep reference of the created node
		l_nodes[node.ident] = node;
				
		// return newly created node
		UTIL.safeCall(onDone, node);
	});
}

// delete a VAST node
exports.deleteNode = function (ident, onDone) {

	LOG.warn('deleting VAST node ident: ' + ident + '...', 'SR.Comm.deleteNode');

	if (l_nodes.hasOwnProperty(ident) === false) {
		LOG.warn('ident not found: ' + ident, 'SR.Comm.deleteNode');
		UTIL.safeCall(onDone, false);
		return;
	}
	
	var node = l_nodes[ident];
	
	SR.VAST.deleteNode(node.ident_info, function (result) {

		// remove reference to VAST node
		delete l_nodes[ident];

		// result is true or false
		UTIL.safeCall(onDone, result);
	});
}
*/


/////////////////////////////////////////////////
// dump
//
/////////////////////////////////////////////////
exports.dump = function (arg) {
	console.log(l_channels);
	console.log(l_timeouts);
}
