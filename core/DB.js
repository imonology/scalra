/*
//
//
// db.js
//
// DB Management
//
// for mongo driver usage, see doc:
//    https://github.com/christkv/node-mongodb-native/blob/master/Readme.md
//
// history:
//	2014-06-21 change return value in onDone to true/false instead of messages

supported functions:

// standard init/dispose for everything (used by modulized DB loading)
// config: {collections: <array>, shutdown_if_fail: <bool>}
init(config, onDone)

// setup a number of collections, load from DB if already exist
// 開啟資料庫 Collections
//
// [I] str[] name: 欲建立的 Collection 名稱字串
// [O]
initCollections(name, onDone)

// add a collection to those to be initialized
// 新增一組 collection 名稱以利初始化
//
// [I] str[] names: 欲建立的 Collection 名稱字串集合
// [O]
useCollections(names, onDone)

// add a new collection to be used during run-time
// 新增一組 collection 名稱可使用
//
// [I] str[] names: 欲建立的 Collection 名稱字串集合
// [O]
addCollection(name, onDone)

// convert a UUID string to javascript object form
// 把 UUID 從字串轉成 object 型態
//
// [I] str uuid_str: 字串型態的 UUID
// [O]
toObjectID(uuid_str)

// store a given data record to a collection, create new record if not exist
// 儲存某筆資料到 Collection 中, 若不存在會存新資料
//
// [I] str clt_name:    collection 名稱
// [I] obj data:        資料內容的 record
// [O] obj onSuccess:   存成功的資料 record
// [O] str onFail:      錯誤訊息
setData(clt_name, data, onSuccess, onFail)

// get a record from a given collection
// 從某個 Collection 中抓出一筆資料 Record
//
// [I] str clt_name: collection 名稱
// [I] obj query:       搜尋條件內容
// [O] obj onSuccess:   符合結果的一筆 record
// [O] str onFail:      錯誤訊息
getData(clt_name, query, onSuccess, onFail)

// update a given data record to a collection
// 更新 Collection 中某筆資料
//
// [I] str clt_name: collection 名稱
// [I] obj query:       具體的搜尋內容
// [I] obj data:        資料內容的 record
// [O] obj onSuccess:   更新成功的資料 record
// [O] str onFail:      錯誤訊息
updateData(clt_name, query, data, onSuccess, onFail)

// delete a given data record to a collection
// 刪除 Collection 中某筆資料
//
// [I] str clt_name:    collection 名稱
// [O] obj onSuccess:   刪除成功的資料 record
// [O] str onFail:      錯誤訊息
// [I] str query_or_id: 欲刪除 record 的 uuid (_id)
//     obj query_or_id	欲刪除 record 內的欄位
deleteData(clt_name, onSuccess, onFail, id_or_obj)

// remove a particular field within a record
// 將某筆 record 內的屬性移除
//
// [I] str clt_name:    collection 名稱
// [I] obj query:       具體的搜尋內容
// [I] obj field:       欲刪除的屬性
// [O] obj onSuccess:   刪除成功
// [O] str onFail:      錯誤訊息
removeField(clt_name, query, field, onSuccess, onFail)

// increment/decrement a given data by some number
// 替某筆資料增加/減少某數值
//
// [I] str clt_name:    collection 名稱
// [I] obj query:       欲更改的欄位
// [I] num change:      增減之數值
// [O] obj onSuccess:   成功的回傳
// [O] str onFail:      錯誤訊息
incrementData(clt_name, query, change, onSuccess, onFail)


// count the number of records in a collection
// 算 Collection 中資料數
//
// [I] str clt_name:    collection 名稱
// [O] obj onSuccess:   資料個數
// [O] str onFail:      錯誤訊息
count(clt_name, onSuccess, onFail)

// get an array of records matching a query from a given collection
// 從某個 Collection 中抓出符合搜尋條件的多筆資料 Record
//
// [I] str clt_name:    collection 名稱
// [O] obj[] onSuccess: 符合結果的多筆 record
// [O] str onFail:      錯誤訊息
// [I] obj query:       搜尋條件的 js object (例: {account:account, _id:objID})
// [I] obj condition:   條件 (例: {limit: mail_limit, sort:[['send_time', -1]]})
getArray(clt_name, onSuccess, onFail, query, condition)

// update elements in an array that matches a query from a given collection
// 從某個 Collection 中的特定欄位更新某個特定陣列內容
//
// [I] str clt_name:    collection 名稱
// [I] obj query:       搜尋條件的 js object (例: {account: account, _id:objID})
// [I] obj array_data:	欲更新的陣列資料 (例: { field1: [ value1, value2, value3 ] })
// [O] str onSuccess:   成功訊息
// [O] str onFail:      錯誤訊息
updateArray(clt_name, query, array_data, onSuccess, onFail)


// get a record from a given collection
// 從某個 Collection 取得所有 records 或單筆 record 並存於 cache
// 若已存在 cache 中則不會有 DB 讀取
//
// 說明: 若 query_item 未提供, 則會把該 collection 所有 records 都一次讀出
// 若有設 query_item, 則只會傳回符合的資料
//
// [I] str clt_name:    collection 名稱
// [O] obj onSuccess:   符合結果的一筆 record, 或全部 records 的陣列
// [O] str onFail:      錯誤訊息
// [I] obj query_item:  針對特定 record 的條件 (例: {account: acc})
getCachedData(clt_name, onSuccess, onFail, query_item)

// store back a cached record to DB
// 將 cached 中存的 records 存回 DB 的 collection
//
// [I] str clt_name:    collection 名稱
// [I] str id:          該筆 record 的 id
// [O] obj onSuccess:   存成功的 record
// [O] str onFail:      錯誤訊息
syncCachedDataByID(clt_name, id, onSuccess, onFail)

// delete a cached record
// 將 cached 中存的 record 刪除
//
// [I] str clt_name:    collection 名稱
// [I] str id:          該筆 record 的 id
// [O] obj onSuccess:   存成功的 record
// [O] str onFail:      錯誤訊息
deleteCachedDataByID(clt_name, id, onSuccess, onFail)

// update a cached record
// 將 cached 中存的 record 某些欄位更新
//
// [I] str clt_name:    collection 名稱
// [I] str id:          該筆 record 的 id
// [I] obj new_values:  欲修改的新值
// [O] obj onSuccess:   存成功的 record
// [O] str onFail:      錯誤訊息
updateCachedDataByID(clt_name, id, new_values, onSuccess, onFail)

// initialize DB
// 初始化 DB
//
// [I] obj setting:     基本設定
// [I] str[] names:     相關 collection 名稱
// [O] onDone:          結束通知
initDB(setting, names, onDone)

// shutdown DB
// 關閉 DB
//
// [O] onDone:          結束通知
disposeDB(onDone)

// 2012-05-10  inital version
//             (refactored code from aere_lobby_db.js)
//
// 2013-10-15  make individual project to have own DB (instead of individual server) to save space
*/


