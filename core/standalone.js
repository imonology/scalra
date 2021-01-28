//
// tested: nodejs v0.10.25

/* todo:

*/

var os = require('os');
var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');
// var sys = require('util');

// clean empty elements in an array
var cleanArray = exports.cleanArray = function (actual){
	if (!actual) {return false;}
	var newArray = [];
	for(var i = 0; i<actual.length; i++){
		if (actual[i]){
			newArray.push(actual[i]);
		}
	}
	return newArray;
};


//compare two arrays
exports.compare2arrays = compare2arrays;
function compare2arrays (array1, array2) {
	//console.log("array1.length" + array1.length + " array2.length" + array2.length);
	if (array1.length !== array2.length) {
		return false;
	} else {
		return array1.every((element, index) => {
			return element === array2[index];
		});
	}
}


// check disk space
var diskSpace = exports.diskSpace = function (arg) {
	var disk = {};
	switch (process.platform) {
	case 'linux':
		exec('df -k',(err, stdout, stderr) => {
			var x = stdout.toString();
			for (let i = 0; i <10000; i++) {
				x = x.replace('  ', ' ');
				if (x.indexOf('  ') === -1) {
					break;
				}
			}
			x = x.split('\n');
			for (let i in x) {
				var id = x[i].split(' ');
				id = id[id.length -1];
				if (id === '' || id === 'on') {
					continue;
				}
				disk[id] = {detail:x[i]};
				disk[id].sizeK = parseInt(x[i].split(' ')[1]);
				disk[id].usedK = parseInt(x[i].split(' ')[2]);
				disk[id].freeK = parseInt(x[i].split(' ')[3]);
				disk[id].size = disk[id].sizeK * 1024;
				disk[id].used = disk[id].usedK * 1024;
				disk[id].free = disk[id].freeK * 1024;
				disk[id].sizeM = Math.round(disk[id].sizeK / 1024);
				disk[id].sizeG = Math.round(disk[id].sizeM / 1024);
				disk[id].usedM = Math.round(disk[id].usedK / 1024);
				disk[id].usedG = Math.round(disk[id].usedM / 1024);
				disk[id].freeM = Math.round(disk[id].freeK / 1024);
				disk[id].freeG = Math.round(disk[id].freeM / 1024);
			}
			arg.onDone(null, disk);
		});
		break;

	case 'darwin':
		exec('df -k',(err, stdout, stderr) => {
			var x = stdout.toString();
			//console.log(x);
			for (let i = 0; i <10000; i++) {
				x = x.replace('  ', ' ');
				if (x.indexOf('  ') === -1) {
					break;
				}
			}
			x = x.split('\n');
			for (let i in x) {
				var id = x[i].split(' ');
				id = id[id.length -1];
				if ( id === '' || id === 'on' ) {
					continue;
				}
				disk[id] = {detail:x[i]};
				disk[id].sizeK = parseInt(x[i].split(' ')[1]);
				disk[id].usedK = parseInt(x[i].split(' ')[2]);
				disk[id].freeK = parseInt(x[i].split(' ')[3]);
				if (Number.isNaN(disk[id].sizeK)) {
					disk[id].sizeK = parseInt(x[i].split(' ')[2]);
					disk[id].usedK = parseInt(x[i].split(' ')[3]);
					disk[id].freeK = parseInt(x[i].split(' ')[4]);
				}
				disk[id].size = disk[id].sizeK * 1024;
				disk[id].used = disk[id].usedK * 1024;
				disk[id].free = disk[id].freeK * 1024;
				disk[id].sizeM = Math.round(disk[id].sizeK / 1024);
				disk[id].sizeG = Math.round(disk[id].sizeM / 1024);
				disk[id].usedM = Math.round(disk[id].usedK / 1024);
				disk[id].usedG = Math.round(disk[id].usedM / 1024);
				disk[id].freeM = Math.round(disk[id].freeK / 1024);
				disk[id].freeG = Math.round(disk[id].freeM / 1024);
			}
			arg.onDone(null, disk);
		});
		break;

	case 'win32':
		exec('wmic logicaldisk get', (err, stdout, stderr) => {
			var x = stdout.toString();
			for (let i = 0; i <10000; i++) {
				x = x.replace('  ', ' ');
				if (x.indexOf('  ') === -1) {
					break;
				}
			}
			x = x.split('\n');
			for (let i in x) {
				if (x[i].indexOf('0') === 0) {
					var id = x[i].substring(2,3);
					//console.log(id);
					let tmpx = x[i].split(/ [A-Z]: /);
					//console.log(x[i]);
					disk[id] = {detail:tmpx};
					disk[id].filesystem = tmpx[2].split(' ')[1];
					disk[id].size = parseInt(tmpx[3].split(' ')[0]);
					disk[id].free = parseInt(tmpx[2].split(' ')[2]);
					disk[id].sizeK = Math.round(disk[id].size / 1024);
					disk[id].freeK = Math.round(disk[id].free / 1024);
					disk[id].sizeM = Math.round(disk[id].sizeK / 1024);
					disk[id].freeM = Math.round(disk[id].freeK / 1024);
					disk[id].sizeG = Math.round(disk[id].sizeM / 1024);
					disk[id].freeG = Math.round(disk[id].freeM / 1024);
				}
			}
			arg.onDone(null, disk);
		});
		break;

	default:
		arg.onDone('not support process.platform', {});
		break;
	}
};


