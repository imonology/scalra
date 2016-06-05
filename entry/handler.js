
// a pool for all message handlers
var l_handlers = exports.handlers = {};
var l_checkers = exports.checkers = {};

// list of known entry servers
var l_entries = [];

// add entry to list (but only if it's unique)
var l_addEntry = function (entry) {
	
	if (typeof entry !== 'string')
		return false;
	
	for (var i=0; i < l_entries.length; i++)
		if (l_entries[i] === entry)
			break;
	
	// store only if it's new entry
	if (i === l_entries.length) {
		l_entries.push(entry);	
		return true;
	}
	
	return false;
}

// remove entry from list
var l_removeEntry = function (list) {
	
	for (var i=0; i < list.length; i++) {
		for (var j=0; j < l_entries.length; j++) {
			if (list[i] === l_entries[j]) {
				l_entries.splice(j, 1);
				break;
			}
		}	
	}
}


// attempt to query monitor server for some info
// TODO: move this to UTIL.as common function?
var l_remoteEvent = function (server, type, para, onDone) {
	
	var url = server + 'event/' + type;
	LOG.warn('remoteEvent url: ' + url, 'Entry');
	UTIL.HTTPpost(url, para, function(err, res, resObj) {
		if (err) {
			// get port fail, try to trace
			LOG.stack();
			UTIL.safeCall(onDone);
			return;
		}
		
		UTIL.safeCall(onDone, resObj[SR.Tags.UPDATE], resObj[SR.Tags.PARA]);
	});
}

// attempt to query monitor server for some info
// TODO: move this to UTIL.as common function?
SR.API.add('queryServer', {
	name: 'string'
}, function (args, onDone) {
	var name = args.name;
	
	UTIL.contactMonitor('query/' + name.replace(/-/g, '/'), {}, function (err, response) {
		if (err) {
			LOG.error(err);
			LOG.stack();
			return onDone(err);
		}
		onDone(null, response);
	})
});

// var l_queryServer = exports.queryServer = function (name, onDone) {
	
	// UTIL.contactMonitor('query/' + name.replace(/-/g, '/'), {}, function (err, response) {
		// if (err) {
			// LOG.error(err);
			// LOG.stack();
			// return UTIL.safeCall(onDone);			
		// }
		// //LOG.warn(response);
		// UTIL.safeCall(onDone, response);
	// })
// }

// update entry list from monitor server
var l_updateEntryList = function (onDone) {
		
	// query other entry servers & store them
	// http://src.scalra.com:37014/query/scalra/Scalra/entry
	//l_queryServer('scalra-Scalra-entry', function (result) {
	var servername = SR.Settings.SERVER_INFO.owner + '-' + 
					  SR.Settings.SERVER_INFO.project + '-' + 
					SR.Settings.SERVER_INFO.name;
	LOG.warn('queryServer: ' + servername);
	SR.API.queryServer({name: servername}, function (err, result) {
		
		if (err) {
			LOG.error(err);
			return UTIL.safeCall(onDone, []);
		}
		
		// prepare entry list without self
		var list = [];
		if (result && result.length > 0) {

			// clear & store self entry			
			l_entries = [];
			var self_entry = SR.Settings.SERVER_INFO.IP + ':' + SR.Settings.PORT_ENTRY_ACTUAL;
			l_entries.push(self_entry);
			
			for (var i=0; i < result.length; i++) {
				var info = result[i];
				var ip_port = info.IP + ':' + info.port;
				if (l_addEntry(ip_port) === false)
					continue;
				
				list.push(ip_port);
			}
			
			UTIL.safeCall(onDone, list);
		}
	});
}

// when entry server starts, will first contact monitor to get a list of other entries to notify them about its join
SR.Callback.onStart(function () {
	
	// store self entry
	var self_entry = SR.Settings.SERVER_INFO.IP + ':' + SR.Settings.PORT_ENTRY_ACTUAL;
	LOG.warn('storing self to entry list: ' + self_entry, 'Entry');
	l_entries.push(self_entry);
	
	var onResponse = function (type, list) {
		
		if (type === 'ENTRY_LIST') {
			
			LOG.warn('entries received:', 'Entry');
			LOG.warn(list);
			
			/* NOTE: we only trust entry list provided by monitor
			for (var i=0; i < list.length; i++) {
				l_addEntry(list[i]);
			}
			*/
			
			LOG.warn('self entry list:', 'Entry');
			LOG.warn(l_entries);
		}
	}	
	
	l_updateEntryList(function (list) {
		
		LOG.warn('learn of new entries from monitor: ', 'Entry');
		LOG.warn(list, 'Entry');
				
		for (var i=0; i < list.length; i++) {
		
			var ip_port = list[i];
			
			LOG.warn('contacting entry server to register self: ' + ip_port, 'Entry');
			
			// register self
			var server = 'http://' + ip_port + '/';
			l_remoteEvent(server, 'registerEntry', {entry: self_entry}, onResponse);		
		}
	});
	
	setInterval(l_updateEntryList, 10000);
});

// return a list of currently known entry
// NOTE: this is used by client to learn a few available entries in case of entry failure
// so re-connect with other available entries can happen quickly
l_handlers.getEntries = function (event) {
	event.done('ENTRY_LIST', l_entries);
}

// notify a new entry server
l_handlers.registerEntry = function (event) {
	
	event.done('ENTRY_LIST', l_entries);

	l_addEntry(event.data.entry);	
	
	LOG.warn('entry list after register:', 'Entry');
	LOG.warn(l_entries);
}

// remove and existing server
l_handlers.removeEntry = function (event) {

	l_removeEntry(event.data.list);	
	event.done();	
}