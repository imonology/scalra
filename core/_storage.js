/* 
	original version by Marvin Jeng
*/

var sys = require('util'),
	kit   = require('./_basekit'),
	mongo = SR.mongo;

var codename = 'bc',
	funcname = 'storage',
	version  = 1,
	svcname  = codename+'-'+funcname+'-'+version,
	say = kit.Say.curry(svcname),
	see = kit.See.curry(svcname);

// 2013-09-23: set default write concern to {safe: true}
// see: 
// http://www.mongodb.org/display/DOCS/getLastError+Command 
var openDB = exports.openDB = function (dbName, host, port) {
	var conn = new mongo.Db(dbName, new mongo.Server(host, port, {}, {strict:true, native_parser:true}), {safe: true});
	return conn;
};

var DBSyncer = exports.DBSyncer = function (){
	var _que = kit.AQueue(arguments[0]||1024);
	var _go = undefined;
	var _th = 4;

	// write immediately
	var _sync = function (obj){              
		if (!obj) {
			say('sync obj is undefined ' + typeof obj );
			return;
		}
		say('save '+obj.data); // return;

		var clt = obj.clt;
		var data = obj.data;
      
		// object with the same id will be over-written
		clt.save(data, function (err, doc){
			if (err) {
				say('1aazzzzzzzzzzzzzzzzz');
				if (obj.cbf) obj.cbf(kit.ex('DBERR', err));
			} else {
				if (doc===undefined){
					say('Doc not found, do insertion: ' + data._id);
					clt.insert(data);
				}
				say('2aazzzzzzzzzzzzzzzzz' + typeof obj.cb);
				if(obj.hasOwnProperty('cb')) {
					say('3aazzzzzzzzzzzzzzzzz');
					obj.cb();
				}
			}
		});
	};

	var _proc = function (){                    // 寫出定量的raw
		var c = 0;
		while(c++<_th && _que.count()>0){
			var s = _que.shift();
			say('process obj ' + JSON.stringify(s.data));
			_sync(s);
		}
		say('pending '+_que.count());
	};

	return {
		proc: _proc,
		flush: function (){                   // 寫出剩餘的raw, 清空 queue
			while(_que.count()>0)
				_sync(_que.shift());
			say('pending '+_que.count());
		},
		push: function (clt, data, cb, cbf){  // 推入一個syncer
			if (_que.count() > 5*_th){
				if (cbf) cbf(kit.ex('FULL', Math.ceil(_que.count()/_th)));
				return ;
			}
			_que.push({'clt':clt, 'data':data, 'cb':cb, 'cbf':cbf});
			say('2ssssssszzzzzzzzzzzzzzzzz'+ typeof cb);
		},
		go: function (){                      // 開始一切自動功能
			if (_go===undefined) _go = setInterval(_proc, 10*1000);
		},
		stop: function (){                    // 停止一切自動功能
			clearInterval(_go);
			_go = undefined;
			while(_que.count()>0)
				_sync(_que.shift());
		}
	};
};

/*
var DataProc = {
    raw: function (){
      return {};
    },
    updateRaw: function (k, v){
      var src = this.raw();
      src[k] = v;
      this.raw = function (){
          return src;
      };
    },
    set: function (k, v, hide){
      var _v = v;
      if (!hide){
        this[k] = function (input){
          if (input) {
            _v = input;
            //DataObject.prototype.
            this.updateRaw.apply(this, [k, _v]);
          }
          return _v;
        };

      }

      //DataObject.prototype.
      this.updateRaw.apply(this, [k, _v]);
    },
    del: function (k){
      delete this[k];        // remove getter

      var src = this.raw();  // remove field from raw
      delete src[k];
      this.raw = function (){
        return src;
      };
    }
};

var DO = exports.DO = function () {

  return {
    updateRaw: DataProc.updateRaw,
    raw: DataProc.raw,
    set: DataProc.set,
    del: DataProc.del
  };
};
*/

/*
var DO = exports.DO = function () {
  var updateRaw = function (k, v){
    var src = this.raw();
    src[k] = v;
    this.raw = function (){
        return src;
    };
  };

  return {
    raw: function (){
      return {};
    },
    set: function (k, v, hide){
      var _v = v;
      if (!hide){
        this[k] = function (input){
          if (input) {
            _v = input;
            updateRaw.apply(this, [k, _v]);
          }
          return _v;
        };
      }

      updateRaw.apply(this, [k, _v]);
    },
    del: function (k){
      delete this[k];        // remove getter

      var src = this.raw();  // remove field from raw
      delete src[k];
      this.raw = function (){
        return src;
      };
    },
  };
};
*/


