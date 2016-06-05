var status = {
	enabled: false
};
var l_callbackPool = {}; //因為 function 不行存入資料庫，因此要另外處理
var l_schedulePool = {};
var dbName_schedule = 'schedule';

SR.DB.useCollections([dbName_schedule]);

const l_cat = 'SR.Schedule';

// TODO: to run a callback function (task) every cycle seconds
exports.setTask = function (arg) {
	if (!arg.id) {
		arg.id = UTIL.createUUID();
	}

	LOG.warn("setTask", l_cat);
	//todo: check input

	if (arg.callback) {
		//~ console.log("arg.callback exists");
		if (typeof arg.callback === 'function') {
			//~ console.log("arg.callback is a function");
			l_callbackPool[arg.id] = arg.callback;
			LOG.warn("new l_callbackPool: ", l_cat);
			LOG.warn(l_callbackPool, l_cat);
		}
		else {
			LOG.warn("callback is not a function, but a ", l_cat);
			LOG.warn(typeof arg.callback, l_cat);
		}
	}
	else {
		LOG.warn("arg.callback Not exist", l_cat);
	}

	if (typeof arg.monthday === 'string') arg.monthday = parseInt(arg.monthday);
	if (typeof arg.hour === 'string') arg.hour = parseInt(arg.hour);
	if (typeof arg.minute === 'string') arg.minute = parseInt(arg.minute);

	arg.cycle = arg.cycle.toLowerCase();
	arg.weekday = arg.weekday.toLowerCase();


	l_schedulePool[arg.id] = {
		name: arg.scheduleName,
		id: arg.id,
		cycle: arg.cycle,
		monthday: arg.monthday,
		weekday: arg.weekday,
		hour: arg.hour,
		minute: arg.minute,
		do: arg.do,
		action: arg.action,
		suspend: arg.suspend || false,
		description: arg.description,
		latestExecuted: new Date(),
		created: new Date(),
	};



	SR.DB.updateData(dbName_schedule, {
			id: arg.id
		}, l_schedulePool[arg.id],
		function (msg) {
			arg.onDone({
				scheduleId: arg.id,
				message: "success"
			});
			//LOG.warn('SR.Schedule', "success: ");
			//LOG.warn('SR.Schedule', msg);
		},
		function (msg) {
			arg.onDone({
				scheduleId: arg.id,
				message: "db failure"
			});
			LOG.warn("failure: ", l_cat);
			LOG.warn(msg, l_cat);
		});
}

// TODO: delete a task by id
exports.deleteTask = function (arg) {
	if (!arg.id) {
		arg.onDone({
			message: "no given id"
		});
		//LOG.warn('SR.Schedule', "no given id");
		return;
	}

	if (!l_schedulePool[arg.id]) {
		arg.onDone({
			message: "assigned id is invalid"
		});
		//LOG.warn('SR.Schedule', "assigned id does not exist");
		return;
	}

	SR.DB.deleteData(dbName_schedule,
		function (result) {
			delete l_schedulePool[arg.id];
			delete l_callbackPool[arg.id];
			arg.onDone({
				id: arg.id,
				message: "The given schedule task is begin deleted."
			});
			//LOG.warn('SR.Schedule', "The given task is deleted.");
		},
		function (result) {}, {
			id: {
				$in: arg.id
			}
		});
}


// TODO: to temporarily pause a task without delete it
exports.suspendTask = function (arg) {
	if (!arg.id) {
		arg.onDone({
			message: "no given id"
		});
		LOG.warn("no given id", l_cat);
		return;
	}

	if (!l_schedulePool[arg.id]) {
		arg.onDone({
			message: "assigned id is invalid"
		});
		LOG.warn("assigned id does not exist", l_cat);
		return;
	}

	l_schedulePool[arg.id].suspend = true;
	SR.DB.updateData(dbName_schedule, {
			id: arg.id
		}, l_schedulePool[arg.id],
		function (msg) {
			//LOG.warn('SR.Schedule', "success: ");
			//LOG.warn('SR.Schedule', msg);
			arg.onDone({
				id: arg.id,
				message: "The given task is suspended."
			});
		},
		function (msg) {
			LOG.warn("failure: db failure ", l_cat);
			LOG.warn(msg, l_cat);
		});
}


