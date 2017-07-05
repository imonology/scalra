//
//
// job_queue.js
//
//
//
// 2011-05-27 修正 nextTick 造成管線阻塞
// 2011-05-28 runTF 裡,  l_busy設為 true 和 l_nativeRunTF 的執行順序 issue (假如 tf 只有一項, 則會有 l_busy 為 true 卻停止 tick 的情況.
// 2011-05-28 l_nativeRunTF 裡, 函數執行完畢釋放 object issue
// 2011-07-20 更換 fifo queue algorithm (http://code.stephenmorley.org/javascript/queues/)
// 2011-09-04 簡化執行流程
// 2012-10-25 rename TaskQueue to JobQueue
// 2014-06-18 simplify & debug, rename internal variables
// 2014-06-21 remove requirement to call done() when a job's finished
// 2017-07-05 add: "timeout" init parameter
//


//-----------------------------------------
// define local variables
//
//-----------------------------------------



//-----------------------------------------
// define local function
//
//-----------------------------------------

//-----------------------------------------
var l_pool = {};

// create a new queue
exports.create = function () {
    var uid = UTIL.createUUID();
    l_pool[uid] = {
        table: [],				// a list of functions (jobs) to be executed in sequence
        counter: 0,				// index to the currently executing job
		failed: false,			// whether a given job has failed
        //retries: 0			// NOTE: not used, but can be used to re-try function execution?
    };
    return uid;
}

// destory an existing queue
var l_destroy = function (id, onDone) {
	delete l_pool[id];
	UTIL.safeCall(onDone);
};

// add a new function / task to execute to the queue
// optional parameter determines whether the function always will be executed, or will be skipped if 
// previous jobs have failed
exports.add = function (id, func, always_execute) {
	// if queue does not exist then don't add
    if (l_pool.hasOwnProperty(id) === false)
        return;
	   
    l_pool[id].table.push(
        {
			// NOTE: should we record which is successful and which is not?
            func: func,
			always: (always_execute !== false),
        }
    );
};
   
// execute next job for a given queue
var l_run = exports.run = function (id) {
    if (l_pool.hasOwnProperty(id) === false) {
		console.log('[SR.JobQueue]::run::'+SR.Tags.ERR+' id: ' + id + ' not found.' + SR.Tags.ERREND);
        return;
    }
	
	// error checking, should not happen as counter is advanced internally
	if (l_pool[id].counter >= l_pool[id].table.length) {
		console.log('[SR.JobQueue]::run:: ' +SR.Tags.ERR + 'size not enough: ' + l_pool[id].table.length + ' accessing: ' + l_pool[id].counter + SR.Tags.ERREND);
        return;
	}
	
	// TODO: func may be replaced when function is called 2nd time? thus callback result will be incorrect?
	// but possibly not, as there should be only one jobqueue executing at once
	var func = l_pool[id].table[l_pool[id].counter].func;
	
	// check if we should skip this job
	if (l_pool[id].failed === true && l_pool[id].table[ l_pool[id].counter ].always === false) {
		// continue executing next job
		return l_done(id, func);
	}
	
	UTIL.safeCall(func, function (result) {
	
		// if not successful, remove whole job queue		
		if (result === false) {
			console.log('[SR.JobQueue]::run::' + SR.Tags.WARN + ' id: ' + id + ' job returns error, skip executing following depended jobs' + SR.Tags.ERREND);
						
			// mark fail for this queue
			l_pool[id].failed = true;
		}

		// still continue execution
		l_done(id, func);
	});
};

var l_done = exports.done = function (id, func) {
    if (l_pool.hasOwnProperty(id) === false)
        return;

    // trigger next function
    l_pool[id].counter++;

    // if no more job, delete the queue (all done)
    if (l_pool[id].counter === l_pool[id].table.length) {
		l_destroy(id);
    }
	// execute the next job
	else {
		l_run(id);	
	}
};

var l_name = 'SR.JobQueue';

// object-based JobQueue functions
function JobQueue(para) {
	this.queue = [];
	this.curr = 0;
	this.all_passed = true;
	this.timeout = ((typeof para === 'object' && typeof para.timeout === 'number') ? para.timeout : 0);
}

// add a job to the queue
// if 'keep_execute' is false, then if this job fails, the rest of jobs won't execute
// by default this is assumed to be 'true'
JobQueue.prototype.add = function (step, keep_execute, name) {
	
	//LOG.sys('adding to queue... keep_execute: ' + keep_execute + ' name: ' + name, l_name);
	/*
	if (!name) {
		LOG.stack();
	}
	*/
	
	if (typeof step !== 'function')
		LOG.error('job is not a function', l_name);
	else
		this.queue.push({job: step, keep: keep_execute, name: name, done: false});
}

// execute all jobs in the queue sequentially
JobQueue.prototype.run = function (onDone) {
	LOG.sys('start executing a job... onDone provided: ' + (typeof onDone === 'function'), l_name);
	this.onDone = onDone;
	this.next();
}

// execute next job in queue 
JobQueue.prototype.next = function () {
	
	var that = this;
	
	// all jobs are done
	if (this.curr >= this.queue.length)
		return this.done();
	
	var item = this.queue[this.curr];
	LOG.sys('running next job: ' + (item.name ? item.name : ''), l_name);
	
	var timeout_trigger = undefined;
	
	// if the job returns properly with success/fail result
	var onJobDone = function (result) {
		item.done = true;
		
		// clear timeout if any
		if (timeout_trigger) {
			clearTimeout(timeout_trigger);
			timeout_trigger = undefined;
		}
		
		if (result === false) {
			that.all_passed = false;
			
			// ready to stop if this job is a showstopper
			if (item.keep === false)
				return that.done();
		}
		that.curr++;
		that.next();
	}
	
	// if the job does not finish in time
	var onTimeout = function () {
		if (item.done === false) {
			LOG.error('job timeout! please check if the job calls onDone eventually. ' + (item.name ? '[' + item.name + ']' : ''), l_name);
			
			// force this job be done
			onJobDone(false);
		}
	}
	
	// NOTE: it's possible that this job won't return and call the onDone callback
	// if a timeout value exists then we should force stop this job with a result of 'false'
	UTIL.safeCall(item.job, onJobDone);
	
	// still timeout if timeout value exists
	if (this.timeout > 0) {
		timeout_trigger = setTimeout(onTimeout, this.timeout);
	}
}

// all jobs are done, return back
JobQueue.prototype.done = function () {
	LOG.sys('all jobs done, calling onDone type: ' + typeof this.onDone + ' passed: ' + this.all_passed, l_name);
	UTIL.safeCall(this.onDone, this.all_passed);
}

exports.createQueue = function (para) {
	return new JobQueue(para);
}
    
