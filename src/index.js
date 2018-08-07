"use strict";
const _ 			= require("lodash");
const Promise		= require("bluebird");
const Database      = require('arangojs').Database;

class ArangoDbAdapter {
    /**
	 * Creates an instance of MongoDbAdapter.
	 * @param {Object?} config
	 *
	 * @memberof ArangoDbAdapter
	 */
    constructor(config) {
        this.config = config;
    }

	/**
	 * Initialize adapter
	 *
	 * @param {ServiceBroker} broker
	 * @param {Service} service
	 *
	 * @memberof ArangoDbAdapter
	 */
    init(broker, service) {
        this.broker = broker;
        this.service = service;
    }

    /**
	 * Connect to database
	 *
	 * @returns {Promise}
	 *
	 * @memberof ArangoDbAdapter
	 */
    async connect() {

        //This needs some work.
        this.db = new Database(this.config);
        this.db.useDatabase(this.config.db);
        this.collection = this.db.collection(this.service.schema.name);
        this.collectionName = this.service.schema.name;
        await this.db.login(this.config.username, this.config.password);
        
        return this.collection.exists();

    }

    /**
	 * Disconnect from database
	 *
	 * @returns {Promise}
	 *
	 * @memberof ArangoDbAdapter
	 */
	disconnect() {
		if (this.db) {
			this.db.close();
		}
		return Promise.resolve();
    }
    
	/**
	 * Find all entities by filters.
	 *
	 * Available filter props:
	 * 	- limit
	 *  - offset
	 *  - sort
	 *  - search
	 *  - searchFields
	 *  - query
	 *
	 * @param {any} filters
	 * @returns {Promise}
	 *
	 * @memberof ArangoDbAdapter
	 */
	find(filters) {
		return this.createCursor(filters);
    }
    	/**
	 * Find an entity by query
	 *
	 * @param {Object} query
	 * @returns {Promise}
	 * @memberof MemoryDbAdapter
	 */
	findOne(query) {
		return this.db.query(query);
	}

	/**
	 * Find an entities by ID
	 *
	 * @param {any} _id
	 * @returns {Promise}
	 *
	 * @memberof SequelizeDbAdapter
	 */
	findById(_id) {
        return this.db.query(`
            FOR x in ${this.collectionName}
            FILTER x._id == "${_id}"
        `);
	}

	/**
	 * Find any entities by IDs
	 *
	 * @param {Array} idList
	 * @returns {Promise}
	 *
	 * @memberof SequelizeDbAdapter
	 */
	findByIds(idList) {
        return this.db.query(`
        FOR x in ${this.collectionName}
        FILTER x._id == "_id"
    `);
        
        this.model.findAll({
			where: {
				id:  idList
			}
		});
	}
    count(filters = {}){
        return this.createCursor(filters, true);
    }
    /**
	 * Insert an entity
	 *
	 * @param {Object} entity
	 * @returns {Promise<Array>}
	 *
	 * @memberof ArangoDbAdapter
	 */
	async insert(entity) {
        
        let data =  await this.db.query(`
            INSERT ${JSON.stringify(entity)} INTO ${this.collectionName}
            RETURN NEW
        `);
        console.log('USER CREATED: ' + JSON.stringify(data._result));
        return data._result[0];
    }
    async update(data) {
        console.log("Entered Update: " + JSON.stringify(data));
        if (data._id){
            let _id = data._id
            delete data._id;
            console.log("Returning update by id");
            return this.updateById(_id, data);
        }
    }
    /**
	 * Update an entity by ID and `update`
	 *
	 * @param {String} _id - ObjectID as hexadecimal string.
	 * @param {Object} update
	 * @returns {Promise<Object>} Return with the updated document.
	 *
	 * @memberof ArangoDbAdapter
	 */
	async updateById(_id, update) {
        console.log(update);
        let q = `
        LET x = DOCUMENT("${_id}")
        UPDATE x WITH ${JSON.stringify(update.$set)} IN ${this.collectionName}
        RETURN NEW
        `;
        console.log(q);
        
        let data =  await this.db.query(q);
        console.log('USER UPDATED: ' + JSON.stringify(data._result));
        return data._result[0];
    }
    
    /**
	 * Create a filtered cursor.
	 *
	 * Available filters in `params`:
	 * 	- sort
	 * 	- limit
	 * 	- offset
	 *  - query
	 *
 	 * @param {Object} params
 	 * @param {Boolean} isCounting
	 * @returns {ArangoCursor}
	 */
    async createCursor(params, isCounting) {
        console.log("Params: " + JSON.stringify(params));
        let q;
        if (params && params != {}) {
			
			if (isCounting){
                q = await this.db.query(`
                    FOR x IN ${this.collectionName}
                    RETURN x
                `).length;

            } else{

                let filters = [];
                if(params.query){
                    let keys = Object.keys(params.query);
                    let values = Object.values(params.query);

                    for(let i = 0; i < keys.length; i++) {
						// Added Support for $or
						if(keys[i].toLocaleLowerCase() == "$or") {
							console.log("Or was found")
							let data = values[0];
							let tmp = [];
							for(let j = 0; j < data.length; j++) {
								tmp.push(` x.${Object.keys(data[i])[0]} == "${Object.values(data[i])[0]}"`);
							}					
							filters.push(`FILTER ${tmp.join(' || ')}`);
						} else  {
						filters.push(`FILTER x.${keys[i]} == "${values[i]}"`);
						}
                    }
                    filters = filters.join('\n');
                    console.log(filters);
                    
                }
                q = await this.db.query(`
                    FOR x IN ${this.collectionName}
                    ${filters}
                    RETURN x
                `);
                q = q._result;
                console.log(q);
                
            }
            // // Sort
            // if (params.sort && q.sort) {
            //     let sort = this.transformSort(params.sort);
            //     if (sort)
            //         q.sort(sort);
            // }

			// // Offset
			// if (_.isNumber(params.offset) && params.offset > 0)
			// 	q.skip(params.offset);

			// // Limit
			// if (_.isNumber(params.limit) && params.limit > 0)
			// 	q.limit(params.limit);

			return q;
		}

		// If not params
		if (isCounting)
			return await this.db.query(`
                FOR x IN ${this.collectionName}
                RETURN x
            `);   
		else
			return this.collection.find({});
    }

	/**
	 * Convert DB entity to JSON object. It converts the `_id` to hexadecimal `String`.
	 *
	 * @param {Object} entity
	 * @returns {Object}
	 * @memberof ArangoDbAdapter
	 */
	entityToObject(entity) {
		let json = Object.assign({}, entity);
		// if (entity._id)
		// 	json._id = entity._id.toHexString();
		return json;
	}
}

module.exports = ArangoDbAdapter;