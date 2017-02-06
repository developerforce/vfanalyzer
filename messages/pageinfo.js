var debug = require('../util/debug');

module.exports = {

	init : function(info) {


		return info;

	},

	create : function() {

		return {
		  		controller_type:"standard|list|custom",
		  		controller:"object|class",
		  		extensions:[],
		  		style_resources:[],
		  		script_resources:[],
		  		style_blocks:[],
		  		script_blocks:[],
		  		data_table_headers:[],
		  		data_table_bindings:[],
		  		ui_inputs:[],
					markup: "",
		  		viewstate:false
		  	}

	}

}