//-----------------------------------------
// define local variables
//
//-----------------------------------------

var l_name = 'SR.DB';

var promise = require('bluebird');

// reference to DB object
var l_DBconn = {};

// DB client
var l_DBclient = {};

// collection objects, a two-level map (first: DB name, second: collection name)
var l_clts = {};

// default DB name (when not provided)
var l_DBname = undefined;

// names of project collections
var l_names = [];

// names of scalra DB collections
var l_SRnames = [SR.Settings.DB_NAME_STAT,
				 SR.Settings.DB_NAME_PAYMENT,
				 SR.Settings.DB_NAME_ACCOUNT,
				 SR.Settings.DB_NAME_SYSTEM,
				 SR.Settings.DB_NAME_SYS_EVENT];

// DB setting
var l_DBsetting = undefined;


//-----------------------------------------
// define local functions
//
//-----------------------------------------

// get a particular collection instance
// NOTE: we do not allow DB_name to be specified (better security)
var l_getCollection = exports.getCollection = function (clt_name, onFail) {

	var DB_name = l_DBname;

    if (l_clts.hasOwnProperty(DB_name) === false || l_clts[DB_name].hasOwnProperty(clt_name) === false) {

		/* TODO: make DB init easier and automatic?
		LOG.warn('DB name [' + clt_name + '] not known previously, initialize it... Please try to use SR.DB.useCollections beforehand to initialize DBs to be used', l_name);
		l_addCollection(clt_name, function (result) {

		});
		*/

		// first check if DB is not loaded/inited at all
		if (Object.keys(l_DBconn).length === 0) {
			LOG.error('All DB functions are disabled as DB module is not loaded', l_name);
			return undefined;
		}

		if (onFail) {
		    LOG.error('DB [' + DB_name + '] collection [' + clt_name + '] invalid', 'SR.DB');
			LOG.error('did you forget to specify collection name using SR.DB.useCollections()?', 'SR.DB');
		    if (typeof clt_name === 'object') {
			    LOG.error(clt_name, 'SR.DB');
		    }
		    LOG.stack();
		    UTIL.safeCall(onFail, 'invalid DB/collection pair');
		}
		return undefined;
	}

	// return collection instance
    return l_clts[DB_name][clt_name];
}

var l_getCollectionAsync = exports.getCollectionAsync = function(clt_name){
	return new promise(function(resolve, reject) {
		l_getCollection(clt_namem, reject);
		// var result = l_getCollection(clt_namem, reject);
		// resolve(result);
	});
}

// helper to notify DB error
var l_notifyError = function (clt_name, op, err, onFail, is_exception) {

	var msg = 'DB ' + op + ' error for [' + clt_name + ']';
    LOG.error(msg, 'SR.DB');
	LOG.error(err, 'SR.DB');
	if (typeof err.stack !== 'undefined') {
		LOG.error(err.stack, 'SR.DB');
		msg += ('\n\n' + err.stack);
	}
	UTIL.safeCall(onFail, err);

	if (is_exception) {
		return;
	}

	// notify project admin if it's not code exception
	// NOTE: only project admins are notified
	UTIL.notifyAdmin(
		'[SR DB error: ' + clt_name + ']',
		msg
	);
}

var l_notifyErrorAsync = function(clt_name, op, err, is_exception){
	return new promise(function(resolve, reject) {
		l_notifyError(clt_name, op, err, reject, is_exception);
	});
}

//---------------------------------------------------
// callback to load existing DB collections to memory

var l_initCollection = function (DB_name, name, onDone, prefix) {

	//LOG.warn('init ' + DB_name + ' collection: ' + name, 'SR.DB');

	if (l_DBclient.hasOwnProperty(DB_name) === false) {
		LOG.error('DBclient not init or authenticated for DB [' + DB_name + ']', 'SR.DB');
		return UTIL.safeCall(onDone, false);
	}

	// check if already init
	if (l_getCollection(name, undefined, DB_name) !== undefined) {
		LOG.warn('DB [' + DB_name + '] collection [' + name + '] already loaded', 'SR.DB');
		LOG.warn('please check if different codes are using the same collection names', 'SR.DB');
		// NOTE: we assume double declaration of collection name is ok
		return UTIL.safeCall(onDone, true);
	}

	// build collection name to prefix with server name or a specified prefix
	var collection_name = (prefix || SR.Settings.SERVER_INFO.name) + ':' + name;

	// original simple version
	//var collection_name = name;

    l_DBclient[DB_name].collection(collection_name,
        function (err, collection) {
            if (err) {
                LOG.error(err, 'SR.DB');
				LOG.error('init DB [' + DB_name + ' ] collection [' + collection_name + '] error', 'SR.DB');
				UTIL.safeCall(onDone, false);
			} else {
				// store each name as a collection entry in collection object
				// collection name, instance(conn) , cache (idx by _id)
				var msg = 'init DB [' + DB_name + '] collection [' + collection_name + '] success';
				LOG.debug(msg, 'SR.DB');
				if (l_clts.hasOwnProperty(DB_name) === false) {
					l_clts[DB_name] = {};
				}

				// store collection instance into a two-level map
				l_clts[DB_name][name] = collection;

				// attach entity list to collection (for object caching)
				l_clts[DB_name][name].cache = {};

				UTIL.safeCall(onDone, true);
			}
        }
    );
}

