//
//  datastore.js
//
//	generic API for accessing an in-memory cache of some persistent data (currently stored to DB)
//
//  history:
//  2016-04-18		first version
//
//	functions:
//
//  init({models}, onDone) 		// load initial DB content to memory
//	get({name, query}, onDone)	// get a given data set by 'name', returns either an array or object depending on whether 'query' terms are specified 
//  map({name, key}, onDone)	// build and return a mapping relations from key value to stored elements in array

var l_name = 'SR.DS';

/*
example types:
			name      : String,
			surname   : String,
			age       : Number, // FLOAT
			male      : Boolean,
			continent : [ "Europe", "America", "Asia", "Africa", "Australia", "Antartica" ], // ENUM type
			photo     : Buffer, // BLOB/BINARY
			data      : Object // JSON encoded
*/
// mapping from type name to actual type object
// supported types ref: https://github.com/dresende/node-orm2/wiki/Model-Properties
// see example: https://github.com/dresende/node-orm2
var l_types = {
	'string':	String,
	'boolean':	Boolean,
	'number':	Number,
	'date':		Date,
	'object':	Object,
	'buffer':	Buffer,		// used for binary data such as photos
	'array':	Object
}

var l_rebuildObjects = function (obj) {

	// ver 3: both objects & strings
	for (var key in obj) {
		
		// we leave off functions such as 'save'
		if (typeof obj[key] === 'function' || typeof obj[key] === 'undefined')
			continue;
		
		// for objects
		if (typeof obj[key] === 'object') {
			var newitem = {};
			var olditem = obj[key];
			
			// copy existing values
			for (var k in olditem) {
				newitem[k] = olditem[k];
			}
		
			// re-assign back
			obj[key] = newitem;			
		} else {
			// for string/number/boolean
			var temp = obj[key];
			obj[key] = undefined;
			
			if (typeof temp === 'number' && isNaN(temp)) {
				LOG.warn('NaN found! ignore storing', l_name);	
			} else {
				obj[key] = temp;				
			}
		}
	}
	return obj;	
	
	
	/*
	// ver 2: just 1st-level attributes
	// NOTE: won't work, as .save() is not transferred correctly
	var newobj = {};
	for (var key in obj) {
		newobj[key] = obj[key];
	}
	return newobj;
	*/
	
	/* ver 1: just objects
	for (var key in obj) {
		if (typeof obj[key] !== 'object')
			continue;
		
		var newitem = {};
		var olditem = obj[key];
		
		// copy existing values
		for (var k in olditem) {
			newitem[k] = olditem[k];
		}
		
		obj[key] = newitem;
	}
	return obj;	
	*/
	
}

// create new array for all elements of array type
// TODO: find more efficient approach?
var l_remakeArray = function (obj) {
	for (var key in obj) {
		if (typeof obj[key] === 'object') {
			if (obj[key] instanceof Array) {
				LOG.warn('need to remake array for [' + key + ']', l_name);
				var oldarr = obj[key];
				
				var arr = [];
				for (var i=0; i < oldarr.length; i++)
					arr.push(oldarr[i]);
				
				// assigne new array as value to key
				obj[key] = arr;
			} else {
				// keep processing recursively
				LOG.warn('need to further process [' + key + ']', l_name);
				l_remakeArray(obj[key]);	
			}
		}
	}
}

// build a query with only string elements (possibly will contain the key of the object)
// TODO: more precise approach based on knowledge of object's key?
var l_buildQuery = function (obj) {
	var query = {};
	for (var key in obj) {
		if (typeof obj[key] === 'string') {
			query[key] = obj[key];	
		}
	}
	return query;
}

// check if a given datastore needs to build key-based mapping
var l_checkMapper = function (name, data, onDone) {
	//LOG.warn('data to check:');
	//LOG.warn(data);
	
	// check if data contains key (if key is defined for this structure)
	if (l_mappers.hasOwnProperty(name)) {
		var key = l_mappers[name].key;
		if (data.hasOwnProperty(key) === false || data[key] === '' || 
			(typeof data[key] !== 'string' && typeof data[key] !== 'number')) {
			var errmsg = 'new record does not have a valid string for key field [' + key + ']';
			LOG.error(errmsg, l_name);
			UTIL.safeCall(onDone, errmsg);
			return false;
		}
	}
	return true;	
}

