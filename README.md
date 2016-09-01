# scalra
(Scalable Cooperative Adaptive Library for Real-time API)


  [node](http://nodejs.org) framework to prototype and scale API servers rapidly.

```js
require('scalra')('curr');

SR.API.add('HelloWorld', {
	name: 'string'
}, function (args, onDone) {
	LOG.warn('HelloWorld called with: ' + args);	
	onDone(null, {hello: args.name});
});

```

## Installation

```bash
$ npm install scalra
```

## Features

  * Write one API logic for any connection types (HTTP/HTTPS/websocket/socket)
  * Logic can be called in the same style both in client and server
  * Shared session data between HTTP and WebSocket requests
  * publish / subscribe (pub/sub) as messaging layer
  * Auto-reload of modified logic scripts
  * works out-of-box with [MongoDB](https://www.mongodb.com) and [Express](https://expressjs.com)
  

## Docs & Community

  * [Website and Documentation](https://github.com/imonology/scalra) - [[website repo](https://github.com/imonology/scalra)]


## Quick Start

  Simply copy the demo project under /demo as your own project

```bash
$ npm install scalra
```

  Create the app:

```bash
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

## Philosophy

  Scalra is designed to allow server developers to focus on logic development instead 
  of networking or server management issues. Once developed using the Scalra framework,
  the server's reliability, security, and scalability is automatically covered without
  having to worry about re-writing code when the service is under heavy workload. 																						   
																						   
  Additional functionalities can be added with Scalra modules that are pluggable. 
																						   

## People

Scalra is created by the team at [Imonology Inc.] (http://www.imonology.com/) [[github] (https://github.com/imonology)] 																						   

## License

  [AGPL-3.0](LICENSE)

