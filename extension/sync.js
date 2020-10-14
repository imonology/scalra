//
//
// sync.js
//
//  Syncing mechanism between memory arrays and DB
// 
//	This SR component tries to allow the automatic syncing between memory arrays and DB,
//  once linked to a collection in DB, array elements will be stored to DB at intervals,
//  stored data can also be loaded from DB to array upon startup
//
// methods:
//	set(array, arr_name, config, onDone)	// set an in-memory array to sync with a DB collection
//	load(arrays, config, onDone)		// load data from DB to an in-memory array
//
// history
// 2014-05-26	start
// 2014-05-29	initial version
//

/*
	// init process (check if we need to connect/store to DB)
	// ex: {DB: 'chat', interval: 5, limit: 1000}	
	if (typeof config === 'object' && typeof config.DB === 'string') {
		
		// name of the collection to store message in batch
		var clt_name = config.DB;
		
		// how many seconds to store to DB once
		var interval = config.interval || 5;
		
		// start to utilize a new DB collection
		SR.addCollection(clt_name, function (result) {
			
			// set message limit in each individual queue
			if (typeof config.limit === 'number')
				this.setLimit(config.limit);
				
				// TODO: load existing records from DB to memory (into 'queues')
		});
	}
*/


SR.DB.useCollections([SR.Settings.DB_NAME_SYNC]);

// names of the arrays to sync
var l_names = {};

//
// local methods
//

// store all pending arrays to DB
var l_storeAll = function () {
	// go over each array
	for (var name in l_names) {
		l_store(l_names[name]);
	}
}

// store a particular record to DB
var l_store = function (arr) {

	// extract collection name
	if (arr && typeof arr._name === 'string') {

		var size = arr.length - arr._index;

		if (size <= 0)
			return false;

		LOG.sys('try to store to array [' + arr._name + '], # of elements to store: ' + size, 'SR.Sync');

		// TODO: wasteful of space?
		// NOTE: only new array entries will be stored to DB
		var elements = [];
		for (var i = arr._index; i < arr.length; i++)
			elements.push(arr[i]);

		// update index count (regardless of update success or not?)
		arr._index = arr.length;

		// TODO: find right way to store
		// store away
		// NOTE: $each is used here (try to hide it?)
		SR.DB.updateArray(SR.Settings.DB_NAME_SYNC, { name: arr._name }, { data: elements },
			function (result) {
				LOG.sys('update array success: ' + result, 'SR.Sync');
			},
			function (result) {
				LOG.error('update array fail: ' + result, 'SR.Sync');
			}
		);
		return true;
	}
	else
		LOG.error('cannot store to DB, arr_name unavailable', 'SR.Sync');

	return false;
}

/*
// store a particular record to DB
var l_store = function (arr, length, element) {

	// extract collection name
	if (arr && typeof arr._name === 'string') {

		// put timestamp to element stored
		// NOTE: put it earlier?
		element._time = new Date();

		
		// store away
		SR.DB.updateArray(SR.Settings.DB_NAME_SYNC, {name: arr._name}, {data: element},
			function (result) {
				//LOG.sys('update array success: ' + result, 'SR.Sync');
			}, 
			function (result) {
				LOG.error('update array fail: ' + result, 'SR.Sync');
			}
		);
	}
	else
		LOG.error('cannot store to DB, arr_name unavailable', 'SR.Sync');
}
*/

// custom event-notifying push
// ref: http://stackoverflow.com/questions/5100376/how-to-watch-for-array-changes
var l_push = function () {

	var now = new Date();

	for (var i = 0, l = arguments.length; i < l; i++) {
		var item = UTIL.clone(arguments[i]);

		// put timestamp to element stored
		if (item && item !== null) {
			item._time = now;
			this[this.length] = item;
		}
		else
			LOG.error('push data is null', 'SR.Sync');

		// NOTE: do not store right away, but rather periodically
		//l_store(this, this.length, this[this.length-1]); 
	}
	return this.length;
}