// build key-record mapping, if key index exists for a given datastore
// optionally can remove a previous key "old_key"
var l_buildMapper = function (name, record, remove_old) {
	// store to mapper (if exists)
	if (l_mappers.hasOwnProperty(name)) {
		var key = l_mappers[name].key;
		var mapping = l_mappers[name].mapping;

		// this check here should be redundent
		if (record.hasOwnProperty(key) === false) {
			LOG.error('new record stored does not have specified key [' + key + ']', l_name);
			return false;
		}
		
		if (remove_old === true) {
			for (var record_key in mapping) {
				if (mapping[record_key] === record) {
					delete mapping[record_key];
					LOG.warn('existing record [' + record_key + '] found, remove it!', l_name);
				}
			}
		}			
		mapping[record[key]] = record;
	}
	return true;	
}

// modify field content from object to array if the type is 'array'
var l_convertArray = function (obj, array_names) {
	
	for (var i=0; i < array_names.length; i++) {
		var key = array_names[i];
		
		if (typeof obj[key] !== 'object') {
			continue;
		}

		var array_obj = obj[key];

		LOG.warn('array field [' + key + '] is treated as object!', l_name);
		LOG.warn(array_obj, l_name);

		// convert array object to js array
		var temp_arr = [];
		for (var idx_key in array_obj) {
			temp_arr.push(array_obj[idx_key]);
		}
		LOG.warn('convert to array with element size: ' + temp_arr.length, l_name);
		LOG.warn(temp_arr, l_name);
		obj[key] = temp_arr;
	}
}

var l_createSync = function (name, src, array_fields) {
	
	return function (onSyncDone) {
		
		// make sure all arrays are re-built
		//l_remakeArray(src);
		
		// make sure object items have new structure
		// FIXME TODO: investigate why this is necessary or are there better ways to do it
		src = l_rebuildObjects(src);
		
		// direct save version
		// NOTE: very important to pass in a callback for errors, otherwise API server won't follow:
		// NOTE: too that onSyncDone may not be defined
		// ref: https://github.com/dresende/node-orm2/issues/439
		
		//src.save(function (err) {
		//	UTIL.safeCall(onSyncDone, err);
		//});
		
		var build_mapper = false;
		if (l_checkMapper(name, src)) {
						
			// first check if 'key' has been modified
			var mapping = l_mappers[name].mapping;
			var key = l_mappers[name].key;
			LOG.warn('key [' + key + '] exists for DS [' + name + ']', l_name);
			
			if (mapping.hasOwnProperty(src[key]) === false) {
				build_mapper = true;
			} else {
				if (mapping[src[key]] !== src) {
					// new key collides with an existing object with same key name
					return UTIL.safeCall(onSyncDone, 'new key [' + src[key] + '] collides with existing key!');
				}				
			}
			LOG.warn('build_mapper: ' + build_mapper);
		}

		// save twice version
		src.save(function (err) {
			if (err) {
				return UTIL.safeCall(onSyncDone, err);
			}
			
			src = l_rebuildObjects(src);
			src.save(function (err) {
				
				// rebuild key-based mapping
				if (build_mapper) {
					l_buildMapper(name, src, true);	
				}
				
				// convert 'array' types to array form instead of object
				l_convertArray(src, array_fields);
				
				UTIL.safeCall(onSyncDone, err);
			});			
		});
		
		/*
		var query = l_buildQuery(src);
		
		// get version
		l_get({
			name: name,
			query: query
		}, function (err, obj) {
			if (err) {
				return UTIL.safeCall(onSyncDone, err);	
			}
			//LOG.warn('[sync] obj found:', l_name);
			//LOG.warn(obj, l_name);
			
			// NOTE: it's VERY important to pass in callback for results otherwise .save() will fail
			//		 ORM's author does not like empty callbacks
			obj.save(function (err) {
				UTIL.safeCall(onSyncDone, err);
			});
		});
		*/
		
		// ORM version
		/*
		SR.ORM.read({
			name: name,
			query: query
		}, function (err, result) {
			if (err) {
				return UTIL.safeCall(onSyncDone, err);	
			}
			LOG.warn(result.length + ' records found for [' + name + '] in DB...', l_name);
			//LOG.warn(result, l_name);

			var obj = result[0];		
			
			LOG.warn('[sync] obj found:', l_name);
			LOG.warn(obj, l_name);
			
			// store new object
			obj.save(onSyncDone);
		});
		*/
	}
}


