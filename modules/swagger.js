//
//  swagger.js
//
//	module to build swagger doc from API definitions
//
//	history:
//		2016-11-16	init	(original author: Guan-Ming Liao)
//
'use strict';
var l_module = exports.module = {};

var builder = function () {
	var self = this;
	
	self.host = 'localhost';

	self.doc = {
		'swagger': '2.0',
		'info': {
			'description': 'This is description',
			'version': '1.0.0',
			'title': 'Scalra API Documentation',
			'license': {
				'name': 'Apache 2.0',
				'url': 'http://www.apache.org/licenses/LICENSE-2.0.html'
			}
		},
		'host': self.host,
		'basePath': '/',
		'tags': [],
		'securityDefinitions': {
			'api_key': {
				'type': 'apiKey',
				'name': 'x-access-token',
				'in': 'header'
			}
		},
		'schemes': [
			'http'
		],
		'paths': {}
	};

	self.functionDoc = function (apiDescriptor) {
		var path = apiDescriptor.prefix + '/' + apiDescriptor.name;
		var auth = apiDescriptor.auth != null ? apiDescriptor.auth : true;
		var method = apiDescriptor.method || 'post';
		var requestFields = apiDescriptor.requestFields || [];
		var summary = apiDescriptor.summary || '[' + apiDescriptor.name + '] default summary';
		var description = apiDescriptor.description || '[' + apiDescriptor.name + '] default description';
		var operationId = path;
		var tag = apiDescriptor.tag;

		var docObject = {};
		var methodObject = {};
		methodObject.tags = [tag];
		methodObject.summary = summary;
		methodObject.description = description;
		methodObject.operationId = operationId;
		methodObject.consumes = ['application/x-www-form-urlencoded'];
		methodObject.produces = ['application/json; charset=utf-8'];
		methodObject.responses = {};
		methodObject.responses[200] = {};
		methodObject.parameters = [];

		if (auth) {
			methodObject.security = [{
				'api_key': ['x-access-token', ]
			}];
		}

		for (var i = 0; i < requestFields.length; i++) {
			var parameter = {};
			parameter.name = requestFields[i].name;
			parameter.in = 'formData';
			parameter.require = true;
			parameter.type = 'string';
			methodObject.parameters.push(parameter);
		}

		docObject[method] = methodObject;
		self.doc.paths[path] = docObject;
	};

	self.build = function (host, descriptions, onDone) {
		self.doc.host = self.host = host;

		LOG.warn('doc host: ' + self.host);

		// pass in each API description
		for (var name in descriptions) {
			self.functionDoc(descriptions[name]);
		}

		var fs = require('fs');

		var swaggerPath = SR.path.resolve(SR.Settings.FRONTIER_PATH, '..', 'web', 'swagger.json');
		LOG.warn('swaggerpath: ' + swaggerPath);

		fs.writeFile(swaggerPath, JSON.stringify(self.doc, null, 4), function (err) {
			if (err) {
				UTIL.safeCall(onDone, err);
			} else {
				LOG.warn('swagger info saved to: ' + swaggerPath);
				UTIL.safeCall(onDone, null);
			}
		});
	};


}

module.exports = builder;

var l_swagger = new builder();

//-----------------------------------------
// API definitions
//
//-----------------------------------------

SR.API.add('_BUILD_APIDOC', {
	name: '+string'
}, function(args, onDone) {

	var set = SR.Handler.get();
	var checkers = set.getCheckers();
	LOG.warn(checkers);

	var descriptions = [];

	for (var name in checkers) {
		var checker = checkers[name];

		var desc = {
			prefix: 'event',
			name: name,
			auth: (checker['_login'] === true),
			//admin: true,
			method: 'post',
			requestFields: [],
			summary: checker['_summary'] || '',
			description: checker['_desc'] || '',
			tag: (name.charAt(0) === '_' ? 'system' : 'user')
		}

		for (var para in checker) {
			if (para.charAt(0) === '_') {
				continue;
			}
			//if (para.charAt(0) === '+') {
			//	para = para.substring(1);	
			//}
			var type = checker[para];

			if (typeof type !== 'string') {
				LOG.warn('API [' + name + '] has non-string parameter [' + para + '], skip it...');
				continue;
			}

			if (type.charAt(0) === '+')
				type = type.substring(1);

			desc.requestFields.push({
				name: para,
				type: type
			});
		}

		descriptions.push(desc);
	}

	var host = SR.Settings.Project.domain + ':' + UTIL.getProjectPort('PORT_INC_HTTP') + '/';
	l_swagger.build(host, descriptions, function (err) {
		if (err) {
			LOG.error(err);
			return onDone(err);
		}
		// redirect to generated API page
		onDone(null, {type: 'SR_REDIRECT', data: {url: '/lib/swagger-ui/index.html?url=/web/swagger.json'}});
	});	
});

//-----------------------------------------
// Server Event Handling
//
//-----------------------------------------

SR.Callback.onStart(function() {
	// tasks when server starts
});

SR.Callback.onStop(function() {
	// tasks when server stops
});

// when a client connects
SR.Callback.onConnect(function(conn) {
	// do some config checking & init
});

// when a client disconnects
SR.Callback.onDisconnect(function(conn) {
	// handle disconnect
});

// module init
l_module.start = function(config, onDone) {
	// process config & verify correctness here
	UTIL.safeCall(onDone);
}

// module shutdown
l_module.stop = function(onDone) {
	// close / release resources used
	UTIL.safeCall(onDone);
}