exports.resumeTask = function (arg) {
	if (!arg.id) {
		arg.onDone({
			message: "no given id"
		});
		LOG.warn("no given id", l_cat);
		return;
	}

	if (!l_schedulePool[arg.id]) {
		arg.onDone({
			message: "assigned id is invalid"
		});
		LOG.warn("assigned id does not exist", l_cat);
		return;
	}

	l_schedulePool[arg.id].suspend = false;
	SR.DB.updateData(dbName_schedule, {
			id: arg.id
		}, l_schedulePool[arg.id],
		function (msg) {
			arg.onDone({
				id: arg.id,
				message: "The given task is resumed."
			});
			//LOG.warn('SR.Schedule', "success: ");
			//LOG.warn('SR.Schedule', msg);
		},
		function (msg) {
			LOG.warn("failure: ", l_cat);
			LOG.warn(msg, l_cat);
		});
}

// TODO: 由於 function 不會被取到資料庫，若此筆資料從 db 讀出後，要再補上 authentic function
exports.patchCallback = function (arg) {
	LOG.warn("to patch callback: ", l_cat);
	LOG.warn(arg, l_cat);

	if (!arg.callback) {
		LOG.warn("no assigned callback function", l_cat);
		return;
	}

	if (!typeof arg.callback === "function") {
		LOG.warn("assigned is not a callback function", l_cat);
		return;
	}

	if (arg.id && l_schedulePool[arg.id]) {
		l_callbackPool[arg.id] = arg.callback;
		LOG.warn("The given callback function was patched:" + arg.id, l_cat);
	}
	else if (arg.action) {
		l_callbackPool[arg.action] = arg.callback;
		for (var i in l_schedulePool) {
			if (l_schedulePool[i].action === arg.action) {
				l_callbackPool[i] = arg.callback;
				LOG.warn("The given callback function was patched:" + l_schedulePool[i].id, l_cat);
			}
		}
	}
}


// TODO: to get a task status
exports.getStatus = function (arg) {
	LOG.warn(l_schedulePool, l_cat);
	LOG.warn(l_callbackPool, l_cat);
	return l_schedulePool; //todo: return callbackPool to REST
}

exports.enable = function (arg) {
	status.enabled = true;
	setTimeout(function () {
		readDB({});
	}, 2000);
}

exports.disable = function (arg) {
	status.enabled = false;
}


var readDB = exports.readDB = function (arg) {

	SR.DB.getArray(dbName_schedule, function (msg) {
		l_schedulePool = {};

		for (var index in msg) {
			l_schedulePool[msg[index].id] = msg[index];
		} // 之所以這裡要逐筆做，是為了能用 l_schedulePool[id] 存取
		LOG.warn("SR.Schedule is enabled.", l_cat);
	}, function (msg) {
		LOG.warn("failure: db failure (schedule.js )", l_cat);
		LOG.warn(msg, l_cat);
	});

}


exports.daemon = function (arg) {
	switch (arg.action) {
		case 'startSetInterval':
			setInterval(l_schedule, 5000);
			break;
		default:
			break;
	}
}

var toNumberWeekday = function (arg) {
	switch (arg.toLowerCase()) {
		case 'sunday':
			return 0;
			break;
		case 'monday':
			return 1;
			break;
		case 'tuesday':
			return 2;
			break;
		case 'wednesday':
			return 3;
			break;
		case 'thursday':
			return 4;
			break;
		case 'friday':
			return 5;
			break;
		case 'saturday':
			return 6;
			break;
		default:
			return false;
			break;
	}
}

