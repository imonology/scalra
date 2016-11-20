//
//  REST_execute.js
//
//	a RESTful handler for the /start /stop /query request handling
//	NOTE: these are currently loaded in SR.Component.REST
//

var l_handles = exports.REST_handles = {};

const ansi_up = require('ansi_up');				// converts console message to colorful HTML
const humanize = require('humanize');			// better human readability

// handle server starting requests
l_handles.start = function (path_array, res, para, req) {
	var owner = path_array[2];
	var project = path_array[3];
	var name = path_array[4];

	if (owner === undefined || project === undefined || name === undefined) {
		return SR.REST.reply(res, 'cannot start server, missing owner/project/server_name');
	}

	var size = (path_array[5] === undefined ? 1 : parseInt(path_array[5]));
	LOG.warn('start server size: ' + size);

	var channel = owner + '-' + project + '-' + name;
	
	SR.Execute.start({owner: owner, project: project, name: name}, size, function (list) {
		LOG.warn('SR.Execute.start done', 'SR.REST');
		LOG.warn(list, 'SR.REST');
		SR.REST.reply(res, list);
	}, function (output) {

		// make output HTML displable
		// TODO: do this at the client to save bandwidth?
		if (SR.Settings.REFORMAT_HTML_TEXT === true)
			output.data = humanize.nl2br(ansi_up.ansi_to_html(output.data));
		
		//LOG.warn(output.data);
		
		// record to file

		//SR.StreamManager.publish(channel, output);
		SR.StreamManager.publish(output.id, output);
	});
}

// handle server stopping requests
l_handles.stop = function (path_array, res, para, req) {

	var id = path_array[2];
	LOG.warn('id: [' + id + ']', 'stop');

	if (id === undefined) {
		return SR.REST.reply(res, 'need to specify serverID');
	} else if (id === 'self') {
		LOG.warn('received self shutdown request', 'SR.REST');
		SR.Settings.FRONTIER.dispose();
		return;
	}

	SR.Execute.stop(id, function (msg) {
		LOG.warn('SR.Execute.stop done', 'SR.REST');
		SR.REST.reply(res, msg);
	});
}

// handle server query requests
l_handles.query = function (path_array, res, para, req) {

	var owner   = path_array[2];
	var project = path_array[3];
	var name    = path_array[4];

	SR.Execute.query({owner: owner, project: project, name: name}, function (list) {
		LOG.sys('SR.Execute.query return info on ' + list.length + ' servers', 'SR.REST');
		SR.REST.reply(res, list);
	});
}

SR.REST.addHandler(l_handles);