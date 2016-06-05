
// definition
SR.API.add('HelloWorld', function (args, onDone) {
	LOG.warn('HelloWorld called with args:');
	LOG.warn(args);
	
	if (typeof args.name === 'undefined') {
		return UTIL.safeCall(onDone, 'no name provided');
	}
	
	onDone(null, {hello: args.name});
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