var isNumberRange = function (arg) {
	LOG.warn(arg, l_cat);
	if (!arg) {
		LOG.warn("no arg", l_cat);
		return;
	}
	if (!arg.start) {
		LOG.warn("no arg.start", l_cat);
		return;
	}
	if (!arg.end) {
		LOG.warn("no arg.end", l_cat);
		return;
	}
	if (!arg.current) {
		LOG.warn("no arg.current", l_cat);
		return;
	}
	var c = arg.current;
	var s = arg.start;
	var e = arg.end;

	if (c === s || c === e) return true;
	else if (s <= c && c <= e) return true;
	else if (e <= s && s <= c) return true;
	else return false;
	return false;
}

exports.checkRange = function (arg) {
	if (!arg) {
		LOG.warn("no arg", l_cat);
		return;
	}
	if (!arg.start) {
		LOG.warn("no arg.start", l_cat);
		return;
	}
	if (!arg.end) {
		LOG.warn("no arg.end", l_cat);
		return;
	}
	LOG.warn("in checkRange", l_cat);
	if (arg.start.weekday) arg.start.weekday_num = toNumberWeekday(arg.start.weekday);
	if (arg.end.weekday) arg.end.weekday_num = toNumberWeekday(arg.end.weekday);
	LOG.warn(arg, l_cat);

	if (arg.start.cycle && typeof(arg.start.cycle) === 'string') {
		switch (arg.start.cycle.toLowerCase()) {
			case 'daily':
				LOG.warn('============= in daily', l_cat);
				var d = new Date();
				if (isNumberRange({
						start: arg.start.hour,
						end: arg.end.hour,
						current: d.getHours()
					}))
					if (isNumberRange({
							start: arg.start.minute,
							end: arg.end.minute,
							current: d.getMinutes()
						}))
						return true;
				return false;
				break;
			case 'weekly':
				LOG.warn('============= in weekly', l_cat);
				var d = new Date();
				if (isNumberRange({
						start: arg.start.weekday_num,
						end: arg.end.weekday_num,
						current: d.getDay()
					}))
					if (isNumberRange({
							start: arg.start.hour,
							end: arg.end.hour,
							current: d.getHours()
						}))
						if (isNumberRange({
								start: arg.start.minute,
								end: arg.end.minute,
								current: d.getMinutes()
							}))
							return true;
				return false;
				break;
			case 'monthly':
				LOG.warn('============= in monthly', l_cat);
				var d = new Date();
				if (isNumberRange({
						start: arg.start.monthday,
						end: arg.end.monthday,
						current: d.getDate()
					}))
					if (isNumberRange({
							start: arg.start.hour,
							end: arg.end.hour,
							current: d.getHours()
						}))
						if (isNumberRange({
								start: arg.start.minute,
								end: arg.end.minute,
								current: d.getMinutes()
							}))
							return true;
				return false;
				break;
			default:
				return false;
				break;
		}
	}
}

exports.triggerTask = function (arg) {
	if (typeof(arg) != 'string') 
		return;
	
	var i = arg;
	if (!l_schedulePool[i]) {
		LOG.warn("The assigned id does not exist." + i, l_cat);
		return;
	}

	LOG.warn("schedule: task is triggered: " + l_schedulePool[i].id + " " + l_schedulePool[i].action, l_cat);

	var key, param;

	if (l_schedulePool[i].action && typeof l_callbackPool[l_schedulePool[i].action] === 'function') {
		key = l_schedulePool[i].action.toString();
	}
	else if (l_schedulePool[i].id && typeof l_callbackPool[l_schedulePool[i].id] === 'function') {
		key = l_schedulePool[i].id;
	}
	else {
		LOG.warn("Scheduled But No Callback Provided!\nYou must set either action=startRecord|stopRecord or a callback", l_cat);
	}

	if (l_schedulePool[i].do) {
		param = l_schedulePool[i].do;
	}
	else if (l_schedulePool[i].argument) {
		param = l_schedulePool[i].argument
	}

	if (key) {
		l_callbackPool[key](param);
	}
	else {
		LOG.warn("Triggered but can do nothing.", l_cat);
	}

	l_schedulePool[i].latestExecuted = new Date();
	SR.DB.updateData(dbName_schedule, {
			id: l_schedulePool[i].id
		}, l_schedulePool[i],
		function (msg) {
			LOG.warn("success: ", l_cat);
			LOG.warn(msg, l_cat);
		},
		function (msg) {
			LOG.warn("failure: ", l_cat);
			LOG.warn(msg, l_cat);
		});

}


