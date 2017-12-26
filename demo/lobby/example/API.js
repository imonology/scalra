
// definition
SR.API.add('HelloWorld', function (args, onDone) {
	LOG.warn('HelloWorld called with args:');
	LOG.warn(args);
	
	if (typeof args.name === 'undefined') {
		return UTIL.safeCall(onDone, 'no name provided');
	}
	
	onDone(null, {hello: args.name});
});

// post-event handler
SR.API.after('HelloWorld', function (args, result, onDone) {
	LOG.warn('after HelloWorld is called, result:');
	LOG.warn(result);
	LOG.warn('original parameters:');
	LOG.warn(args);
	onDone();
});

// pre-event handler
SR.API.before('HelloWorld', function (args, onDone) {
	LOG.warn('before HelloWorld is called');
	LOG.warn('original parameters:');
	LOG.warn(args);
	onDone();
});

// negative test
SR.API.HelloWorld(function (err, result) {
	LOG.warn('SR.API negative test result: ');
	if (err) {
		return LOG.error(err);
	}
	LOG.warn(result);
});

// positive test
SR.API.HelloWorld({name: 'John'}, function (err, result) {
	LOG.warn('SR.API positive test result: ');
	if (err) {
		return LOG.error(err);
	}
	LOG.warn(result);
});

LOG.warn('SR.API test loaded...');