// to return a partition or drive for a given path
var whichPartition = exports.whichPartition = function (arg) {
	if (!arg || !arg.path || !arg.onDone) {
		return false;
	}
	var input_path = path.normalize(arg.path);

	fs.stat(input_path, (err, stats) => {
		if (err) {
			return arg.onDone(err, {} );
		}

		fs.realpath(input_path, (err, resolvedPath) => {
			if (err) {
				arg.onDone(err, {});
				return;
			}

			switch (process.platform) {
			case 'linux':
			case 'darwin':
				exec('df ' + resolvedPath, (err, stdout, stderr) => {
					var x = stdout.toString();
					for (var i = 0; i <10000; i++) {
						x = x.replace('  ', ' ');
						if (x.indexOf('  ') === -1) {break;}
					}
					x = x.split('\n');
					x = x[1].split(' ');
					//console.log(x);
					arg.onDone(null, {resolvedPath: resolvedPath, mount: x[x.length -1]});
				});
				break;

			case 'win32':
				arg.onDone(null, {resolvedPath: resolvedPath, drive: resolvedPath.substring(0,1).toUpperCase()});
				break;

			default:
				arg.onDone('not support process.platform', {});
				break;
			}

		});
	});
};


exports.isEnoughDiskSpace = isEnoughDiskSpace;
function isEnoughDiskSpace (arg) {
	//console.log(arg);
	if (!arg) {
		// FIXME: If there is no arg, how could we have arg.onDone()?
		arg.onDone('no given value', 0 , 0);
		return false;
	}

	if (arg.B < 1) {
		arg.onDone('The given value is too small.', 0 , 0);
		return false;
	}
	if (arg.K < 1) {
		arg.onDone('The given value is too small.', 0 , 0);
		return false;
	}
	if (arg.M < 1) {
		arg.onDone('The given value is too small.', 0 , 0);
		return false;
	}
	if (arg.G < 1) {
		arg.onDone('The given value is too small.', 0 , 0);
		return false;
	}

	diskSpace({onDone: function (err, result_space){
		if (err) {
			arg.onDone(err, {});
			return;
		}

		whichPartition({path: arg.path, onDone: function (err, result_part) {
			if (err) {
				arg.onDone(err, {});
				return;
			}

			//console.log(result_part);
			//console.log(result_space);
			if (result_part.drive) {
				if (arg.B) {
					arg.onDone(null, result_space[result_part.drive].free >= arg.B, result_space[result_part.drive].free - arg.B);
				} else if (arg.K) {
					arg.onDone(null, result_space[result_part.drive].freeK >= arg.K, result_space[result_part.drive].freeK - arg.K);
				} else if (arg.M) {
					arg.onDone(null, result_space[result_part.drive].freeM >= arg.M, result_space[result_part.drive].freeM - arg.M);
				} else if (arg.G) {
					arg.onDone(null, result_space[result_part.drive].freeG >= arg.G, result_space[result_part.drive].freeG - arg.G);
				} else {
					arg.onDone('error: input error', false);
				}
			} else if (result_part.mount) {
				if (arg.B) {
					arg.onDone(null, result_space[result_part.mount].free >= arg.B, result_space[result_part.mount].free - arg.B);
				} else if (arg.K) {
					arg.onDone(null, result_space[result_part.mount].freeK >= arg.K, result_space[result_part.mount].freeK - arg.K);
				} else if (arg.M) {
					arg.onDone(null, result_space[result_part.mount].freeM >= arg.M, result_space[result_part.mount].freeM - arg.M);
				} else if (arg.G) {
					arg.onDone(null, result_space[result_part.mount].freeG >= arg.G, result_space[result_part.mount].freeG - arg.G);
				} else {
					arg.onDone('error: input error', false);
				}
			} else {
				arg.onDone('error: undetectable', {});
			}
		}});
	}});
}


// FIXME: this function is not exported, nor been used internally.
// to list network interfaces
function findNetworkInterfaces (d) {
	var ifaces = os.networkInterfaces();
	var ifs = {};
	Object.keys(ifaces).forEach((ifname) => {
		var alias = 0 ;

		ifaces[ifname].forEach((iface) => {
			if ('IPv4' !== iface.family || iface.internal !== false) {
				// skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
				return;
			}

			if (alias >= 1) {
				// this single interface has multiple ipv4 addresses
				//console.log(ifname + ':' + alias, iface.address);
				ifs[ifname + ':' + alias] = iface.address;
			} else {
				// this interface has only one ipv4 adress
				//console.log(ifname, iface.address);
				ifs[ifname] = iface.address;
			}
		});
	});
	d.onDone(null, ifs);
}


