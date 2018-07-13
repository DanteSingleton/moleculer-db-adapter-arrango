"use strict";

const Database = require('arangojs').Database;

class ArangoDbAdapter {
    constructor(config) {
        this.config = config;
    }

    init(broker, service) {
        this.broker = broker;
        this.service = service;

        // if (this.service.schema.model) {
		// 	this.model = this.service.schema.model;
		// } else if (this.service.schema.schema) {
		// 	if (!this.service.schema.modelName) {
		// 		throw new Error("`modelName` is required when `schema` is given in schema of service!");
		// 	}
		// 	this.schema = this.service.schema.schema;
		// 	this.modelName = this.service.schema.modelName;
		// }

		// if (!this.model && !this.schema) {
		// 	/* istanbul ignore next */
		// 	throw new Error("Missing `model` or `schema` definition in schema of service!");
		// }
    }

    connect() {
		return conn.then(() => {
			this.db = new Database(this.uri, this.opts);

			this.db.on("disconnected", function arangoDisconnected() {
				/* istanbul ignore next */
				this.service.logger.warn("Disconnected from ArangoDB.");
			}.bind(this));
		});
    }
}

module.exports = ArangoDbAdapter;