////////////////////////////////////////
// 每單位時間(目前為 5 秒) 檢查是否有符合條件的 task
//
////////////////////////////////////////
var l_schedule = function () {
	if (status.enabled !== true) {
		return;
	}
	//~ console.log("l_callbackPool: ", l_callbackPool);
	//~ console.log("l_schedulePool: ", l_schedulePool);
	//console.log(l_schedulePool);
	var resolutionTS = 1000 * 60; // one minute support; 最小解析度(目前每分鐘) 
	var cycleTShourly = 1000 * 60 * 60; // 每小時有 60 分鐘 (60*60秒)
	var cycleTSdaily = cycleTShourly * 24; // 每天有 24 小時 
	var cycleTSweekly = cycleTSdaily * 7; // 每周有 7 天 
	var cycleTSmonthly = cycleTSdaily * 30;
	// 因為推導時間的演算法還未想完整，有些變數還沒有用到，暫時先留著
	var now = getDateTime();
	var currentTS = new Date()
		.valueOf(); // current date and time
	//console.log("current: " + current + " " +  typeof current);
	//~ LOG.debug("now: " + now.hour + ":" + now.minute + " || " +  typeof now);
	//~ LOG.debug("currentTS: " + currentTS + " || " +  typeof currentTS);
	for (var i in l_schedulePool) {
		//~ console.log("IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII:::::::::::::::: ", i);
		var latestExecutedTS = new Date(l_schedulePool[i].latestExecuted)
			.valueOf(); // latest executed date and time
		var createdTS = new Date(l_schedulePool[i].created)
			.valueOf(); // created date and time
		//~ console.log("latestExecutedTS - createdTS: " + Math.abs(latestExecutedTS - createdTS)); 
		var deltaTS = (currentTS - latestExecutedTS); //現在時間減最後執行過的時間
		//~ console.log("delta: " + deltaTS );
		if (l_schedulePool[i].suspend === true) {
			//LOG.warn('SR.Schedule', "returned");
			return;
		}

		//LOG.warn('SR.Schedule', "l_schedulePool[i]: %j", l_schedulePool[i]);
		//LOG.warn('SR.Schedule', "now: %j", now);

		var trigger = false;
		//~ console.log("l_schedulePool[i].cycle: ", l_schedulePool[i].cycle);
		switch (l_schedulePool[i].cycle) {
			case 'hourly':
				if (l_schedulePool[i].minute === now.minute) {
					if (deltaTS > resolutionTS) {
						trigger = true;
					}
				}
				break;

			case 'daily':
				if (l_schedulePool[i].hour === now.hour && l_schedulePool[i].minute === now.minute) {
					if (deltaTS > resolutionTS) {
						trigger = true;
					}
				}
				break;

			case 'weekly':
				//~ console.log(" " + typeof l_schedulePool[i].minute + " " + typeof now.minute );
				//~ console.log("Weekdays: " + l_schedulePool[i].weekday + " " + now.weekDay );
				//~ console.log("hours: " + l_schedulePool[i].hour + " " + now.hour );
				//~ console.log("minutes: " + l_schedulePool[i].minute + " " + now.minute );
				//~ console.log("DELTA and RESOLUTION: ",deltaTS + " " + resolutionTS);
				if (l_schedulePool[i].weekday === now.weekDay && l_schedulePool[i].hour === now.hour && l_schedulePool[i].minute === now.minute) {
					if (deltaTS > resolutionTS) {
						trigger = true;
					}
				}
				break;

			case 'monthly':
				if (l_schedulePool[i].monthday === now.monthday && l_schedulePool[i].hour === now.hour && l_schedulePool[i].minute === now.minute) {
					if (deltaTS > resolutionTS) {
						trigger = true;
					}
				}
				break;

			default:
				LOG.warn("The period is out of scope. please debug: " + l_schedulePool[i], l_cat);
				break;
		}

		//LOG.sys("trigger---: " + trigger, l_cat);

		if (trigger === true) {
			LOG.warn("schedule: task is triggered: " + l_schedulePool[i].id + " " + l_schedulePool[i].action, l_cat);
			//~ l_callbackPool[l_schedulePool[i].action](l_schedulePool[i].do);

			var key, param;

			if (l_schedulePool[i].action && typeof l_callbackPool[l_schedulePool[i].action] === 'function') {
				key = l_schedulePool[i].action.toString();
			}
			else if (l_schedulePool[i].id && typeof l_callbackPool[l_schedulePool[i].id] === 'function') {
				key = l_schedulePool[i].id;
			}
			else {
				LOG.warn("Scheduled But No Callback Provided!\nYou must set either action=startRecord|stopRecord or a callback", l_cat);
			}

			if (l_schedulePool[i].do) {
				param = l_schedulePool[i].do;
			}
			else if (l_schedulePool[i].argument) {
				param = l_schedulePool[i].argument
			}

			if (key) {
				l_callbackPool[key](param);
			}
			else {
				LOG.warn("Triggered but can do nothing.", l_cat);
			}

			l_schedulePool[i].latestExecuted = new Date();
			SR.DB.updateData(dbName_schedule, {
					id: l_schedulePool[i].id
				}, l_schedulePool[i],
				function (msg) {
					LOG.warn("success: ", l_cat);
					LOG.warn(msg, l_cat);
				},
				function (msg) {
					LOG.warn("failure: ", l_cat);
					LOG.warn(msg, l_cat);
				});
		}
		else {
			//~ console.log("trigger is false ---------");
		}
	}
};


