(master) [![Build Status - master](https://travis-ci.org/imonology/scalra.svg?branch=master)](https://travis-ci.org/imonology/scalra) [![Build Status - dev](https://travis-ci.org/imonology/scalra.svg?branch=dev)](https://travis-ci.org/imonology/scalra) (dev)

# Scalra

  [node](http://nodejs.org) framework to prototype and scale API servers rapidly.

```js
require('scalra')('curr');

SR.API.add('HelloWorld', {
	name: 'string'
}, function (args, onDone) {
	LOG.warn('HelloWorld called with: ' + args);	
	onDone(null, {hello: args.name});
});

var l_frontier = new SR.Frontier(37070);
l_frontier.init();
```

Then called at server:

```js
SR.API.HelloWorld({name: 'John'}, function (err, result) {
	LOG.debug('positive test result: ');
	if (err) {
		return LOG.error(err);
	}
	LOG.warn(result);
});
```

Or at clients:

```html
<html><head>
<script type="text/javascript" src="/lib/scalra.js"></script>
<script>

var onConnect = function () {

	SR.API.HelloWorld({name: 'world'}, function (err, result) {
		if (err) {
			return alert(err);
		}
		document.write('Hello: ' + result.hello);
		console.log(result);
	}); 
}

</script>
</head></html>
```

Or request from URL:

```
http://127.0.0.1:37070/event/HelloWorld?name=world
```


## Installation

```bash
$ npm install scalra
```

see [Installation Guide](INSTALL.md) for full instructions to setup a Scalra system on empty systems.
		  
## Features

  * Write one API logic for any connection types (HTTP/HTTPS/websocket/socket)
  * Logic is called in the same style at both client and server
  * Shared sessions between HTTP and WebSocket requests
  * Publish / subscribe (pub/sub) as messaging layer
  * Auto-reload of modified logic scripts
  * Works out-of-box with [MongoDB](https://www.mongodb.com) and [Express](https://expressjs.com)
  

## Docs & Community

  * [Website and Documentation](https://github.com/imonology/scalra) - [[website repo](https://github.com/imonology/scalra)]


## Quick Start

  Simply copy the demo project under /demo as your own project

```bash
$ npm install scalra
$ cp -R node_modules/scalra/demo /tmp/foo && cd /tmp/foo
```

  Install dependencies:

```bash
$ npm install scalra
```
				
  Start the server:

```bash
$ npm start
```

  Verify server is up with:
						
```
http://127.0.0.1:37070/event/HelloWorld?name=world
```

									
## Philosophy

  Scalra is designed to allow server developers to focus on logic development instead 
  of networking or server management issues. Once developed using the Scalra framework,
  the server's reliability, security, and scalability is automatically covered without
  having to worry about re-writing code when the service is under heavy workload. 																						   
																						   
  Additional functionalities can be added with pluggable Scalra modules. 
																						   

## People

Scalra is created by [Imonology Inc.](http://www.imonology.com/) [[github](https://github.com/imonology)] 																						   

## License

  [AGPL-3.0](LICENSE)