// recursive file list
// FIXME:
//	Why count `pending` instead of done() at the end of this function?
//	Due to the asynchronous nature of fs.readdir()?
//	Maybe we can use Promise.all().
function walk (dir, done) {
	let results = [];
	fs.readdir(dir, (err, list) => {
		if (err || list.length === 0) {
			return done(err, []);
		}

		let pending = list.length;
		list.forEach((file) => {
			file = path.resolve(dir, file);
			fs.stat(file, (err, stat) => {
				if (stat && stat.isDirectory()) {
					walk(file, (err, res) => {
						results = results.concat(res);
						if (!--pending) {
							done(null, results);
						}
					});
				} else {
					results.push({filename: file, stat: stat});
					if (!--pending) {
						done(null, results);
					}
				}
			});
		});
	});
}

exports.findFile = findFile;
function findFile (arg) {
	walk(arg.path, (err, results) => {
		if (err) {
			//throw err;
			console.warn('error: path exists?');
			arg.onDone(['error: path exists?']);
			return;
		}
		//console.log(results);

		var r = undefined;

		if (arg.sortOption) {
			r = results.sort((a, b) => {
				switch ( arg.sortOption ) {
				case 'filenameLocale':
					return a.file.localeCompare(b.file);
					break;
				case 'filename':
					return a.file - b.file; // length of filename
					break;
				case 'lengthOfFilename':
					return a.file.length - b.file.length; // length of filename
					break;
				case 'atime':
					return a.stat.atime - b.stat.atime; // access time of file
					break;
				case 'mtime':
					return a.stat.mtime - b.stat.mtime; // modification time of file
					break;
					// http://www.linux-faqs.info/general/difference-between-mtime-ctime-and-atime
					// ctime: ctime is the inode or file change time. The ctime gets updated when the file attributes are changed, like changing the owner, changing the permission or moving the file to an other filesystem but will also be updated when you modify a file.
					// mtime: mtime is the file modify time. The mtime gets updated when you modify a file. Whenever you update content of a file or save a file the mtime gets updated.
					// atime: atime is the file access time. The atime gets updated when you open a file but also when a file is used for other operations like grep, sort, cat, head, tail and so on.
				case 'ctime':
					return a.stat.ctime - b.stat.ctime; // creation time of file
					break;
				case 'filesize':
					return a.stat.size - b.stat.size; // size of file
					break;
				default:
					break;
				}
			});
		} else {
			console.log('no sortOption');
		}
		//console.log(r);

		for (let i in r) {
			if ( arg.rexmatch ) {
				if ( r[i].file.match(arg.rexmatch)) {
				} else {
					//console.log("delete: ");
					//console.log(r[i]);
					delete r[i];
				}
			}

			if ( r[i] && r[i].stat && arg.ctime && arg.ctime.start && arg.ctime.end ) {
				if ( r[i].stat.ctime.getTime() >= arg.ctime.start.getTime() && r[i].stat.ctime.getTime() <= arg.ctime.end.getTime() ) {
				} else {
					//console.log("delete: ");
					//console.log(r[i]);
					delete r[i];
				}
			}

			if ( r[i] && r[i].stat && arg.mtime && arg.mtime.start && arg.mtime.end ) {
				if ( r[i].stat.mtime.getTime() >= arg.mtime.start.getTime() && r[i].stat.mtime.getTime() <= arg.mtime.end.getTime() ) {
				} else {
					//console.log("delete: ");
					//console.log(r[i]);
					delete r[i];
				}
			}
		}
		//console.log(r);

		r = cleanArray(r);
		if ( arg.reverse && arg.reverse === true) {
			r = r.reverse();
		}

		if ( arg.limit && typeof arg.limit === 'number' ) {
			let re = [];
			for (let i in r) {
				if ( i > arg.limit -1 ) {
					break;
				}
				re.push(r[i]);
			}
			r = re;
		}

		if ( arg.outputFilenameOnly && arg.outputFilenameOnly === true ) {
			let re = [];
			for (let i in r) {
				re.push(r[i].file);
			}
			r = re;
		}

		arg.onDone(r);
	});
}


// FIXME: Security issues here... RCE (Remote Command Execution)
exports.pingIPv4 = pingIPv4;
function pingIPv4 (arg) {
	switch (process.platform) {
	case 'linux':
	case 'darwin':
		var cmd = 'ping -c 3 localhost';
		exec(cmd, (error, stdout, stderr) => {
			if (error) {
				throw error;
			}
			//sys.puts(stdout);
			var x = stdout.split('\n');
			x = cleanArray(x);
			console.info(x);
		});
		break;
	case 'win32':
		throw 'not supported';

		break;
	default:
		throw 'not supported';
		break;
	}
}


//pingIPv4("google.com");

