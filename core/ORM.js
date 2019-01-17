
/*
//
//
// ORM.js
//
// Object-Relational Mapping (ORM) DB interface
//
// install:
//		npm install orm
//		npm install monogodb
//
//	doc:
//		https://github.com/dresende/node-orm2
//
//	history:
//		2016-03-07	first version
//

supported functions:

// store a given data record to a collection, create new record if not exist
// 儲存某筆資料到 Collection 中, 若不存在會存新資料
//
//	args: {
//		name:	'string',	// object name
//		data:	'object',	// data instance
//	}
//	onDone: {
//		err:	'string',	// error value
//	}
create(args, onDone)

// get a record from a given collection
// 從某個 Collection 中抓出一筆資料 Record
//
//	args: {
//		name:	'string',	// object name
//		query:	'object',	// query condition
//	}
//	onDone: {
//		err:	'string',	// error value
//		result:	'object'	// query result
//	}
read(args, onDone)

// update a given data record to a collection
// 更新 Collection 中某筆資料
//
//	args: {
//		name:	'string',	// object name
//		query:	'object',	// query condition
//		data:	'object',	// data instance
//	}
//	onDone: {
//		err:	'string',	// error value
//	}
update(args, onDone)


// delete a given data record to a collection
// 刪除 Collection 中某筆資料
//
//	args: {
//		name:	'string',	// object name
//		query:	'object',	// query condition
//	}
//	onDone: {
//		err:	'string',	// error value
//	}
delete(args, onDone)

// count the number of records in a collection
// 算 Collection 中資料數
//
//	args: {
//		name:	'string',	// object name
//	}
//	onDone: {
//		err:	'string',	// error value
//		result:	'number'	// count number
//	}
count(args, onDone)

// initialize DB
// 初始化 DB
//
//	args: {
//		DB_type:  'string'	// type of DB to use ['mysql', 'mongodb']
//		username: 'string'	// DB username
//		password: 'string'	// DB password
//		DB:	'string'		// DB name
//		names:	{},			// list of object names to be init
//	}
//	onDone: {
//		err:	'string',	// error value
//	}
init(args, onDone)

// shutdown DB
// 關閉 DB
//
//	onDone: {
//		err:	'string',	// error value
//	}
dispose(onDone)

*/


//-----------------------------------------
// define local variables
//
//-----------------------------------------

var l_name = 'SR.ORM';
var orm = require('orm');

// tag for monitoring loading
var l_loadtype = 'SR.ORM.write';

// locally cached DB objects
var l_obj = {};

// initialize DB
// syntax:
//	driver://username:password@hostname
// 	ex.	orm.connect("mongodb://funlot-BusSchedule:198053@127.0.0.1/funlot-BusSchedule", function (err, db) {
//		});
//
exports.init = function (args, onDone) {

	var DB_type = args.DB_type || 'mongodb';
	var conn_str = DB_type + '://' + encodeURIComponent(args.username)
	    + ':' + encodeURIComponent(args.password)
	    + '@'+ SR.Settings.DB_IP + '/'
	    + encodeURIComponent((args.DB || args.username));

	LOG.warn('connecting: ' + conn_str, l_name);

	orm.connect(conn_str, function (err, db) {
		if (err)
			return UTIL.safeCall(onDone, err);

		// if DB connects successfully, init objects
		for (var name in args.names) {

			var table_name = SR.Settings.SERVER_INFO.name + ':' + name;

			var def = args.names[name];
			var validate = {};

			for (var attr in def.validations) {
				var criteria = def.validations[attr];
				validate[attr] = orm.enforce.ranges.number(criteria.lower, criteria.upper, criteria.msg);
			}
			//LOG.warn('validations:');
			//LOG.warn(validate);

			l_obj[name] = db.define(table_name, def.attributes, {
				methods: def.methods,
				validations: validate
			});
		}

		// add the table to the database
		db.sync(onDone);
	});
};