var Grouping = function (){
	var that = this;
	var group = {};

	this.glist = function (tag){
		if (group.hasOwnProperty(tag))
			return group[tag];
		return undefined;
	};
	this.gjoin = function (tag, oid){
		if (!group.hasOwnProperty(tag)){
			group[tag] = {};
		}
		group[tag][oid] = 'state';
	};
	this.gquit = function (tag, oid){
		if (group.hasOwnProperty(tag)){
			delete group[tag][oid];
			if (group[tag].count() < 1)
				delete group[tag];
		}
	};
	this.gdump = function (){
		see(group);
	};
};

var Doc = function () {
	this.modified = 0;

	var updateRaw = function (k, v){
		var src = this.raw();
		src[k] = v;
		this.raw = function (){
			return src;
		};
		this.modified++;
	};

	this.raw = function (){
		return {};
	};

	this.set = function (k, v, hide){
		var _v = v;
		if (!hide){
			this[k] = function (input){
				if (input !== undefined) {
					_v = input;
					updateRaw.apply(this, [k, _v]);
				}
				return _v;
			};
		}

		updateRaw.apply(this, [k, _v]);
	};

	this.del = function (k){
		delete this[k];        // remove getter

		var src = this.raw();  // remove field from raw
		delete src[k];
		this.raw = function (){
			return src;
		};
	};

	this.hi = function () {
		say('hi doc');
	};

};

Doc.prototype = new Grouping;

var GroupDoc = exports.GroupDoc = function (){
	return new Doc;
};

var Entity = exports.Entity = function (){
	var clt = undefined;
	var syncer = undefined;
	var _sot = undefined;
	var u = GroupDoc();
	u.set('tmborn', new Date());
	u.set('version', 1);

	var _rsync = undefined;
	u.rsync = function (th){
		if (th < 1 && _rsync)
			clearTimeout(_rsync);
		else
		//say('check th='+th+' mod='+u.modified);
			_rsync = setTimeout(function (){
				if (u.modified >= th){
					u.sync();
					u.modified = 0;
				}
				u.rsync(th);
			}, 1000);
	};
	u.setDataSource = function (c, s){
		clt = c;
		syncer = s;
	};

	u.load = function (oid, callback, callbackFail){
		if (!oid) oid = u._id();
		clt.findOne({_id:oid}, function (err, doc){
			if (err || doc===undefined) {
				if (callbackFail) callbackFail();
			}else{
				for (var k in doc)
					u.set(k, doc[k]);
				if (callback) callback();
			}
		});
	};
	u.sync = function (cb){  // update db
		var data = u.raw();
		var oid = data._id;
		//clt.findAndModify({_id:oid}, [], {}, true, true, function (err, doc){
		clt.findAndModify({_id:oid}, [], {'$set':data}, function (err, doc){
			if (cb) cb(err);
		});  
	};
	u.save = function (cb){
		clt.save(u.raw(), function (err, raw){
			if (cb) cb(raw);
		});    
	};
	u.clone = function (cb, cbf){   // will produce new doc
		var data = u.raw();
		see(data._id, 'CLONECLONE');
		//clt.update({_id:data._id}, {'$set':data}, function (err, doc){
		clt.save(data, function (err, doc){ // object with the same id will be overwrite
			if (err){
				cbf(err);
			}else{
				if (doc===undefined){
					say('Doc not found, do insertion: ' + data._id);
					clt.insert(data);
				}
				if(cb) cb();
			}
		});

		/*  bugged, callback not triggered inside syncer
    syncer.push(clt, data, function (ok){
      say(data._id+' syncer push @ ' + new Date());
      if(cb) cb(ok);
    }, function (bad){
      see('syncer push fail' + bad);
      if (bad.ex==='FULL'){
        u.psync(bad.ref*1000);
      }
      if(cbf) cbf(bad);
    });
    */
	};
	u.sot = function (t){
		if (t < 1 && _sot)
			clearTimeout(_sot);
		else
			_sot = setTimeout(function (){
				u.sync();
				u.sot(t);
			}, t);
	};
	u.psync = function (t){
		say('do psync @ ' + new Date());
		setTimeout(function (){
			u.sync();
		}, t);
	};
	u.gsync = function (tag){  // pseudo function
		say('do gsync @ ' + new Date()); return;
		var id = u.glist(tag);
		ents.foreach(function (e){
			clts[e].sync();
		});
	};
	u.modified = 0;
	return u;
};

var Account = exports.Account = function (){
	var u = Entity();
	u.set('email', arguments[0]||'example@mail'); // private
	u.set('pwd'  , arguments[1]||'uuddlrlrba');
	u.modified = 0;
	return u;
};