var l_initCollectionAsync = function(DB_name, name, prefix) {
	return new promise(function(resolve, reject) {
		l_initCollection(DB_name, name, resolve, prefix);
	});
}

// helper
var l_add = function (name) {

	return function (onD) {
		l_addCollection(name, onD);
	}
}

// add a collection to those to be initialized
exports.useCollections = function (names, onDone) {

	// auto-convert format
	if (typeof names === 'string') {
		names = [names];
	}

	// check if DB is started yet, if not, we store to names first
	// if so, then we use addCollection to init the individual DB
	if (Object.keys(l_DBclient).length === 0) {

		// simply store
		for (var i in names) {
			l_names.push(names[i]);
		}

		UTIL.safeCall(onDone);
		return;
	}

	// call addCollection (dynamically loading)
	var jq = SR.JobQueue.createQueue();
	for (var i=0; i < names.length; i++) {
		var name = names[i];
		LOG.sys('init collection [' + name + '] dynamically...', 'SR.DB');
		jq.add(l_add(name));
	}
	jq.run(onDone);
}

// FIXME: onDone for resolve or reject?
exports.useCollectionsAsync = function(names){
	return new promise(function(resolve, reject) {
		useCollections(names, resolve);
	});
}

// add a new collection to be used during run-time
// returns a message string
var l_addCollection = exports.addCollection = function (name, onDone) {

	// check DB name exists
	if (typeof l_DBname === 'undefined') {
		var msg = 'DB name not initialized';
		LOG.error(msg, 'SR.DB');
		LOG.stack();
		UTIL.safeCall(onDone, false);
	}

	LOG.sys('adding a new collection [' + name + ']', 'SR.DB');

	l_initCollection(l_DBname, name, function (result) {
		UTIL.safeCall(onDone, result);
	});
}

// FIXME: onDone for resolve or reject?
var l_addCollectionAsync = exports.addCollectionAsync = function (name) {
	return new promise(function(resolve, reject) {
		l_addCollection(name, resolve);
	});
}

//-----------------------------------------
// define external functions
//
//-----------------------------------------

exports.isEnabled = function () {
	// first check if DB is not loaded/inited at all
	if (Object.keys(l_DBconn).length === 0) {
		return false;
	}
	return true;
}

//-----------------------------------------
// convert a string to objectID
var l_toObjectID = exports.toObjectID = function (s) {

    var str = s;

    if (typeof s === 'object') {

        // see if already an object ID
        if (typeof s.toHexString === 'function') {
			return s;
        } else {
            LOG.warn('not objectID, return undefined', 'SR.DB');
            return undefined;
        }
    }

    try {
		var obj = new SR.mongo.ObjectID(str);
        return obj;
    }
    catch (e) {
        LOG.error('convert to ObjectID failed for: ' + str, 'SR.DB');
        return undefined;
    }
};

//-----------------------------------------
// store some data given collection name
// NOTE: this will allow entries be both inserted & updated
//          data with the same id will be overwritten
// NOTE: the data field may be inserted a '_id' field after the operation
var l_setData = exports.setData = function (clt_name, data_obj, onSuccess, onFail) {

	// error check
	var collection = l_getCollection(clt_name, onFail);
	if (collection === undefined) {
		return;
	}

	try {

		LOG.sys('[' + clt_name + '] saving record: ' + JSON.stringify(data_obj), 'SR.DB');

		// make a copy of data
		var data = UTIL.clone(data_obj);

		// TODO: to check how & when resursive DB write can happen
		// NOTE: it seems like there's recursive DB write occur when performing
		collection.save(
			data,
			function (err, passed_data) {
				if (err) {
					l_notifyError(clt_name, 'setData', err, onFail);
				} else {
					// NOTE: the data passed back is the saved data
					LOG.sys('[' + clt_name + '] saving record success: ' + JSON.stringify(data_obj), 'SR.DB');
					UTIL.safeCall(onSuccess, passed_data);
				}
			}
		);
	}
	catch (err) {
		l_notifyError(clt_name, 'setData.exception', err, onFail, true);
	}
}

var l_setDataAsync = exports.setDataAsync = function (clt_name, data_obj) {
	return new promise(function(resolve, reject) {
		l_setData(clt_name, data_obj, resolve, reject);
	});
}

//-----------------------------------------
// extract a particular DB document by ID
exports.getData = function (clt_name, query, onSuccess, onFail) {

    //LOG.sys('clt_name: ' + clt_name + ' query: ' + JSON.stringify(query), 'SR.DB');

    // error check
	var collection = l_getCollection(clt_name, onFail);
	if (collection === undefined) {
		return;
	}

	// get data from newest to oldest
	var options = {
		"limit": 1,
		//"skip": 10,
		"sort": [['_id', 'desc']]
	};

	try {
		// TODO: change to find()
        collection.findOne(query, options,
            function (err, cursor) {

                if (err) {
					return l_notifyError(clt_name, 'getData', err, onFail);
                }

                // check if the returned cursor is empty
                if (cursor === null ||
                    cursor === '') {

                    LOG.debug('[' + clt_name + '] null returned for query: ' + JSON.stringify(query), 'SR.DB');
					UTIL.safeCall(onSuccess, null);
                    return;
                }

				UTIL.safeCall(onSuccess, cursor);
            }
        );
	}
	catch (err) {
		l_notifyError(clt_name, 'getData.exception', err, onFail, true);
	}
}

exports.getDataAsync = function(clt_name, query) {
	return new pormise(function(resolve, reject) {
		l_getData(clt_name, query, resolve, reject);
	});
}