// load DB data to memory cache in array form
var l_load = function (arr, name, model, cache, onDone) {
		
	// DB schema definition
	var names = {};
	
	// determine attributes & their types based on a sample object 
	var attr = {};
	
	// fields that are of array-type (used to convert object content to array format)
	var array_fields = [];
	
	for (var key in model) {
		var type = model[key];
		
		if (typeof type === 'string' && l_types.hasOwnProperty(type)) {
			// for basic system-supported types
			attr[key] = l_types[type];
			
			// store fields of type 'array', to be used later
			if (type === 'array') {
				array_fields.push(key);			
			}
		} else if (type instanceof Array) {
			// for enum type (such as: [ "USA", "Canada", "Rest of the World" ])
			// see: https://github.com/dresende/node-orm2/wiki/Model-Properties
			attr[key] = type;
		} else {
			LOG.error('unknown type: ' + key, l_name);
			LOG.error(type, l_name);
		}
	}
	
	LOG.sys('[' + name + '] init with attributes:', l_name);
	LOG.sys(attr, l_name);
	
	// TODO: able to specify methods & validations in future?
	names[name] = {
		attributes: attr,
		methods: {
			//fullName: function () {
			//	return this.name + ' ' + this.surname;
			//}
		},
		validations: {
			//age: {lower: 18, upper: undefined, msg: 'under-age'}
		}
	};
				
	var settings = SR.DB.getSettings();
	
	// attempt to get from DB
	SR.ORM.init({
		DB_type:	settings.DB_type,
		username:	settings.account,
		password:	settings.password,
		DB:			settings.DB_name,
		names:		names
	}, function (err) {
		if (err) {
			return UTIL.safeCall(onDone, err);
		}
		
		//LOG.warn('[' + settings.DB_name + '] init success, read to cache...', l_name); 
		
		// read existing data 
		SR.ORM.read({
			name: name
		}, function (err, result) {

			if (err) {
				return UTIL.safeCall(onDone, err);
			}
			
			//LOG.debug(result.length + ' records found for [' + name + '] in DB...', l_name);
			//LOG.warn(result, l_name);

			// store to memory cache
			// TODO: check do we need to clone/copy value? or simply use reference is fine?
			// right now we only use references
			for (var i=0; i < result.length; i++) {
				
				result[i].sync = l_createSync(name, result[i], array_fields);

				// convert result to array form, if type is specified as 'array'
				l_convertArray(result[i], array_fields);
								
				//result[i].remake = l_remakeArray;
				arr.push(result[i]);
			}
			
			// attach function to sync in-memory data to DB
			// TODO: use prototype not dynamic function?
			// external dependency: name, arr, l_mappers
			
			// returns the size of the data items stored
			arr.size = function () {
				return arr.length;
			}
			
			arr.add = function (data, onAddDone) {
			
				LOG.sys('add new [' + name + '] entry:', l_name);
				LOG.sys(data, l_name);

				if (l_checkMapper(name, data, onAddDone) === false) {
					return;
				}
						
				// add a new entry
				SR.ORM.create({
					name: name,
					data: data
				}, function (err, record) {
					if (err) {
						return UTIL.safeCall(onAddDone, err);				
					}

					// attach sync function
					record.sync = l_createSync(name, record, array_fields);
					
					// NOTE: we need to store into the existing master array
					// this is an important step as subsequent update to this entry needs to be done
					// via this returned object instead of on the original JSON object
					// (which doesn't have methods such as 'save')
					//record.remake = l_remakeArray;
					arr.push(record);
					LOG.debug('[' + name + '] now has ' + arr.length + ' records', l_name);

					l_buildMapper(name, record);
										
					UTIL.safeCall(onAddDone, null, record);
				});
			}
		
			// external dependency: name, arr, l_mappers
			// remove a given element based on query (from both memory & DB)
			arr.remove = function (query, onRemoveDone) {
				LOG.warn('remove entry with query:', l_name);
				LOG.warn(query, l_name);
				
				// remove an entry
				SR.ORM.delete({
					name: name,
					query: query
				}, function (err) {
					if (err) {
						return UTIL.safeCall(onRemoveDone, err);				
					}
					
					// NOTE: we need to remove also from master array
					// TODO: cleaner approach?
					var index = (-1);
					for (var i=0; i < arr.length; i++) {
						var matched = true;
						for (var key in query) {
							//LOG.warn('arr[' + i + '][' + key + ']: ' + arr[i][key] + ' query[' + key + ']: ' + query[key], l_name);
							// if the query item mismatch we terminate
							if (query[key] && arr[i][key] !== query[key]) {
								matched = false;
								break;
							}
						}
						if (matched) {
							index = i;
							//LOG.warn('match found with index: ' + index, l_name);
							break;
						}
					}
					
					var errmsg = null;
					
					if (index === (-1)) {
						errmsg = 'no matching records found for query';	
					} else {
		
						// remove from mapper (if exists)
						if (l_mappers.hasOwnProperty(name)) {
							var record = arr[index];
							var key = l_mappers[name].key;
							var mapping = l_mappers[name].mapping;
							
							if (record.hasOwnProperty(key) === false) {
								LOG.error('record stored does not have the specified key [' + key + ']', l_name);
							} else {
								delete mapping[record[key]];
							}
						}
						
						arr.splice(index, 1);				
					}
					
					LOG.warn('[' + name + '] now has ' + arr.length + ' records', l_name);
					UTIL.safeCall(onRemoveDone, errmsg);
				});
			}
			
			//LOG.warn('[' + name + '] checking cache info...', l_name);
			//LOG.warn(cache, l_name);
			
			// cache it to memory	
			if (typeof cache.map === 'object') {
				var map = l_map({
					name: name,
					key: cache.key,
					map: cache.map
				});
				
				if (map) {
					UTIL.safeCall(onDone, null, {name: name, array: arr, map: map});
				} else {
					// only array is built, map is not built successfully
					UTIL.safeCall(onDone, 'build mapping failed', {name: name, array: arr});
				}
				
			} else {
				// return immediately
				//LOG.warn('[' + name + '] load success with length: ' + arr.length, l_name);	
				UTIL.safeCall(onDone, null, {name: name, array: arr});
			}
		});
	});
}

