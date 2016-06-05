SR.Callback.onStart(function () {
	
	SR.ORM.init({
		username:	'BusSchedule',
		password:	'1234567',
		DB:			'BusSchedule',
		names: {
			person: {
				attributes: {
					name      : String,
					surname   : String,
					age       : Number, // FLOAT
					male      : Boolean,
					continent : [ "Europe", "America", "Asia", "Africa", "Australia", "Antartica" ], // ENUM type
					photo     : Buffer, // BLOB/BINARY
					data      : Object // JSON encoded
				},
				methods: {
					fullName: function () {
						return this.name + ' ' + this.surname;
					}
				},
				validations: {
					age: {lower: 18, upper: undefined, msg: 'under-age'}
				}			
			}
		}
	}, function (err) {
		if (err)
			throw err;
		LOG.warn('ORM DB init success');
		
		// add a row to the person table
		SR.ORM.create({
			name: 'person',
			data: { id: 1, name: "John", surname: "Doe", age: 27 }
		}, function (err) {
			if (err)
				throw err;
			LOG.warn('add new entry to [person] success');
			
			// try to modify it
			SR.ORM.read({
				name: 'person',
				query: {name: 'John'}
			}, function (err, result) {
				if (err)
					throw err;
	
				console.log("People found: %d", result.length);
				console.log("First person: %s, age %d", result[0].fullName(), result[0].age);			
		
				// update value directly
				result[1].age = 4;
				result[1].save(function (err) {
					if (err)
						return LOG.error(err);
					LOG.warn('update age to 4 success!');
				});
				
				// update value via API
				SR.ORM.update({
					name: 'person',
					query: {name: 'John'},
					data: {
						age: 25
					}
				}, function (err) {
					if (err)
						return LOG.warn(err);
					
					LOG.warn('ORM update age to 25 success');
				});
				
			});
		});		
	});	
});
