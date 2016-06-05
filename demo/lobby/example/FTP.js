

//
//  handler.js
//
//  main server logic
//

// a pool for all message handlers
var l_handlers = exports.handlers = {};
var l_checkers = exports.checkers = {};

//-----------------------------------------
// define handlers (format checkers and event handlers)
//
//-----------------------------------------


l_handlers.TEST_FTP = function (event) {
	var cb = function (err) {
		if (err) {
			if (err.fin) {
				event.done(err.toString(), "demo");
			}
			else {
				LOG.warn(err.toString(), "demo");
			}
		}
		else {
			event.done("OK");
		}
	};

	var filepath = [
		{
			local: "test_ftp.tmp",
			remote: "TEST_FTP1.tmp"
		},
		{
			local: "test_ftp.tmp",
			remote: "TEST_FTP2.tmp"
		},
		{
			local: "lobby/nonexist",
			remote: "TEST_FTP3.tmp"
		},
		{
			local: "lobby/handler.js",
			remote: "tmp/TEST_FTP4.tmp"
		},
		{
			local: "settings.js",
			remote: "TEST_FTP5.tmp"
		}
	];

	var config = {
		host: "src.scalra.com",
		user: SR.Settings.ftp.username,
		password: SR.Settings.ftp.password
	};
	
	SR.Notify.ftpUpload(config, filepath, cb);
};


l_handlers.COMP_GETPAGE = function (event) {
	var page_num = Number(event.data.pn);
	var page_size = Number(event.data.ps);

	var cb_getPage = function (err_getPage, docs, last_doc) {
		if (err_getPage) {
			event.done(err_getPage.toString());
		}
		else {
			var cb_getPageBySkippingDocs = function (err, docs2, last_doc2) {
				if (err) {
					event.done(err.toString());
				}
				else {
					for (var i = 0; i < docs2.length; i++) {
						if (String(docs[i]._id) !== String(docs2[i]._id)) {
							LOG.warn(String(docs[i]._id)  + " diff? " + String(docs2[i]._id));
						}
					}
					event.done(docs.length, docs2.length);
				}
			};
			SR.DB.getPageBySkippingDocs(SR.Settings.DB_NAME_SYS_EVENT, q, opts, page_num, cb_getPageBySkippingDocs);
		}
	};

	var q = {};
	var opts = {
		limit: page_size
	};
	SR.DB.getPage("SYS_LOG", page_num, cb_getPage);
};

l_handlers.GETPAGE = function (event) {
	var start = new Date().getTime();
	var page_num = Number(event.data.pn);

	var cb_getPage = function (err_getPage, docs, last_doc) {
		if (err_getPage) {
			event.done(err_getPage.toString());
		}
		else {
			var end = new Date().getTime();
			event.done(docs.length, end - start);
		}
	};
	SR.DB.getPage("SYS_LOG", page_num, cb_getPage);
};

l_handlers.PAGINATE = function (event) {
	var start = new Date().getTime();
	var page_size = Number(event.data.ps);

	var cb_paginate = function (err_paginate) {
		if (err_paginate) {
			event.done(err_paginate.toString());
		}
		else {
			var end = new Date().getTime();
			event.done("OK", end - start);
		}
	};

	var q = {};
	var opts = {
		limit: page_size
	};
	SR.DB.paginate("SYS_LOG", SR.Settings.DB_NAME_SYS_EVENT, q, opts, cb_paginate);
};

l_handlers.PAGINATE_AND_GETPAGE = function (event) {
	var page_size = Number(event.data.ps);
	var page_num = Number(event.data.pn);

	var cb_paginate = function (err_paginate) {
		if (err_paginate) {
			event.done(err_paginate.toString());
		}
		else {
			var cb_getPage = function (err_getPage, docs, last_doc) {
				if (err_getPage) {
					event.done(err_getPage.toString());
				}
				else {
					event.done(docs.length, docs);
				}
			};
			SR.DB.getPage("SYS_LOG", page_num, cb_getPage);
		}
	};

	var q = {};
	var opts = {
		limit: page_size
	};
	SR.DB.paginate("SYS_LOG", SR.Settings.DB_NAME_SYS_EVENT, q, opts, cb_paginate);
};

l_handlers.GETPAGESKIP = function (event) {
	var page_size = Number(event.data.ps);
	var start = new Date().getTime();
	var page_num = Number(event.data.pn);

	var cb = function (err, docs, last_doc) {
		if (err) {
			event.done(err.toString());
		}
		else {
			var end = new Date().getTime();
			event.done(docs.length, end - start);
		}
	};

	var q = {};
	var opts = {
		limit: page_size
	};
	SR.DB.getPageBySkippingDocs(SR.Settings.DB_NAME_SYS_EVENT, q, opts, page_num, cb);
};

l_handlers.SYS_EVENT_COUNT = function (event) {
	var onSuccess = function (count) {
		event.done(count);
	};
	SR.DB.count(SR.Settings.DB_NAME_SYS_EVENT, onSuccess);
};

l_handlers.ADD_LOG_EVENT = function (event) {
	var count = 0;
	while (count < event.data.n) {
		count++;
		LOG.event("STRESS TEST", SR.Settings.SERVER_INFO);
	}
	event.done();
};

l_handlers.TEST_LOG = function (event) {

	var onSuccess = function (logs) {
        event.done(logs.length, logs);
	};

	var onFail = function (err) {
        LOG.warn(err);
	};
	
	var q = {};
	var cond = {
		sort: {
			time: -1
		},
		limit: Number(event.data.n)
	};

    SR.DB.getArray(SR.Settings.DB_NAME_SYS_EVENT, onSuccess, onFail, q, cond);
};


l_handlers.TEST_CTM = function (event) {
	SR.Notify.customizeMethod("Hello", function (info, user) {
			LOG.warn("Hello " + user.account);
			LOG.warn(info);
		}
	);
	event.done();
};

l_handlers.TEST_REG = function (event) {
	var cb = function (err) {
		if (err) {
			LOG.warn(err.toString());
		}
	};
	SR.Notify.register(event.data.level, [/*"SMS", */"email", "client", "Hello"], event.session._account, cb);
	event.done();
};

l_handlers.TEST_REGALL = function (event) {
	var cb = function (err) {
		if (err) {
			LOG.warn(err.toString());
		}
	};
	SR.Notify.register(event.data.level, ["email", "client", "Hello"], cb);
	event.done();
};

l_handlers.TEST_CONN = function (event) {
	var cb = function (err) {
		if (err) {
			LOG.warn(err.toString());
		}
	};
	LOG.warn(event.session._account);
	LOG.warn(event.conn);
	SR.Notify.subscribe(event.session._account, event.conn, cb);
	event.done();
};

l_handlers.TEST_ALERT = function (event) {
	SR.Notify.alert(event.data.type, {msg: event.data.msg}, event.data.level);
	event.done();
};


//
// system events
//

SR.Callback.onStart(function () {

});

SR.Callback.onStop(function () {
	
});