/*
	args: {
		models: 	['object']		// base model mapping from collection name to record content formats
	}
	
	models example:
	{
		'StreamGroups': {
			id:			'string',
			name:		'string',
			streams:	'object',		// array of vid
			schedule:	'object'		// array of numbers indicating schedule type (0, 1, 2)
		}
	}	
	
	caches example:
	{
		'Segments': {
			key: 'vid',
			map: l_segments		
		},
		'Recordings': {
			array: l_recordings
		},
		'StreamGroups': {
			array: l_groups
		}
	}	
	
*/
// load initial DB content to memory
var l_init = exports.init = function (args, onDone) {

	// check if DB module is enabled
	if (SR.DB.isEnabled() === false) {
		return onDone('Datastore cannot init: DB module is not loaded');	
	}

	var models = args.models;
	var caches = args.caches || {};

	if (typeof models !== 'object') {
		return UTIL.safeCall(onDone, 'models are not specified in object form');
	}

	var total = Object.keys(models).length;
	var curr = 0;

	// first check for unique key indication (by * in front of name)
	var keys = {};
	for (var name in models) {
		var model = models[name];
		for (var key in model) {
			var type = model[key];
			if (type.charAt(0) === '*') {
				if (keys.hasOwnProperty(name)) {
					LOG.error('duplicate attribute name [' + type + '] are indicated as key, ignore it...', l_name);
					continue;
				}
				// record key index
				keys[name] = key;
				
				// remove the '*'
				model[key] = type.substring(1);
			}
		}
	}
	
	// references to loaded models, key is model name, value is an array or map
	// of the loaded model
	var ref = {};
	
	// go through and load each model
	for (var name in models) {
		var model = models[name];
		
		if (typeof model !== 'object') {
			LOG.error('model is not specified in object form', l_name);
			continue;
		}

		// get reference to states in array format
		var arr = SR.State.get(name + 'Array', 'array');

		// get reference to states in key-value map format
		var map = undefined;
		
		// use specified cache reference or build one from '*' if exists
		var cache = caches[name] || {};
		
		if (Object.keys(cache).length === 0 && keys[name]) {
			map = SR.State.get(name + 'Map');
			cache = {key: keys[name], map: map};
		}
		
		var errmsg = [];
		l_load(arr, name, model, cache, function (err, result) {
			if (err) {
				LOG.error(err, l_name);
				errmsg.push(err);
			} else {
				LOG.warn('[' + result.name + '] model init successfully with ' + result.array.length + ' records.', l_name);
				// store successfully initialized model
				// NOTE: result contains name, array, map (optional) attributes
				ref[result.name] = (result.map ? result.map : result.array);	
			}

			// check if all are loaded
			if (++curr === total) {
				return UTIL.safeCall(onDone, (errmsg.length === 0 ? null : errmsg), ref);
			}
		});	
	}
}