//-----------------------------------------
var l_updateData = exports.updateData = function (clt_name, query, data_obj, onSuccess, onFail) {

	// error check
	var collection = l_getCollection(clt_name, onFail);

	if (collection === undefined) {
		return;
	}

	try {

		// make a copy of data for manipulation
		var data = UTIL.clone(data_obj);

		// check and remove _id field if exists, as update should not replace the _id field already in DB
		if (data.hasOwnProperty('_id')) {
			LOG.warn('data to update has _id field [' + data._id + ']. remove it!', 'SR.DB');
			delete data["_id"];
		}

		// NOTE: we by default use 'upsert' and 'multi', so it'll be an insert if record does not exist,
		// also, if multiple records match, they will all be modified
		// 'multi' and 'upsert' as option is available after mongoDB 2.2
		// see: http://docs.mongodb.org/manual/core/update/

		if (data.hasOwnProperty('bare')) {
			console.log("db data");
			console.log(data);

			collection.update(
				query,
				data.bare,
				{multi: true, upsert: true},
				function (err) {
					if (err) {
						l_notifyError(clt_name, 'updateData', err, onFail);
					} else {
						UTIL.safeCall(onSuccess, 'updated');
					}
				}
			);
		} else {
			collection.update(
				query,
				{$set: data},
				{multi: true, upsert: true},
				function (err) {
					if (err) {
						l_notifyError(clt_name, 'updateData', err, onFail);
					} else {
						UTIL.safeCall(onSuccess, 'updated');
					}
				}
			);
		}
	}
	catch (err) {
		l_notifyError(clt_name, 'updateData.exception', err, onFail, true);
	}
}

var l_updateDataAsync = exports.updateDataAsync = function (clt_name, query, data_obj) {
	return new promise(function(resolve, reject) {
		l_updateData(clt_name, query, data_obj, resolve, reject);
	});
}


//-----------------------------------------
var l_deleteData = exports.deleteData = function (clt_name, onSuccess, onFail, query_or_id) {

    //LOG.warn('removing collection [' + clt_name + ']', 'SR.DB');

    // error check
	var collection = l_getCollection(clt_name, onFail);
	if (collection === undefined) {
		return;
	}

    // if id is not specified, means to remove all records,
    // default query is {}
    var query = {};

    if (typeof query_or_id === 'string') {
        query = {_id:query_or_id};
    } else if (typeof query_or_id === 'object') {
        query = query_or_id;
    }

	try {
        collection.remove(query,
            function (err, res) {
                if (err) {
					l_notifyError(clt_name, 'deleteData', err, onFail);
                } else {
                    //LOG.warn('remove collection [' + clt_name + '] successful', 'SR.DB');
                    UTIL.safeCall(onSuccess, res);
                }
            }
        );
	}
	catch (err) {
		l_notifyError(clt_name, 'deleteData.exception', err, onFail, true);
	}
}

var l_deleteDataAsync = exports.deleteDataAsync = function (clt_name, query_or_id) {
	return new promise(function(resolve, reject) {
		l_deleteData(clt_name, resolve, reject, query_or_id);
	});
}

// remove a particular field within a record
// ref: http://stackoverflow.com/questions/6851933/how-do-i-remove-a-field-completely-from-mongo
var l_removeField = exports.removeField = function (clt_name, query, field, onSuccess, onFail) {

    // error check
	var collection = l_getCollection(clt_name, onFail);
	if (collection === undefined) {
		return;
	}

	try {
		var action = {};
		action[field] = 1;

		collection.update(query, {$unset: action},
            function (err, res) {
                if (err) {
					l_notifyError(clt_name, 'removeField', err, onFail);
                } else {
                    LOG.sys('remove field (' + field + ') from collection [' + clt_name + '] record ' + JSON.stringify(query) + ' successful', 'SR.DB');
                    UTIL.safeCall(onSuccess, res);
                }
            }
        );
	}
	catch (err) {
		l_notifyError(clt_name, 'removeField.exception', err, onFail, true);
	}
}

var l_removeFieldAsync = exports.removeFieldAsync = function (clt_name, query, field) {
	return new promise(function(resolve, reject) {
		l_removeField(clt_name, query, field, resolve, reject);
	});
}

//-----------------------------------------
// increase a given field by a certain amount
var l_incrementData = exports.incrementData = function (clt_name, query, change, onSuccess, onFail) {

    // error check
	var collection = l_getCollection(clt_name, onFail);
	if (collection === undefined) {
		return;
	}

    try {
        LOG.sys('[' + clt_name + '] increment record: ' + JSON.stringify(query), 'SR.DB');

        // make this update an 'upsert' (insert if not exist)
        // also 'multi' (if multiple records match, then they will all be modified)
        collection.update(query, {$inc: change},
            function (err) {

                if (err) {
					l_notifyError(clt_name, 'incrementData', err, onFail);
                } else {
					UTIL.safeCall(onSuccess, 'updated');
                }
            }
        );
    }
    catch (err) {
		l_notifyError(clt_name, 'incrementData.exception', err, onFail, true);
    }
}

var l_incrementDataAsync = exports.incrementDataAsync = function (clt_name, query, change) {
	return new promise(function(resolve, reject) {
		l_incrementData(clt_name, query, change, resolve, reject);
	});
}

//-----------------------------------------
// count the number of records in a collection
exports.count = function (clt_name, onSuccess, onFail) {

    // error check
	var collection = l_getCollection(clt_name, onFail);
	if (collection === undefined) {
		return;
	}

    var count = collection.find({}).count(function (e, count) {
	    UTIL.safeCall(onSuccess, count);
    });
}

exports.countAsync = function (clt_name) {
	return new promise(function(resolve, reject) {
		l_count(clt_name, resolve, reject);
	});
}


