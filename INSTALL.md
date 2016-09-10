# Installation Guide
Step-by-step instructions to setup a Scalra system from scratch on a Ubuntu System
(you may skip steps if they're already performed on your local system)
	
## Environment

1. Install node.js LTS (4.5.0)

`sudo apt-get install node`

2. Install [MongoDB 3.2](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/)
or type						 
`sudo apt install mongodb`
 
## Setup DB Admin Password
MongoDB by default does not have an admin account, but it is better for security measures.
This also allows Scalra to create DB on the fly for you.

1. Install Mongo client
`sudo apt-get install mongodb-clients`  
					  
2. Setup MongoDB admin account 
		
to start Mongo client (by default it connects to port 27010)
`$mongo`

then type:
```
use admin
db.createUser(
  {
    user: "dbadmin",
    pwd: "dbadmin-pass",
    roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
  }
)
```

note: please change user / pwd to your preferred DB admin account and password (need to match /settings.js)


## Setup Project Repo

1. clone the project's git repo

for example:
  ```git clone https://github.com/your_org/your_project.git```

2. create local copy of settings.js

  ```cp settings.js.example settings.js```

3. install required libs

  ```npm install```

4. (optional) setup SSH keys

	If you need to run HTTPS services, make sure you've put the correct & relevant files under the /keys directory, for example:
```
	keys: {
		privatekey: __dirname + '/keys/privatekey.pem',
		certificate: __dirname + '/keys/certificate.pem'
	},	
```	
	
	or point to specific directories where the key files exist. For example:
	
```
	keys: {
		privatekey: '/etc/letsencrypt/live/privkey.pem',
		certificate: '/etc/letsencrypt/live/fullchain.pem'		
	},	
```			
	
## Start Server and Test

```npm start```