// set an in-memory array to sync with a DB collection
// config may contain:
// {interval: 5, limit: 1000}
// returns true/false on whether set is successful
var l_set = function (arr, arr_name, config) {

	if (l_names.hasOwnProperty(arr_name)) {
		LOG.warn('array [' + arr_name + '] already sync with DB', 'SR.Sync');
		//return UTIL.safeCall(onDone, false);
		return false;
	}

	// first override the array's functions	
	arr.push = l_push;

	// store array's name
	arr._name = arr_name;

	// store last stored index
	arr._index = 0;

	// store to list of arrays
	l_names[arr_name] = arr;

	// NOTE: the DB creation may finish *after* this function returns
	// check if the array has been created inside DB, if not then create new record
	SR.DB.getArray(SR.Settings.DB_NAME_SYNC,
		function (result) {
			// NOTE: if array does not exist it'll return success with an empty array
			if (result === null || result.length === 0) {

				LOG.sys('array [' + arr_name + '] does not exist, create...', 'SR.Sync');
				SR.DB.setData(SR.Settings.DB_NAME_SYNC, { name: arr_name, data: [] },
					function (r) {
						LOG.sys('array [' + arr_name + '] create success', 'SR.Sync');
						//UTIL.safeCall(onDone, true);
					},
					function (r) {
						LOG.error('array [' + arr_name + '] create fail', 'SR.Sync');
						//UTIL.safeCall(onDone, false);
					});
			}
			else {
				LOG.sys('array [' + arr_name + '] exists', 'SR.Sync');
				LOG.warn(result);
				//UTIL.safeCall(onDone, true);										
			}
		},
		function (result) {
			//UTIL.safeCall(onDone, false);
		},
		{ name: arr_name });

	return true;

	// TODO: consider config's effect
}

// load data from DB to an in-memory array
// returns a list of the names of arrays loaded
var l_load = function (arrays, config, onDone) {

	var names = [];

	// load array's content from DB, if any	
	SR.DB.getArray(SR.Settings.DB_NAME_SYNC,
		function (result) {
			// NOTE: if array does not exist it'll return success with an empty array
			if (result === null || result.length === 0) {
				LOG.warn('no arrays found, cannot load', 'SR.Sync');
			}
			else {

				var array_limit = (typeof config.limit === 'number' ? config.limit : 0);

				LOG.sys('arrays exist, try to load (limit: ' + array_limit + ')', 'SR.Sync');

				for (var i = 0; i < result.length; i++) {
					var record = result[i];

					var arr = arrays[record.name] = [];

					// load data (clone is better?)
					var limit = (record.data.length > array_limit ? array_limit : record.data.length);

					var start = record.data.length - limit;

					for (var j = 0; j < limit; j++)
						arr[j] = UTIL.clone(record.data[start + j]);

					// override array's default behavior
					arr.push = l_push;

					// store array's name
					arr._name = record.name;

					// store last stored index (next index to store)
					arr._index = j;

					LOG.sys('[' + record.name + '] DB record length: ' + record.data.length + ' start: ' + start + ' actual limit: ' + limit + ' _index: ' + arr._index, 'SR.Sync');

					l_names[record.name] = arr;
					names.push(record.name);
				}
			}
			UTIL.safeCall(onDone, names);

		},
		function (result) {
			UTIL.safeCall(onDone, names);
		},
		{});
}

var l_timer = undefined;

SR.Callback.onStart(function () {

	// init periodic storage to DB
	LOG.warn('init periodic syncing to DB for arrays at intervals (ms): ' + SR.Settings.TIMEOUT_SYNC_PERIOD * 1000, 'SR.Sync');
	l_timer = setInterval(l_storeAll, SR.Settings.TIMEOUT_SYNC_PERIOD * 1000);
});

SR.Callback.onStop(function () {

	// stop timer
	if (l_timer) {
		clearTimeout(l_timer);
		l_timer = undefined;
	}
});

// exported functions
exports.set = l_set;
exports.load = l_load;