//-----------------------------------------
// extract a particular DB array
// NOTE: if array does not exist, it may return a valid (but empty) array
exports.getArray = function (clt_name, onSuccess, onFail, query, condition, start, end) {

    // error check
	var collection = l_getCollection(clt_name, onFail);
	if (collection === undefined) {
		return;
	}

    // default is to get all without query string
	query = query || {};
	condition = condition || {};

	LOG.sys('[' + clt_name + '] getArray, query: ' + JSON.stringify(query) + ' condition: ' + JSON.stringify(condition), 'SR.DB');
	try {

        collection.find (query, condition,
            function (err, cursor) {

                if (err) {
					l_notifyError(clt_name, 'getArray.find', err, onFail);
                    return;
                }

                // found nothing
                if (cursor === null) {
					LOG.warn('[' + clt_name + '] null returned for query: ' + JSON.stringify(query), 'SR.DB');
				    UTIL.safeCall(onSuccess, null);
                    return;
                }

				// NOTE: we first sort before skip, because we expect to skip from the newest, not oldest
				// however, Mongo's default is to skip from oldest

				if (start !== undefined) {
					var limit = ((end === undefined || end == 0) ? 0 : end-start+1);
					cursor.sort({_id: -1}).skip(start).limit(limit);
				}

                // convert result to an array
                cursor.toArray(
                    function (err, array) {

						//LOG.sys('calling cursor.toArray success', 'SR.DB');

                        if (err) {
							return l_notifyError(clt_name, 'getArray.toArray', err, onFail);
                        }

						// reverse if we've applied start & end
						// NOTE: this is a hack, prefer to have better way..
						if (start !== undefined) {
							array.reverse();
						}

						LOG.sys('array found succces, length: ' + array.length, 'SR.DB');
                        // NOTE: probably no need to check
						UTIL.safeCall(onSuccess, array);
                    }
                );
            }
        );
	}
	catch (err) {
		l_notifyError(clt_name, 'getArray.exception', err, onFail, true);
	}
};

exports.getArrayAsync = function (clt_name, query, condition, start, end) {
	return new promise(function(resolve, reject) {
		l_getArray(clt_name, resolve, reject, query, condition, start, end);
	});
};

exports.getPageBySkippingDocs = function (clt_name, query, opts, page_num, cb) {
	// error check
	var collection = l_getCollection(clt_name, cb);
	if (collection === undefined) {
		return;
	}

	// default is to get all without query string
	var _query = Object.create(query) || {};
	var _opts = Object.create(opts) || {};
	_opts.sort = {_id: -1};

	if (_opts.limit === undefined) {
		_opts.limit = 0;
	}

	if (page_num) {
		_opts.skip = _opts.limit * page_num;
	}

	//LOG.sys('[' + clt_name + '] getPage, query: ' + JSON.stringify(_query) + ' opts: ' + JSON.stringify(_opts), 'SR.DB');

	var cb_find = function (err_find, cursor) {

		if (err_find) {
			l_notifyError(clt_name, 'getPage.find', err_find, cb);
			return;
		}

		// convert result to an array
		var cb_toArray = function (err_toArray, array) {

			if (err_toArray) {
				return l_notifyError(clt_name, 'getPage.toArray', err_toArray, cb);
			}

			//LOG.sys('array found succces, length: ' + array.length, 'SR.DB');
			// NOTE: probably no need to check
			if (array.length === _opts.limit) {
				UTIL.safeCall(cb, null, array, array[array.length - 1]);
			} else {
				UTIL.safeCall(cb, null, array, null);
			}
		};
		cursor.toArray(cb_toArray);
	};
	collection.find(_query, _opts, cb_find);
};

exports.getPageBySkippingDocsAsync = function (clt_name, query, opts, page_num) {
	return new promise(function(resolve, reject) {
		l_getPageBySkippingDocs(clt_namem, query, opts, page_num, reject);
	});
};

exports.getPageByReferDoc = function (clt_name, query, opts, refer_doc, cb) {
	// error check
	var collection = l_getCollection(clt_name, cb);
	if (collection === undefined) {
		return;
	}

	// default is to get all without query string
	var _query = Object.create(query) || {};
	var _opts = Object.create(opts) || {};
	_opts.sort = {_id: -1};

	if (refer_doc) {
		_query._id = {$lt: refer_doc._id};
	}

	//LOG.sys('[' + clt_name + '] getPage, query: ' + JSON.stringify(_query) + ' opts: ' + JSON.stringify(_opts), 'SR.DB');

	var cb_find = function (err_find, cursor) {

		if (err_find) {
			l_notifyError(clt_name, 'getPage.find', err_find, cb);
			return;
		}

		// convert result to an array
		var cb_toArray = function (err_toArray, array) {

			if (err_toArray) {
				return l_notifyError(clt_name, 'getPage.toArray', err_toArray, cb);
			}

			//LOG.sys('array found succces, length: ' + array.length, 'SR.DB');
			// NOTE: probably no need to check
			if (array.length === _opts.limit) {
				UTIL.safeCall(cb, null, array, array[array.length - 1]);
			} else {
				UTIL.safeCall(cb, null, array, null);
			}
		};
		cursor.toArray(cb_toArray);
	};
	collection.find(_query, _opts, cb_find);
};

exports.getPageByReferDocAsync = function (clt_name, query, opts, refer_doc) {
	return new promise(function(resolve, reject) {
		l_getPageByReferDoc(clt_name, query, opts, refer_doc, reject);
	});
};

var l_Pages = {};

exports.paginate = function (name, clt_name, query, opts, cb) {
	l_Pages[name] = {
		clt_name: clt_name,
		query: query,
		opts: opts,
		refer_docs: [null]
	};

	var initReferDocs = function (err_getPageByReferDoc, docs, last_doc) {
		if (err_getPageByReferDoc) {
			var err = new Error(err_getPageByReferDoc.toString());
			err.name = "paginate Error";
			UTIL.safeCall(cb, err);
		} else {
			if (last_doc) {
				l_Pages[name].refer_docs.push(last_doc);
				exports.getPageByReferDoc(clt_name, query, opts, last_doc, initReferDocs);
			} else {
				if (docs.length === 0 ) {
					l_Pages[name].refer_docs.pop();
				}
				UTIL.safeCall(cb, null);
			}
		}
	};
	exports.getPageByReferDoc(clt_name, query, opts, null, initReferDocs);
};

exports.paginateAsync = function (name, clt_name, query, opts) {
	return new promise(function(resolve, reject) {
		l_paginate(name, clt_name, query, opts, reject);
	});
}

exports.getPage = function (name, page_num, cb) {
	var page = l_Pages[name];
	//LOG.warn(page, 'SR.DB');
	exports.getPageByReferDoc(page.clt_name, page.query, page.opts, page.refer_docs[page_num], cb);
};

exports.getPageAsync = function(name, page_num) {
	return new promise(function(resolve, reject) {
		l_getPage(name, page_num, reject);
	});
}

