// allow access to swagger-ui from /lib
// ref: http://stackoverflow.com/questions/13786160/copy-folder-recursively-in-node-js
const fs = require('node-fs-extra');
fs.stat('lib/swagger-ui', function (err) {
	if (err) {
		console.log('copying swagger-ui to /lib...');
		fs.copy('node_modules/swagger-ui/dist', 'lib/swagger-ui', function (err) {
			if (err) {
				console.error(err);
			} else {
				
				// use minifier version
				
				console.log("swagger-ui ready!");
			}
		}); //copies directory, even if it has subdirectories or files		
	}
});

