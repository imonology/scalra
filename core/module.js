//
//
// module.js
//
// scalra module system
// 
// 	modules are server-side self-contained functionality that may be initialzed with some parameters during server bootup,
//  and will be closed down, released resources when server shuts down.
//
// history
// 2014-04-24    initial version
//

var l_name = 'SR.Module';

var l_modules = {};

// internal queue to store start/stop steps
var l_steps = [];

// jobqueue to start modules
var l_startqueue = undefined;

// to add a step (for module start/stop)
// each 'step' contains start/stop/name
var l_addStep = exports.addStep = function (step, name) {
	
	if (!step || !step.start || !step.stop) {
		LOG.error('missing step or start/stop from step for [' + name + ']', l_name);
		LOG.stack();
		return false;
	}
	
	name = step.name || name;
	
	l_steps.push({
		start: step.start,
		stop:  step.stop,
		name:  name});
	
	// add to start queue
	if (l_startqueue)
		l_startqueue.add(step.start, true, name);
		
	return true;
}

// add a new module
// a module needs to be:
/*
	{
		config:	'object'			// config to use when starting the module
		start: 	'function',			// actual function to start module execution
		stop: 	'function'			// tasks to perform when server shuts down
	}
*/


// TODO: if we can find a way to avoid usage of SR.Settings.FRONTIER.END_JQ, then can remove this:
// create a valid component 
var l_buildStep = function (module) {

    var step = {
		
		config : {},
		
        start : function (onDone) {
			LOG.warn('starting module [' + module.name + ']...', l_name);
			module.start(step.config, function () {
				// NOTE: this is to prevent a project that calls onDone more than once by accident
				if (onDone) {
					onDone();
					onDone = undefined;
				}
			});
        },

        stop : module.stop
    }

    return step;
}


// module needs to have parameters:
// start / stop / config
var l_add = exports.add = function (name, module) {

	// check if module has all relevant needed strcuture
	if (typeof module !== 'object' ||
		typeof module.start !== 'function' || 
		typeof module.stop  !== 'function') {
		LOG.debug('module [' + name + '] does not have start or stop functions, skip converting handlers...', l_name);
		return undefined;
	}
	
	LOG.sys('adding new module [' + name + ']...', l_name);
	module.name = name;
	
	// we'll replace the start / stop functions a bit	
	l_modules[name] = l_buildStep(module);
	
	return l_modules[name];
}

// get a module
var l_get = exports.get = function (name) {
	if (l_modules.hasOwnProperty(name))
		return l_modules[name];
	return undefined;
}

// load multiple modules at once
/*
	args: {
		dir:	'string',					// directory of the module
		name:	['string' || 'Array'],		// name or names of the modules
		config:	'object'					// config for the module(s)
	}
*/
var l_loadModules = function (args) {
	var names = (Array.isArray(args.name) ? args.name : [args.name]);
	args.dir = args.dir || '';
	
	for (var i in names) {
		l_load(args.dir + names[i], args.config);
	}
}

// load a given module from file
var l_load = exports.load = function (name, config) {
	
	if (typeof name === 'object')
		return l_loadModules(name);
	
	LOG.debug('loading module [' + name + ']...', l_name);

	// check if modules exists
	var fullpath = SR.path.resolve(SR.Settings.SR_PATH, 'modules', name + '.js');

	if (UTIL.validateFileSync(fullpath) === false) {
		
		// try all relevant paths if default module does not exist
		LOG.warn('module file not exist: ' + fullpath + ' (try to reload it elsewhere)', l_name);

		var fullpath = undefined;		
		for (var i in SR.Settings.MOD_PATHS) {
			var module_path = SR.path.resolve(SR.Settings.MOD_PATHS[i], 'modules', name + '.js');
			
			if (UTIL.validateFileSync(module_path) === true) {
				fullpath = module_path;
				LOG.warn('valid module path found: ' + fullpath, l_name);
				break;
			}			
		}
				
		if (!fullpath) {
			LOG.error('module [' + name + '] cannot be found anywhere', l_name);
			return false;
		}
	}
			
	// monitor will load the whole module js file (synchronously), which in turn will call SR.Module.add to save as one module
	var loaded_module = SR.Script.monitor('SR_MOD_' + name, fullpath);
	var module = l_get(name);
	
	// load automatically if module does not self-load
	// including: 1. module as a step with start/stop 2. load module's handlers
	if (typeof module === 'undefined' && loaded_module) {
		module = l_add(name, loaded_module.module);
		if (module) {
			SR.Handler.add(loaded_module);
		}
	}
	
	if (!loaded_module || !module)
		return false;
	
	// store config & api call
	module.config = config || {};
	
	// keep reference to the required script
	module.api = loaded_module;
	
	// add to steps (for starting/stopping the module later)
	l_addStep(module, name);
	
	return true;
}

// executing all loaded modules' start()
exports.start = function (onDone) {
	
	// create new processing queue
	l_startqueue = SR.JobQueue.createQueue();

	// various steps
	for (var i in l_steps) {
		l_startqueue.add(l_steps[i].start, true, l_steps[i].name);
	}
	
	// actually execute the steps
	l_startqueue.run(function (result) {
		LOG.warn('all start jobs are done, result: ' + result, l_name);
		UTIL.safeCall(onDone, result);
	});
}

// executing all loaded modules' stop()
exports.stop = function (onDone) {
	
	// create new processing queue
	var jobqueue = SR.JobQueue.createQueue();

	for (var i = l_steps.length-1; i>=0; i--)
		jobqueue.add(l_steps[i].stop, true, l_steps[i].name);		
	
	// actually execute the steps
	jobqueue.run(function (result) {
		LOG.warn('all stop jobs are done, result: ' + result, l_name);
		UTIL.safeCall(onDone, result);
	});
}

// init a module (load it and also perform start)
exports.init = function (name, config, onDone) {

	l_load(name, config);
	var module = l_get(name);
	LOG.debug('init module [' + name + ']:', l_name);
	LOG.debug(module, l_name);
	
	if (module)
		UTIL.safeCall(module.start, onDone);
	else {
		LOG.error('module not loaded: ' + name, l_name);
		UTIL.safeCall(onDone, false);
	}
}

exports.dispose = function (name, onDone) {
	var module = l_get(name);
	if (module)
		UTIL.safeCall(module.stop, onDone);
	else {
		LOG.error('module not loaded: ' + name, l_name);
		UTIL.safeCall(onDone, false);
	}
}

// add a global function call
SR.Call = function (api_name) {
	try {
		var names = api_name.split('.');
		var module_name = names[0];
		var func_name = names[1];
		
		LOG.warn('calling module [' + module_name + '] func: ' + func_name, l_name);
		
		var module = l_get(module_name);
		if (!module) {
			LOG.error('module [' + module_name + '] does not exist!', l_name);
			return;
		}

		//LOG.warn(module.api);
		// NOTE: if a module isn't loaded correctly, module.api may be undefined
		var func = (module.api && module.api[func_name] ? module.api[func_name] : undefined);
		
		if (typeof func === 'string' || typeof func === 'object')
			return func;
			
		if (typeof func !== 'function') {
			LOG.error('module function [' + func_name + '] does not exist!', l_name);
			return;
		}
					
		var args = Array.prototype.slice.call(arguments);
		return func.apply(this, args.slice(1));
	}
	catch (e) {
		LOG.error(e);	
	}
}