// update elements in an array that matches a query from a given collection
// NOTE: to insert a single element to an array: { scores: 89 }
//       to insert multiple elements: { scores: { $each: [ 90, 92, 85 ] }
//
// ref:
// http://docs.mongodb.org/manual/reference/operator/update/push/#up._S_push
// http://stackoverflow.com/questions/10383682/mongodb-update-insert-a-list-of-item-to-an-array
// http://docs.mongodb.org/manual/reference/operator/update/pushAll/#pushall
// NOTE: pushAll is Deprecated since version 2.4: Use the $push operator with $each instead.
//
exports.updateArray = function (clt_name, query, data, onSuccess, onFail) {
    // error check
	var collection = l_getCollection(clt_name, onFail);
	if (collection === undefined) {
		return;
	}

	// assume single element
	var operation = {$push: data};

	// try to see if inserting multiple elements
	for (var key in data) {
		if (data[key] instanceof Array) {
			//LOG.warn('multiple elements detected for: ' + key, 'SR.DB');
			// before Mongo 2.4
			operation = {$pushAll: data};
			break;
			// after Mongo 2.4 (convert one by one via key)
			//data[key] = {$each: data[key]};
		}
	}

    try {
		// NOTE: to push mulitple array elements at once, add $each
		// see: http://docs.mongodb.org/manual/reference/operator/update/push/
		collection.update(query, operation,
            function (err) {

                if (err) {
					l_notifyError(clt_name, 'updateArray', err, onFail);
                } else {
					UTIL.safeCall(onSuccess, 'array updated');
				}
            }
        );
    }
    catch (err) {
		l_notifyError(clt_name, 'updateArray.exception', err, onFail, true);
    }
}

exports.updateArrayAsync = function (clt_name, query, data) {
	return new promise(function(resolve, reject) {
		l_updateArray(clt_name, query, data, resolve, reject);
	});
}

// to remove array element
// ref: http://stackoverflow.com/questions/9048424/removing-specific-items-from-array-with-mongodb
// TODO: removeArray


// helper to check if a javascript object is empty
var l_isEmpty = function (obj) {
   return (Object.keys(obj).length === 0);
}

//-----------------------------------------
// cache data for a given collection
var l_cacheData = function (clt_name, onSuccess, onFail, query_obj) {

    // error check
	var collection = l_getCollection(clt_name, onFail);
	if (collection === undefined) {
		return;
	}

    var is_empty = (query_obj === undefined ||
                    l_isEmpty(query_obj));
    var query = {};

    // check if there's a specific query
    if (query_obj !== undefined) {
        query = query_obj;
    }

    // if not in cache, get data from DB and cache in memory
    //LOG.sys('data caching from [' + clt_name + '], query: ' + query + '...', 'SR.DB');

	try {

        // load all documents from the DB
        collection.findOne(query,
            function (err, data)
            {
                if (err) {
					return l_notifyError(clt_name, 'cacheData', err, onFail);
                }

                // something returned but is empty
                if (data === undefined ||
                    data === null ||
                    data === '') {

                    LOG.warn('data not found for [' + clt_name + '] query: ' + JSON.stringify(query), 'SR.DB');
                    return UTIL.safeCall(onSuccess, null);
                }

                // store all if is_empty, or store single object
                if (is_empty) {
                    collection.cache = data;
                    //LOG.sys('caching all objects...', 'SR.DB');
                } else {
                    collection.cache[data._id] = data;
                    //LOG.sys('caching single object, query: ' + query_obj, 'SR.DB');
                }

                //LOG.sys('returning data for id: ' + data._id, 'SR.DB');
                UTIL.safeCall(onSuccess, data);
            }
        );
	}
	catch (err) {
		l_notifyError(clt_name, 'cacheData.exception', err, onFail, true);
	}
}

var l_cacheDataAsync = function (clt_name, query_obj) {
	return new promise(function(resolve, reject) {
		l_cacheData(clt_name, resolve, reject, query_obj);
	});
}

//-----------------------------------------
// get cache data from a given collection
// or if not yet cached, get from DB
// 'query_item' is optional, can be either a string (id of record), or an object (query object)
var l_getCachedData = exports.getCachedData = function (clt_name, onSuccess, onFail, query_item) {

	var collection = l_getCollection(clt_name, onFail);
	if (collection === undefined) {
		return;
	}

    // a query term to DB if data of interest is not yet cached
    var query = {};

    // if no search term is specified (cached all)
    if (query_item === undefined) {
        // return directly if already cached
        if (Object.keys(collection.cache).length > 0) {
		    UTIL.safeCall(onSuccess, collection.cache);
            return;
        }
    }
    // some condition is provided
    else {

        // check if query_item is already an object id
        var objID = l_toObjectID(query_item);

        // query term is an objectID in string format, or an object with properties
        if (objID !== undefined) {

			// return cached object if available
            if (collection.cache.hasOwnProperty(objID)) {
                UTIL.safeCall(onSuccess, collection.cache[objID]);
                return;
            }

            query = {_id: objID};
        } else if (typeof query_item === 'object') {
            query = query_item;
        } else {
            LOG.error('invalid query_item in collection: ' + clt_name, 'SR.DB');
            LOG.error(query_item, 'SR.DB');
			UTIL.safeCall(onFail, 'invalid query item');
            return;
        }
    }

    // if entry doesn't exist, load it from DB
    l_cacheData(clt_name,
        onSuccess,
        onFail,
        query
    );
}

var l_getCachedDataAsync = exports.getCachedDataAsync = function (clt_name, query_item) {
	return new promise(function(resolve, reject) {
		l_getCachedData(clt_name, resolve, reject, query_item);
	});
}

//-----------------------------------------
// sync currently cached data back to DB
var l_syncCachedDataByID = exports.syncCachedDataByID = function (clt_name, id, onSuccess, onFail) {

    // error check
	var collection = l_getCollection(clt_name, onFail);
	if (collection === undefined) {
		return;
	}

    // check if cache exists
    if (collection.cache.hasOwnProperty(id) === false) {
        LOG.error('_id: ' + id + ' not found.', 'SR.DB');
        return UTIL.safeCall(onFail, 'id not found: ' + id);
    }

    l_setData(clt_name, collection.cache[id], onSuccess, onFail);

	// NOTE: using update does not seem to properly store the data to DB
	//l_updateData(clt_name, {_id: id}, collection.cache[id], onSuccess, onFail);
}

