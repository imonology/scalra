/* cSpell:disable */
/* global SR, LOG, UTIL */
//
//  queue.js
//
// an advanced queue based on Stephen Morley's queue.js
// to automatically handle event re-queueing
//
//    methods:
//        enqueue(event, event_handler)        // store a event onto queue that will be handled by 'event_handler'
//        activate()                        // allows the queue to keep execution
//
// NOTE: 'event_handler' needs to process event and return
//         'true'         for event completion
//         'false'     for re-queueing the event to be executed next time
//       'undefined' or no return for pausing
//

//require('./global');
var FIFOqueue = require('./_queue');

exports.icQueue = function () {

	// internal queue
	var queue   = new FIFOqueue.Queue();

	// whether the queue is currently processing
	var busy    = false;

	// customized handler for the queued event
	var handler = null;

	// to show current length of queue
	this.getLength = function () {
		return queue.getLength();
	};

	// to store a event item onto queue
	this.enqueue = function (item, event_handler) {

		var caller = arguments.callee.caller + '';
		//console.log(SR.Tags.WARN + 'enqueue event, caller: ' + caller.substring(0, 100));

		// must provide initial event handler
		// but can only have one event handler per queue, future queue will be ignored
		if (handler === null) {

			if (typeof event_handler !== 'function') {
				console.log(SR.Tags.ERR + 'cannot enqueue event, no handler provided' + SR.Tags.ERREND);
				return;
			}

			// keep a reference to event handler
			handler = event_handler;
		}

		// store event item in internal FIFO queue
		queue.enqueue(item);

		// execute event
		this.activate();
	};

	// start processing
	this.activate = function ()    {

		// activate queue processing if currently not busy
		if (busy === false) {
			busy = true;
			UTIL.asyncCall(processEvent);
		}
	};

	// this is private method to process
	var processEvent = function () {

		// get a event from the front of queue
		var tmdata = queue.dequeue();

		// whether to keep processing (default is no)
		busy = false;

		// check if data exists
		if (tmdata === undefined) {
			return;
		}

		// handle the event if handler is available
		if (handler === null) {
			console.log(SR.Tags.ERR + 'handler undefined, cannot process event' + SR.Tags.ERREND);
			return;
		}

		switch (handler(tmdata)) {

		// if the event is not handled, re-queue it
		case false:
			queue.enqueue(tmdata);
			break;

			// return true, keep processing
		case true:
			break;

			/*
            // NOTE: we do not pause continuing execution, because it's possible for a event
            //         to consider it finished, re-activate the queue (which it think it has paused),
            //       but then the execution runs to the end of handler, and returning a undefine to pause icQueue
            //       this will thus cause a event to indefinitely pause without any on-going progress.
            //
            //         Currently if the event has returned, we assume it's been processed.
            //         If not yet, then it's up to the handler to re-enqueue the event (by returning 'false')
            //       note that it's possible that the previous event is still being processed
            //       (for example, waiting for DB to return), while the next event starts processing
            //       so the ordering may not be preserved.
            //       The assumption we have is that events are relatively independent from each other
            //       so such out-of-sequence processing may be "okay," as long as handler will properly re-queue the event
            //       in case it needs to be processed again
            //
            */

			// did not return anything, pause execution
		default:
			//console.log(SR.Tags.WARN + 'pause processing event, callee: ' + arguments.callee.name);
			return;
			// break;
		}

		// keep processing
		busy = true;
		UTIL.asyncCall(processEvent);
	};
};
