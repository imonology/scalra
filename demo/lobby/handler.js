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
	name:	'+string',
	age:	'+string',
}, function (args, onDone, extra) {
	    
	// print some message
	LOG.debug('HELLO_EVENT has been called');
	LOG.warn('args:');
	LOG.warn(args);
	LOG.warn('extra');
	LOG.warn(extra);
	
	if (!args.age) {
		LOG.error('no age sent to HELLO_EVENT!', 'lobby');	
	}
	
	// increment counters
	reset_counter++;
	l_states['counter']++;
	
	var age = args.age ? parseInt(args.age) : 0;
	age = age + 2;
	
	// send back response
	onDone(null, {name: args.name, age: age, 中文: '中文也通!', 
				  reset_counter: reset_counter, 
				  persist_counter: l_states['counter']});
});

SR.API.add('addDevice', {
	name: 'string',
	ip: 'string',
	port: 'number'
}, (args, onDone, err) => {
	const { name, ip, port } = args;
	const id = UTIL.createUUID();
	SR.API.UPDATE_FORM({
		form_name: 'DeviceInfo',
		values: {
			id,
			name,
			ip,
			port
		}
	});
});

//
// custom logic
//
var l_form = SR.State.get('FlexFormMap');

SR.API.after('UPDATE_FORM', function (args, output, onDone) {
	// if result is bad, just ignore it
	if (output.err) {
		return onDone();
	}

	if (l_form.hasOwnProperty(args.form_id) === false) {
		return onDone();
	}
	
	LOG.warn('perform post-action for UPDATE_FORM...')
	var form = l_form[args.form_id];
	
	switch (form.name) {
		case 'DeviceInfo':
			LOG.warn('output:');
			LOG.warn(output);
			
			var record_ids = output.result.record_ids;
			LOG.warn('record_ids:');
			LOG.warn(record_ids);
			if (!record_ids)
				break;
			
			var values = form.data.values;
			
			// find records just added
			for (var record_id in values) {
				if (record_ids.indexOf(record_id) >= 0) {
					var record = values[record_id];
					record.id = UTIL.createUUID();
				}
			}
			// write back to DB
			form.sync(function (err) {
				if (err) {
					LOG.error(err);
					return onDone(err);
				}
				return onDone();
			})
			return;
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
			{id: '*name', name: 'Name', type: 'string', desc: 'Your device name', must: true, show: true, option: undefined},
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

		// init some demo data
		if (!Object.keys(l_devices).length) {
			SR.API.addDevice({ name: 'Device 001', ip: '10.32.21.147', port: 10035 });
			SR.API.addDevice({ name: 'Camera9', ip: '163.22.32.199', port: 24567 });
			SR.API.addDevice({ name: 'Camera lobby', ip: '192.168.5.66', port: 21104 });
			SR.API.addDevice({ name: 'DVRRR', ip: '10.32.21.193', port: 30057 });
		}
	});
});

SR.Callback.onStop(function () {
	
});