//-----------------------------------------
// delete cached data from DB
exports.deleteCachedDataByID = function (clt_name, id, onSuccess, onFail) {

    // error check
	var collection = l_getCollection(clt_name, onFail);
	if (collection === undefined) {
		return;
	}

    // check if cache exists
    if (collection.cache.hasOwnProperty(id) === true) {
        delete collection.cache[id];
		UTIL.safeCall(onSuccess);
    }
    else {
        var err_msg = 'id: ' + id + ' not found';
        LOG.error(err_msg, 'SR.DB');
        UTIL.safeCall(onFail, err_msg);
    }
}

exports.deleteCachedDataByIDAsync = function (clt_name, id) {
	return new promise(function(resolve, reject) {
		l_deleteCachedDataByID(clt_name, id, resolve, reject);
	});
}

//-----------------------------------------
// update existing data in DB
// TODO: simplify this process by accessing DB directly?
// (but then the cached version will not be updated)
exports.updateCachedDataByID = function (clt_name, id, new_values, onSuccess, onFail) {

    //LOG.sys('try to get cached data first for id: ' + id + ' type: ' + typeof id, 'SR.DB');
    // error check
	if (l_getCollection(clt_name, onFail) === false) {
		return;
	}

    // get cached data first
    l_getCachedData(clt_name,

        // data obtained
        function (data) {

            //LOG.sys('got cached data for id: ' + id, 'SR.DB');

            // store whatever fields exist in data to cache
            for (var field_name in new_values) {
                LOG.sys('updating [' + field_name + '] to be: ' + new_values[field_name], 'SR.DB');

                data[field_name] = new_values[field_name];
            }

            // sync data from cache to DB
            l_syncCachedDataByID(clt_name, id, onSuccess,

                // sync fail
                function () {
                    LOG.error('l_syncCachedDataByID() fails for collection [' + clt_name + '] id: ' + id, 'SR.DB');
                    UTIL.safeCall(onFail, 'sync fail');
                }
            );
        },

        // did not get cached data
        function () {
            LOG.error('did not get cached data for collection [' + clt_name + '] id: ' + id, 'SR.DB');
            UTIL.safeCall(onFail, 'did not get cached data');
        },

        // ID of the record
        id
    );
}

exports.updateCachedDataByIDAsync = function (clt_name, id, new_values) {
	return new promise(function(resolve, reject) {
		l_updateCachedDataByID(clt_name, id, new_values, resolve, reject);
	});
}

// get DB setting for MongoDB
var l_getSettings = exports.getSettings = function () {

	// NOTE: we use project name as DB name
	var frontier_name = SR.Settings.FRONTIER.getName();
	var server_info = SR.Settings.SERVER_INFO;
	var project_name = server_info.owner + '-' + server_info.project;

	LOG.warn('determining DB setting for [' + frontier_name + ']', 'SR.DB');

	var DB_name = project_name;

	// convert forbidden characters: .
	DB_name = DB_name.replace(/\./g, "_");

	// use project-specific DB password, so RockMongo can use it...
	var settings = {
		account:	project_name,
		DB_name:    DB_name,
		serverIP:   SR.Settings.DB_IP,
		serverPort: SR.Settings.DB_PORT
	};

	if (UTIL.userSettings("mongoAccess", "username") && UTIL.userSettings("mongoAccess","password")) {
		settings.account = UTIL.userSettings("mongoAccess","username");
		settings.password = UTIL.userSettings("mongoAccess","password");
	} else {
		settings.password = Math.random().toString().substring(3,9);
		var mongoAccess = "\nsettings.mongoAccess = " + JSON.stringify({DB_name: DB_name, username: settings.account, password: settings.password}) + ";\n";
		LOG.warn("Creating a new credential " + mongoAccess, 'SR.DB');
		LOG.warn('append at: ' + SR.Settings.PATH_SETTINGS, 'SR.DB');
    	SR.fs.appendFile(SR.Settings.PATH_SETTINGS, mongoAccess, function (err) {
			if (err) {
				LOG.error(err);
			}
		});
	}

	return settings;
}