/*
	args: {
		name: 		'string',		// name of state set to get	
		query: 		'object', 		// query condition to limit result
	}
*/
// get a particular set of DB states
var l_get = exports.get = function (args, onDone) {
	
	var name = args.name;
	var q = args.query;
	var select = args.select;			// fields the callers is interested to get
	
	// try to get it from memory first, if not found then try to get it from DB	
	// TODO: get from DB
	var arr = SR.State.get(name + 'Array', 'array');
	
	// filter query content to be only valid parameters
	// TODO: better approach?
	var query = {};
	for (var key in q) {
		// keep only valid query terms
		if (typeof q[key] !== 'undefined') {
			query[key] = q[key];
		}
	}

	LOG.warn('query term:', l_name);
	LOG.warn(query, l_name);
	
	// perform query if available (filter out irrelevant data to caller)
	var result = [];
	
	if (typeof query === 'object') {
		for (var i=0; i < arr.length; i++) {
			var matched = true;
			for (var key in query) {
				// if the query item mismatch we terminate
				if (query[key] && arr[i][key] !== query[key]) {
					matched = false;
					break;
				}
			}
			if (matched) {
				result.push(arr[i]);
			}
		}
	} else {
		result = arr;
	}
	
	// NOTE: at this point each element in 'result' is still a full ORM object (with getter/setter methods)
	//LOG.warn('result after query:');
	//LOG.warn(result);
		
	// when 'select' is specified, only keep properties that caller is interested 
	// 'select' is an array of attribute names (in string forms)
	// NOTE: after select the result is no longer ORM objects so updates cannot (and should not) be made to individual object
	// select should only be used for pure query-style actions	
	if (select instanceof Array) {
	
		// TODO: instead of creating new array, why not purge uninterested fields directly?
		var r = [];
		for (var i=0; i < result.length; i++) {

			// store only indicated attributes
			// NOTE: by storing only certain attributes, the obj here will possibly lose getter/setter properties
			var obj = {};
			for (var j=0; j < select.length; j++) {
				var key = select[j];
				obj[key] = result[i][key];
			}
			r.push(obj);
		}
		
		result = r;
	}

	// append functions
	// NOTE: this works even if select is specified and the attributes returned is only a subset
	result.add = arr.add;
	result.remove = arr.remove;
	result.size = arr.size;
		
	//LOG.warn('result after select:');
	//LOG.warn(result);
	
	// if query is specified, we may need to return only the object that matches the query
	if (Object.keys(query).length > 0) {

		var obj = null;
		
		// check if only one matching result found using query terms (returns the matched object only)	
		if (result.length === 1) {
			obj = result[0];			
			LOG.warn('return [' + name + '] query result as single object: ', l_name);
		}

		// we return an object and the full array
		// NOTE: object is valid if only one matched result is found, otherwise it'd be 'null'		
		UTIL.safeCall(onDone, null, obj, result);
	} else {
		UTIL.safeCall(onDone, null, result);	
	}
}

// locally created mappers
var l_mappers = {};

/*
	args: {
		name: 		'string',		// name of state set to build mapping	
		key:		'string',		// which key will be used as main index
		map:		'object'		// an externally provided js object to store the mapping into (optional)
	}
*/
// build and return a mapping relations from key value to stored elements in array
var l_map = exports.map = function (args, onDone) {

	var errmsg = null;
	
	// get data in array form first
	var arr = SR.State.get(args.name + 'Array', 'array');
	
	var map = args.map || {};
	var key = args.key;
	
	for (var i=0; i < arr.length; i++) {
		if (typeof arr[i] === 'function')
			continue;
		
		var record = arr[i];
		
		if (record.hasOwnProperty(key) === false) {
			errmsg = '[' + args.name + '] no key [' + key + '] can be found to build mapper';
			LOG.error(errmsg, l_name);
			UTIL.safeCall(onDone, errmsg);
			return undefined;
		}
		
		if (record[key] === '') {
			LOG.error('[' + args.name + '] record has empty key value!', l_name);
			continue;
		}
		
		if (map.hasOwnProperty(record[key]) === true) {
			LOG.error('[' + args.name + '] key [' + record[key] + '] exists, duplicate keys found at row: ' + (i+1) + '!', l_name);
		}
		map[record[key]] = record;
	}
	
	// append add/remove element functions
	map.add = arr.add;
	map.remove = arr.remove;
	map.size = arr.size;
	
	// store the mapping relations & the key name used
	l_mappers[args.name] = {
		mapping: map,
		key: key
	};
	
	UTIL.safeCall(onDone, null, map);
	return map;
}

// fill in the value for a key with multiple element into an object
var l_fill = exports.fill = function (obj, key, value) {
	try {
		var expression = "obj['" + key.replace('.' ,'\'][\'') + '\'] = value;';
		eval(expression);		
		return true;
	} catch (e) {
		LOG.error(e);
		return false;
	}
}