var getDateTime = function (d) {
	var eventName = 'getDateTime';
	if (d) var date = new Date(d);
	else var date = new Date();
	var hour = date.getHours();
	hour = (hour < 10 ? "0" : "") + hour;
	var min = date.getMinutes();
	min = (min < 10 ? "0" : "") + min;
	var sec = date.getSeconds();
	sec = (sec < 10 ? "0" : "") + sec;
	var year = date.getFullYear();
	var month = date.getMonth() + 1;
	month = (month < 10 ? "0" : "") + month;
	var day = date.getDate();
	day = (day < 10 ? "0" : "") + day;
	var timeObj = {
		"year": parseInt(year),
		"month": parseInt(month),
		"monthday": parseInt(day),
		"weekday": date.getDay(),
		"hour": parseInt(hour),
		"minute": parseInt(min),
		"second": parseInt(sec)
	};
	//LOG.warn('SR.Schedule', "date.getDay: " + date.getDay());
	switch (date.getDay()) {
		case 0:
			timeObj.weekDay = 'sunday';
			break;
		case 1:
			timeObj.weekDay = 'monday';
			break;
		case 2:
			timeObj.weekDay = 'tuesday';
			break;
		case 3:
			timeObj.weekDay = 'wednesday';
			break;
		case 4:
			timeObj.weekDay = 'thursday';
			break;
		case 5:
			timeObj.weekDay = 'friday';
			break;
		case 6:
			timeObj.weekDay = 'saturday';
			break;
		default:
			LOG.warn("error code: xxxxxxxx", l_cat);
			break;
	}
	return timeObj;
}