// store a given data record to a collection, create new record if not exist
exports.create = function (args, onDone) {
	if (l_obj.hasOwnProperty(args.name) === false) {
		return UTIL.safeCall(onDone, 'object [' + args.name + '] not defined');
	}

	//if (SR.Load.check(l_loadtype, 1) === false) {
	//	return UTIL.safeCall(onDone, 'DB creation overload');
	//}

	var obj = l_obj[args.name];
	LOG.warn('creating', l_name);
	LOG.warn(args.data, l_name);

	obj.create(args.data, function (err, result) {
		//SR.Load.check(l_loadtype, -1);
		UTIL.safeCall(onDone, err, result);
	});
};

// get a record from a given collection
exports.read = function (args, onDone) {
	if (l_obj.hasOwnProperty(args.name) === false) {
		return UTIL.safeCall(onDone, 'object [' + args.name + '] not defined');
	}
	var obj = l_obj[args.name];
	obj.find(args.query, onDone);
};

var l_print = function (data) {
	for (var key in data) {
		if (typeof data[key] === 'object') {
			LOG.warn('[' + key + ']');
			l_print(data[key]);
		} else if (typeof data[key] !== 'function')
			LOG.warn('[' + key + ']: ' + data[key]);
		else
			LOG.warn('[' + key + ']: is function');
	}
};

// update a given data record to a collection
exports.update = function (args, onDone) {
	if (l_obj.hasOwnProperty(args.name) === false) {
		return UTIL.safeCall(onDone, 'object [' + args.name + '] not defined');
	}

	var obj = l_obj[args.name];
	obj.find(args.query, function (err, result) {
		if (err) {
			return UTIL.safeCall(onDone, err);
		}

		if (!result.length) {
			return UTIL.safeCall(onDone, `Query ${args.query} not found`);
		}

		LOG.warn('result found:', l_name);
		l_print(result[0]);

		// we only update the first found result
		// NOTE: functions are not updated
		for (var key in args.data) {
			if (key !== '_id' && typeof args.data[key] !== 'function');
			result[0][key] = args.data[key];
		}

		LOG.warn('result after update:', l_name);
		l_print(result[0]);

		//if (SR.Load.check(l_loadtype, 1) === false) {
		//	return UTIL.safeCall(onDone, 'DB update overload');
		//}

		// save result
		result[0].save(function (err, result) {
			//SR.Load.check(l_loadtype, -1);
			UTIL.safeCall(onDone, err, result);
		});
	});
};

// delete a given data record to a collection
//	args: {
//		name:	'string',		// name of the data set
//		query:	'object'		// query to check into
//	}
exports.delete = function (args, onDone) {
	if (l_obj.hasOwnProperty(args.name) === false) {
		return UTIL.safeCall(onDone, 'object [' + args.name + '] not defined');
	}

	//if (SR.Load.check(l_loadtype, 1) === false) {
	//	return UTIL.safeCall(onDone, 'DB deletion overload');
	//}

	LOG.warn('ORM.delete args:', l_name);
	LOG.warn(args, l_name);

	var obj = l_obj[args.name];

	obj.find(args.query, function (err, result) {
		if (err)
			return UTIL.safeCall(onDone, err);

		LOG.warn('result found:', l_name);
		LOG.warn(result, l_name);

		//if (SR.Load.check(l_loadtype, 1) === false) {
		//	return UTIL.safeCall(onDone, 'DB deletion overload');
		//}

		// remove this item
		result[0].remove(function (err, result) {
			//SR.Load.check(l_loadtype, -1);
			UTIL.safeCall(onDone, err, result);
		});
	});
};

// setup load checker
SR.Callback.onStart(function () {
	SR.Load.init({
		type: l_loadtype,
		max: 100
	});
});


/* example
			// add a row to the person table
			Person.create({ id: 1, name: "John", surname: "Doe", age: 27 }, function(err) {
				if (err) throw err;

					// query the person table by surname
					Person.find({ surname: "Doe" }, function (err, people) {
						// SQL: "SELECT * FROM person WHERE surname = 'Doe'"
						if (err) throw err;

						console.log("People found: %d", people.length);
						console.log("First person: %s, age %d", people[0].fullName(), people[0].age);

						people[0].age = 16;
						people[0].save(function (err) {
							// err.msg = "under-age";
					});
				});

			});
*/