//-----------------------------------------
// initialize connection to DB
// see following for code sample on DB init:
// http://stackoverflow.com/questions/4688693/how-do-i-connect-to-mongodb-with-node-js-and-authenticate/15191273#15191273
//
exports.initDB = function (dbSetting, collections, onDone) {

    // if DB is already initialized
    if (Object.keys(l_DBconn).length > 0) {
        LOG.warn('DB is already initialized, please check your code to avoid redundent init', 'SR.DB');
        return UTIL.safeCall(onDone, false);
	}

	// check if DB setting is correct
	if (dbSetting.hasOwnProperty('DB_name') === false ||
		dbSetting.hasOwnProperty('serverIP') === false ||
		dbSetting.hasOwnProperty('serverPort') === false) {
        LOG.error('DB_name or DB IP/port not found', 'SR.DB');
		return UTIL.safeCall(onDone, false);
	}

    // store reference to setting (NOTE: currently not used beyond this function)
    l_DBsetting = dbSetting;

	// store default DB_name
	l_DBname = dbSetting.DB_name;

	// store names of collections to be init
	// NOTE: some names could already exist if SR.DB.useCollection was called
	if (collections && collections instanceof Array) {
		for (var i=0; i < collections.length; i++) {

			// check if collection name is valid (cannot overlap with system names)
			var name = collections[i];

			for (var j=0; j < l_SRnames.length; j++)
				if (l_SRnames[j] === name) {
					LOG.error('collection name [' + name + '] is reserved, cannot be created or used', 'SR.DB');
					break;
				}

			if (j === l_SRnames.length) {
				l_names.push(name);
			}
		}
	}

    // warn if no collection names specified
	// NOTE: we still proceed as even if no project DBs are used, there can still be system DB
    if (l_names.length === 0) {
        LOG.warn('No collection names specified', 'SR.DB');
    }

	var jobqueue = SR.JobQueue.createQueue();

	// open a connection to particular DB
	// onOpenDone returns true/false
	var openDB = function (DB_name, account, pass, onOpenDone) {

        var conn = SR._storage.openDB(DB_name, dbSetting.serverIP, dbSetting.serverPort);

        // load fail
        if (conn === undefined) {
            LOG.error('cannot open DB: ' + DB_name, 'SR.DB');
            return onOpenDone(false);
        }

        // open DB & load the collection data from DB
        conn.open(function (err, client) {

            // check if error
            if (err) {
                LOG.error(err, 'SR.DB');
                return UTIL.safeCall(onOpenDone, false);
            }

			var user_created = false;

			var auth_user = function () {

				// authenticate into the DB
                LOG.sys('authenticating DB [' + DB_name + ']...', 'SR.DB');

                // NOTE: use client.admin().authenticate will force using admin account
                //       but in general we should not do that

                client.authenticate(account, pass, function (err, replies) {

					if (err) {

					    // if this is repeated call
					    if (user_created === true) {
							LOG.error(err, 'SR.DB');
							LOG.warn('DB authentication failure', 'SR.DB');
							return UTIL.safeCall(onOpenDone, false);
						}

    					// create DB user/pass (assume it's a new DB)
						LOG.warn('auth error, assume DB does not exist, try to create new DB...', 'SR.DB');

                        // NOTE: right now this action is always successful, so it's like no auth exists
                        //       might be a bug in MongoDB
                        user_created = true;

						client.admin().authenticate(SR.Settings.DB_ADMIN.account, SR.Settings.DB_ADMIN.pass, function (err, replies) {
							if (err) {
								LOG.error(err, 'SR.DB');
								LOG.error('DB admin auth failure, please make sure DB_ADMIN is setup correctly either in system or project setting', 'SR.DB');
								return UTIL.safeCall(onOpenDone, false);
							}

							client.addUser(account, pass, function (err, result) {

								if (err) {
									LOG.error(err, 'SR.DB');
									LOG.warn('DB addUser failure', 'SR.DB');
									return UTIL.safeCall(onOpenDone, false);
								}

								LOG.warn('DB addUser success, re-authenticate', 'SR.DB');
								auth_user();
							});
						});

						return;
					}

                    LOG.warn('DB authentication success', 'SR.DB');

					// store client for later access
					l_DBconn[DB_name] = conn;
					l_DBclient[DB_name] = client;
					UTIL.safeCall(onOpenDone, true);
                });
			}

			// perform first DB authentication
			auth_user();
		});
	}

    // open DB
	var openDBResult = true;
    var stepOpenDB = function (onOpenDone) {

		// open the DB specified
		openDB(l_DBname, l_DBsetting.account, l_DBsetting.password,
				// onOpenDone
				function (result) {
					LOG.sys('openDB result for [' + l_DBname + ']: ' + result, 'SR.DB');

					// notify project & operation admin
					if (result === false) {

						// NOTE: system admin is notified of this error as well
						UTIL.notifyAdmin(
							'[DB error: init]',
							UTIL.convertString(SR.Settings.SERVER_INFO),
							SR.Settings.EMAIL_ADMIN
						);

						openDBResult = false;
						
						// terminate process immediately
						process.exit(0);
					}

					// NOTE: following steps will not execute if result returns 'false'
					UTIL.safeCall(onOpenDone, result);
				});
    }

	jobqueue.add(stepOpenDB, false, 'openDB');

	// load collection
	var load_step = function (DB_name, name, prefix) {

		var func = function (onDone) {

			l_initCollection(DB_name, name, function (result) {
				if (result === false) {
					openDBResult = false;
				}

				onDone(result);
			}, prefix);
		}
		return func;
	}

	// NOTE: loading of collections will not execute (2nd parameter) if previous init has failed
    // create & store different steps to load a given collection
	for (var i=0; i < l_names.length; i++) {
        jobqueue.add(load_step(l_DBname, l_names[i]), false, l_names[i]);

		// incorrect usage
		//jobqueue.add(function (onDone) {
		//	l_initCollection(l_DB_name, l_names[i], onDone);
		//}, false, l_names[i]);
	}

	// load system collections
	// NOTE: both lobby & app servers will load them, and will share access to these collections
	// 		 this means that it's possible for different servers to exchange info via these common collections
	for (var i=0; i < l_SRnames.length; i++) {
		jobqueue.add(load_step(l_DBname, l_SRnames[i], 'system'), false, l_SRnames[i]);
	}

	jobqueue.run(function (result) {
		UTIL.safeCall(onDone, openDBResult);
	});
};

exports.initDBAsync = function(dbSetting, collections) {
	return new promise(function(resolve, reject) {
		l_initDB(dbSetting, collections, reject);
	});
}

//-----------------------------------------
// shutdown DB
exports.disposeDB = function (onDone) {

	// close each opened DB
	for (var key in l_DBconn) {
		l_DBconn[key].close();
	}

	l_DBconn = {};

	// TODO: release/shut DBclients?

    // call callback when finish
    UTIL.safeCall(onDone, true);
};

exports.disposeDBAsync = function(){
	return new promise(function(resolve, reject) {
		l_disposeDB(resolve);
	});
}

// standard init/dispose
// config: {collections: <array>, shutdown_if_fail: <bool>}
exports.init = function (config, onDone) {

	// determine DB settings
	var settings = l_getSettings();
	LOG.warn('loading DB: ' + settings.DB_name + ' (' + settings.serverIP + ':' + settings.serverPort + ')', 'SR.DB');

	// we provide empty DB set as default
	var collection_names = config.collections || [];

    SR.DB.initDB(settings, collection_names,
        function (result) {
			LOG.warn('init DB [' + settings.DB_name + '] result: ' + result, 'SR.DB');
			UTIL.safeCall(onDone, result);
        }
    );
}

exports.dispose = function (onDone) {
    LOG.sys('dispose DB...', 'SR.DB');

	// wait a little, for callbacks to finish (if any), for example, DB write/read..
	// TODO: can we detect if DB activities exist?
	setTimeout(function () {

    	// all events should be finished now, so this action should be fine
    	SR.DB.disposeDB(onDone);
	}, 1000);
}
