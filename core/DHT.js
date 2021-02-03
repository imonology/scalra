/* cSpell:disable */
/* global SR, LOG, UTIL */
/*
	DHT.js		basic distributed hash table (DHT) functions

	functions:
		init(host_list, onDone)			// init the DHT ring with a list of initial hosts (equally valid entries)
		onDone(err, dht_obj)			// callback returns the DHT object & potential error code (if any)

	dht_obj:
		set(key, value, onDone)			// set a key-value pair to the DHT ring
		get(key, onDone)				// get the value associated with a given key
		delete(key, onDone)				// delete a given key
*/

var kademlia = require('kad');
var levelup = require('levelup');
UTIL.validatePath('./store');

// DHT object (local)
function DHT(seeds, onConnect, onUpdate) {
	var l_map = {};

	// build DHT connection
	var l_dht = undefined;

	// init DHT
	if (seeds instanceof Array) {
		l_dht = kademlia({
			address: '127.0.0.1',
			port: 65535,
			seeds: seeds,
			storage: levelup('./store/dht_db'),
		});

		l_dht.on('connect', () => {
			LOG.warn('DHT connected...', 'SR.DHT');
			UTIL.safeCall(onConnect);
		});
	} else {
		UTIL.safeCall(onConnect);
	}

	this.set = function (key, value, onDone) {
		if (!l_dht) {
			l_map[key] = value;
			return UTIL.safeCall(onDone, true);
		}

		l_dht.put(key, value, (err) => {
			if (err) {
				LOG.error(err, 'SR.DHT');
				UTIL.safeCall(onDone, false);
			} else {
				UTIL.safeCall(onDone, true);
			}
		});
	};

	this.get = function (key, onDone) {
		if (!l_dht) {
			if (l_map.hasOwnProperty(key)) {
				UTIL.safeCall(onDone, l_map[key]);
			} else {
				UTIL.safeCall(onDone);
			}
			return;
		}

		l_dht.get(key, (err, value) => {
			if (err) {
				LOG.error(err, 'SR.DHT');
				UTIL.safeCall(onDone);
			} else {
				// remove from local & return undefined
				if (value === 'DELETED') {
					delete l_map[key];
					return UTIL.safeCall(onDone);
				}

				// update to local
				l_map[key] = value;
				UTIL.safeCall(onDone, value);
			}
		});
	};

	this.delete = function (key, onDone) {
		if (!l_dht) {
			if (l_map.hasOwnProperty(key)) {
				delete l_map[key];
				UTIL.safeCall(onDone, true);
			} else {
				UTIL.safeCall(onDone, false);
			}
			return;
		}

		// TODO: need a way to delete?
		l_dht.put(key, 'DELETED', (err) => {
			if (err) {
				LOG.error(err, 'SR.DHT');
				UTIL.safeCall(onDone, false);
			} else {
				UTIL.safeCall(onDone, true);
			}
		});
	};
}

var l_dht = undefined;

// init the DHT ring with a list of initial hosts (equally valid entries)
// onDone: when init is done, DHT ring is joined
// onUpdate: when some data in the DHT has changed, passed in key changed (optional)
exports.init = function (hosts, onDone, onUpdate) {
	LOG.warn('hosts are: ', 'SR.DHT');
	LOG.warn(hosts, 'SR.DHT');

	LOG.error('DHT function disabled for now', 'SR.DHT');
	return UTIL.safeCall(onDone);

	// var seeds = [];
	// for (var i = 0; i < hosts.length; i++)
	// 	seeds.push({ address: hosts[i], port: 65535 });

	// // contact & join the inital nodes?
	// l_dht = new DHT(
	// 	seeds,
	// 	function () {
	// 		UTIL.safeCall(onDone, undefined, l_dht);
	// 	},
	// 	onUpdate
	// );
};

// leave the DHT ring
exports.dispose = function () {
	if (l_dht) {
		// delete l_dht;
		l_dht = undefined;
	}
};
