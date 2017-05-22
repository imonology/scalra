//
//  handler.js
//
//  main server logic
//

// put collections used here
SR.DB.useCollections(['testDB']);

// a pool for all message handlers
var l_handlers = exports.handlers = {};
var l_checkers = exports.checkers = {};

//-----------------------------------------
// define handlers (format checkers and event handlers)
//
//-----------------------------------------

// counter that'll be reset upon reloading
var reset_counter = 0;

// counter that won't be reset upon script reloading
var l_states = SR.State.get('counters');

if (typeof l_states.counter === 'undefined')
	l_states['counter'] = 0;


// sample event
SR.API.add('HELLO_EVENT', {
	age:	'number',
}, function (args, onDone) {
	    
	// print some message
	LOG.debug('HELLO_EVENT has been called');
	LOG.warn(event);
	
	if (!args.age) {
		LOG.error('no age sent to HELLO_EVENT!', 'lobby');	
	}
	
	// increment counters
	reset_counter++;
	l_states['counter']++;
	
	var age = event.data.age ? parseInt(event.data.age) : 0;
	age = age + 10;
	
	// send back response
	event.done('HELLO_REPLY', {name: event.data.name, age: age, 中文: '中文也通!', 
							   reset_counter: reset_counter, persist_counter: l_states['counter']});
})


//
// custom logic
//
var l_form = SR.State.get('FlexFormMap');

SR.API.after('UPDATE_FORM', function (args, output, onDone) {
	if (output.err) {
		return onDone();
	}

	if (l_form.hasOwnProperty(args.form_id) === false) {
		return onDone();
	}
	
	LOG.warn('perform post-action for UPDATE_FORM...')
	switch (l_form[args.form_id].name) {
		case 'DeviceInfo':
			LOG.warn('output:');
			LOG.warn(output);
			
			var record_ids = output.result.record_ids;
			LOG.warn('record_ids:');
			LOG.warn(record_ids);
			if (!record_ids)
				break;
			
			LOG.warn('l_devices');
			LOG.warn(l_devices);
			
			//for (var i=0; i < record_ids.length; i++) {
			//	l_devices[record_ids[i]].id = UTIL.createUUID();
			//	l_devices[record_ids[i]].sync();
			//}
			break;
			
		default:
			break;					 
	}
	
	onDone();
})

//
// system events
//
var l_devices = undefined;

SR.Callback.onStart(function () {

	SR.API.INIT_FORM({
		name: 'DeviceInfo',
		fields: [
			{id: 'id', name: 'Device ID', type: 'string', desc: '', must: true, show: false, option: ''},			
			{id: 'name', name: 'Name', type: 'string', desc: 'Your device name', must: true, show: true, option: undefined},
			{id: 'IP', name: 'IP', type: 'string', desc: 'ex. 192.168.33.46', must: true, show: true, option: ''},
			{id: 'port', name: 'Port', type: 'number', desc: '', must: true, show: true, option: undefined}
		]
	}, function (err, ref) {
		if (err) {
			return LOG.error(err);
		}
		l_devices = ref['DeviceInfo'];
		LOG.warn('l_devices');
		LOG.warn(l_devices);
	});
});

SR.Callback.onStop(function () {
	
});
