//
//  script.js
//
//  dyanmic script loading functions
//
//	functions:
//		monitor(name, fullpath) 		// see if a script file is modified, and re-load if so
//
//

var l_name = 'SR.Script';

// record of recently modified file(s), to be reloaded by require
var l_modified_scripts = {};

// seconds to reload the file
var l_reloadTime = SR.Settings.TIMEOUT_RELOAD_SCRIPT;

// store script loading arguments
var l_args = {};

// loaded scripts
var l_loaded = exports;

// script loader, will check periodically if modified script queue is non-empty
var l_loadScript = function (fullpath, publname) {

    var curr_time = new Date();

    // store script if modified for first time
    if (fullpath !== undefined && publname !== undefined) {

        if (l_modified_scripts.hasOwnProperty(fullpath) === false) {
                            
            LOG.warn('script modified: ' + fullpath, l_name);
            l_modified_scripts[fullpath] = {
                time: new Date(curr_time.getTime() + l_reloadTime * 1000),
                name: publname
            };
        }
        // if already stored, ignore this request
        else
            return;
    }
    else {

        // check queue for scripts that can be safely reloaded
        for (var path in l_modified_scripts) {
        
            // check if wait time has expired
            if (curr_time - l_modified_scripts[path].time > 0) {

                // get public name
                var name = l_modified_scripts[path].name;
                var notify_msg = 'reloading [' + name + '] from: ' + path;
				LOG.warn(notify_msg, l_name);
				
				// send e-mail notify to project admin (only if specified)
				if (SR.Settings.NOTIFY_SCRIPT_RELOAD === true)
					UTIL.notifyAdmin('script reloading', notify_msg);

				// save current script in cache as backup
				var backup_script = require.cache[path];

                // NOTE: if 'path' is incorrect, may not delete successfully, and new script won't load
                delete require.cache[path];
				
				// NOTE: this will show false
				//LOG.warn('after delete, has path: ' + require.cache.hasOwnProperty(path), l_name);
				
                // NOTE: something can go wrong if the script is corrupt
                try {
                    // re-require
					if (l_args.hasOwnProperty(path)) {
						LOG.warn('args exist..', l_name);
						require(path)(l_args[path]);
						l_loaded[name] = require.cache[path];
					}
					else {
                    	l_loaded[name] = require(path);
						SR.Handler.add(l_loaded[name]);						
					}						
				}
                catch (e) {
					LOG.error('reload error: ', l_name);
					LOG.error(UTIL.dumpError(e), l_name);
					
					LOG.warn('restoring old script...', l_name);
					require.cache[path] = backup_script;
					l_loaded[name] = require.cache[path];
					
					// this will show 'true'
					//LOG.warn('after restore, has path: ' + require.cache.hasOwnProperty(path), l_name);         
                }

                // remove file record
                delete l_modified_scripts[path];
            }
        }
    }

    // reload myself to check later if there are scripts to be loaded
    if (Object.keys(l_modified_scripts).length > 0) {
        var timeout = l_reloadTime * 1.5 * 1000;
        LOG.sys('automatic reloading after: ' + timeout + ' ms', l_name);
        setTimeout(l_loadScript, timeout);
    }        
}

// see if a script file is modified, and re-load if so
// returns loaded module's script or undefined for failure
exports.monitor = function (name, fullpath, args) {

	//LOG.warn(name + ': ' + fullpath, l_name);
			
	// check if file exists
	if (SR.fs.existsSync(fullpath) === false) {
		LOG.error('script does not exist: ' + fullpath, l_name);
		LOG.stack();
		return undefined;
	}
		
	LOG.debug('requiring: ' + fullpath, l_name);
	// perform require, pass in optional arguments as well
	try {
		if (typeof args !== 'undefined') {
			LOG.warn('argument provided, will pass to file when performing require', l_name);
			require(fullpath)(args);
			l_loaded[name] = require.cache[fullpath];
			
			// store arguments (for later reloading)
			l_args[fullpath] = args;
		}
		else {
			l_loaded[name] = require(fullpath);
		}
	} catch (e) {
		LOG.error('load error:', l_name);
		LOG.error(e, l_name);
		LOG.error(e.stack, l_name);
		return undefined;			
	}
	
	if (l_loaded.hasOwnProperty(name))
		LOG.sys('[' + name + '] is accessible via SR.Script[\'' + name + '\']', l_name);
	else {
		LOG.error('script [' + name + '] fail to load at: ' + fullpath, l_name);
		return undefined;
	}
				     
    SR.fs.watchFile(fullpath, function (curr, prev) {

        // check if file has updated    
        if (curr.mtime !== prev.mtime) {

			// record to modified file & trigger periodic check
            l_loadScript(fullpath, name);
        }
    });
	
	LOG.sys('type of loaded script: ' + typeof l_loaded[name], l_name);
	
	return l_loaded[name];
}
