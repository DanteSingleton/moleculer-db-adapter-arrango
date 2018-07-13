"use strict";

const Database = require('arangojs').Database;

class ArangoDbAdapter {
    constructor(uri, opts) {
        this.uri = uri;
        this.opts = opts;
    }

    init(broker, service) {
        this.broker = broker;
        this.service = service;

        if (this.service.schema.model) {
			this.model = this.service.schema.model;
		} else if (this.service.schema.schema) {
			if (!this.service.schema.modelName) {
				throw new Error("`modelName` is required when `schema` is given in schema of service!");
			}
			this.schema = this.service.schema.schema;
			this.modelName = this.service.schema.modelName;
		}

		if (!this.model && !this.schema) {
			/* istanbul ignore next */
			throw new Error("Missing `model` or `schema` definition in schema of service!");
		}
    }

    connect() {
        let conn;

		if (this.model) {
			/* istanbul ignore next */
			if (mongoose.connection.readyState != 0) {
				this.db = mongoose.connection;
				return Promise.resolve();
			}

			conn = new Database(this.uri, this.opts);
		} else if (this.schema) {
			conn = mongoose.createConnection(this.uri, this.opts);
			this.model = conn.model(this.modelName, this.schema);
		}

		return conn.then(result => {
			this.db = result.connection || result.db;

			this.db.on("disconnected", function mongoDisconnected() {
				/* istanbul ignore next */
				this.service.logger.warn("Disconnected from MongoDB.");
			}.bind(this));
		});
    }
}

module.exports = ArangoDbAdapter;