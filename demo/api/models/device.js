module.exports = {
	name: 'device',
	meta: {
		editinline: true
	},
	fields: {
		name: { 
			name: 'Name',
			type: 'string',
			desc: '',
			require: true
		},
		place: {
			'name': 'place',
			'type': 'string',
			'desc': '',
			require: true
		},
		status: {
			'name': 'status',
			'type': 'string',
			'desc': 'device status',
			require: true
		},
		model: { 
			name: 'model',
			type: 'string',
			desc: '',
			require: true
		},
		dept: {
			name: 'departmant',
			type: 'string',
			desc: '',
			require: true
		}
	}
};