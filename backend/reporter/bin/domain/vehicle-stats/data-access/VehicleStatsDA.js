"use strict";

let mongoDB = undefined;
const { map, mapTo } = require("rxjs/operators");
const { of, Observable, defer } = require("rxjs");

const { CustomError } = require("@nebulae/backend-node-tools").error;

const CollectionName = 'VehicleStats';

class VehicleStatsDA {
  static start$(mongoDbInstance) {
    return Observable.create(observer => {
      if (mongoDbInstance) {
        mongoDB = mongoDbInstance;
        observer.next(`${this.name} using given mongo instance`);
      } else {
        mongoDB = require("../../../tools/mongo-db/MongoDB").singleton();
        observer.next(`${this.name} using singleton system-wide mongo instance`);
      }
      observer.next(`${this.name} started`);
      observer.complete();
    });
  }


  static getVehicleStats$(id, organizationId) {
    const collection = mongoDB.db.collection(CollectionName);

    const query = {
      _id: id, organizationId
    };
    return defer(() => collection.findOne(query)).pipe(
      map((res) => {
        return res !== null
          ? { ...res, id: res._id }
          : {}
      })
    );
  }

  static generateListingQuery(filter) {
    const query = {};
    if (filter.name) {
      query["name"] = { $regex: filter.name, $options: "i" };
    }
    if (filter.organizationId) {
      query["organizationId"] = filter.organizationId;
    }
    if (filter.active !== undefined) {
      query["active"] = filter.active;
    }
    return query;
  }

  static getVehicleStatsList$(filter = {}, pagination = {}, sortInput) {
    const collection = mongoDB.db.collection(CollectionName);
    const { page = 0, count = 10 } = pagination;

    const query = this.generateListingQuery(filter);    
    const projection = { name: 1, active: 1 };

    let cursor = collection
      .find(query, { projection })
      .skip(count * page)
      .limit(count);

    const sort = {};
    if (sortInput) {
      sort[sortInput.field] = sortInput.asc ? 1 : -1;
    } else {
      sort["metadata.createdAt"] = -1;
    }
    cursor = cursor.sort(sort);


    return mongoDB.extractAllFromMongoCursor$(cursor).pipe(
      map(res => ({ ...res, id: res._id }))
    );
  }

  static getVehicleStatsSize$(filter = {}) {
    const collection = mongoDB.db.collection(CollectionName);
    const query = this.generateListingQuery(filter);    
    return defer(() => collection.countDocuments(query));
  }

  /**
  *
  * @param {*} id VehicleStats ID
  * @param {*} VehicleStats properties
  */
  static createVehicleStats$(_id, properties, createdBy) {

    const metadata = { createdBy, createdAt: Date.now(), updatedBy: createdBy, updatedAt: Date.now() };
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() => collection.insertOne({
      _id,
      ...properties,
      metadata,
    })).pipe(
      map(({ insertedId }) => ({ id: insertedId, ...properties, metadata }))
    );
  }

  /**
  *
  * @param {String} id  VehicleStats ID
  * @param {*} VehicleStats properties to update
  */
  static updateVehicleStats$(_id, properties, updatedBy) {
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() =>
      collection.findOneAndUpdate(
        { _id },
        {
          $set: {
            ...properties,
            "metadata.updatedBy": updatedBy, "metadata.updatedAt": Date.now()
          }
        },
        {
          returnOriginal: false,
        }
      )
    ).pipe(
      map(result => result && result.value ? { ...result.value, id: result.value._id } : undefined)
    );
  }

  /**
  * 
  * @param {String} id  VehicleStats ID
  * @param {*} VehicleStats properties to update
  */
  static updateVehicleStatsFromRecovery$(_id, properties, av) {
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() =>
      collection.updateOne(
        {
          _id,
        },
        { $set: { ...properties } },
        {
          returnOriginal: false,
          upsert: true
        }
      )
    ).pipe(
      map(result => result && result.value ? { ...result.value, id: result.value._id } : undefined)
    );
  }

  /**
  * 
  * @param {String} id  VehicleStats ID
  * @param {*} VehicleStats properties to update
  */
  static replaceVehicleStats$(_id, properties) {
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() =>
      collection.replaceOne(
        { _id },
        properties,
      )
    ).pipe(
      mapTo({ id: _id, ...properties })
    );
  }

  /**
    * 
    * @param {*} _id  VehicleStats ID
  */
  static deleteVehicleStats$(_id) {
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() =>
      collection.deleteOne({ _id })
    );
  }

  /**
    * 
    * @param {*} _ids  VehicleStats IDs array
  */
  static deleteVehicleStatss$(_ids) {
    const collection = mongoDB.db.collection(CollectionName);
    return defer(() =>
      collection.deleteMany({ _id: { $in: _ids } })
    ).pipe(
      map(({ deletedCount }) => deletedCount > 0)
    );
  }
// ===== FLEET STATISTICS METHODS =====

  /**
   * 
   * @param {Array} aids - Array of aids to check
   * @returns {Observable} Observable with array of processed aids
   */
  static getProcessedAids$(aids) {
    const collection = mongoDB.db.collection('processed_vehicles');
    return defer(() => collection.find(
      { aid: { $in: aids } },
      { projection: { aid: 1, _id: 0 } }
    ).toArray())
      .pipe(
        map(results => results.map(r => r.aid))
      );
  }

  /**
   * 
   * @param {Array} aids - Array of aids to insert
   * @returns {Observable} Observable with result
   */
  static insertProcessedAids$(aids) {
    const collection = mongoDB.db.collection('processed_vehicles');
    const documents = aids.map(aid => ({ aid, processedAt: new Date() }));

    return defer(() => collection.insertMany(documents))
      .pipe(
        map(result => result.insertedCount)
      );
  }

  /**
   * 
   * @param {Object} batchStats - Statistics from the batch
   * @returns {Observable} Observable with updated statistics
   */
  static updateFleetStatistics$(batchStats) {
    const collection = mongoDB.db.collection('fleet_statistics');
    const update = {
      $inc: {
        totalVehicles: batchStats.totalVehicles
      },
      $set: {
        lastUpdated: new Date().toISOString()
      }
    };

   
    Object.keys(batchStats.vehiclesByType).forEach(type => {
      update.$inc[`vehiclesByType.${type}`] = batchStats.vehiclesByType[type];
    });

  
    Object.keys(batchStats.vehiclesByDecade).forEach(decade => {
      update.$inc[`vehiclesByDecade.${decade}`] = batchStats.vehiclesByDecade[decade];
    });

  
    Object.keys(batchStats.vehiclesBySpeedClass).forEach(speedClass => {
      update.$inc[`vehiclesBySpeedClass.${speedClass}`] = batchStats.vehiclesBySpeedClass[speedClass];
    });

  
    update.$inc['hpStats.sum'] = batchStats.hpStats.sum;
    update.$inc['hpStats.count'] = batchStats.hpStats.count;

  
    if (batchStats.hpStats.min !== Infinity) {
      update.$min = { 'hpStats.min': batchStats.hpStats.min };
    }
    if (batchStats.hpStats.max !== -Infinity) {
      update.$max = { 'hpStats.max': batchStats.hpStats.max };
    }

    return defer(() => collection.findOneAndUpdate(
      { _id: 'real_time_fleet_stats' },
      update,
      { 
        returnOriginal: false,
        upsert: true
      }
    ))
      .pipe(
        map(result => {
          const stats = result.value;
          
          if (stats.hpStats && stats.hpStats.count > 0) {
            stats.hpStats.avg = stats.hpStats.sum / stats.hpStats.count;
          }
          
        
          if (stats.vehiclesByDecade) {
            const mappedDecades = {};
            Object.keys(stats.vehiclesByDecade).forEach(decade => {
              const mappedKey = `decade${decade}`;
              mappedDecades[mappedKey] = stats.vehiclesByDecade[decade];
            });
            stats.vehiclesByDecade = mappedDecades;
          }
          
          return stats;
        })
      );
  }

  /**
   *
   * @returns {Observable} Observable with fleet statistics
   */
  static getFleetStatistics$() {
    const collection = mongoDB.db.collection('fleet_statistics');
    
    return defer(() => collection.findOne({ _id: 'real_time_fleet_stats' }))
      .pipe(
        map(stats => {
          if (!stats) {
            return {
              _id: 'real_time_fleet_stats',
              totalVehicles: 0,
              vehiclesByType: {},
              vehiclesByDecade: {},
              vehiclesBySpeedClass: {},
              hpStats: { min: 0, max: 0, sum: 0, count: 0, avg: 0 },
              lastUpdated: new Date().toISOString()
            };
          }
          
        
          if (stats.hpStats && stats.hpStats.count > 0 && !stats.hpStats.avg) {
            stats.hpStats.avg = stats.hpStats.sum / stats.hpStats.count;
          }
          
         
          if (stats.vehiclesByDecade) {
            const mappedDecades = {};
            Object.keys(stats.vehiclesByDecade).forEach(decade => {
              const mappedKey = `decade${decade}`;
              mappedDecades[mappedKey] = stats.vehiclesByDecade[decade];
            });
            stats.vehiclesByDecade = mappedDecades;
          }
          
          return stats;
        })
      );
  }

  /**
   * 
   * @returns {Observable} Observable with result
   */
  static createFleetStatisticsIndexes$() {
    const processedVehiclesCollection = mongoDB.db.collection('processed_vehicles');
    const fleetStatisticsCollection = mongoDB.db.collection('fleet_statistics');
    
    const indexes = [
      processedVehiclesCollection.createIndex({ aid: 1 }, { unique: true }),
      fleetStatisticsCollection.createIndex({ _id: 1 })
    ];

    return defer(() => Promise.all(indexes))
      .pipe(
        map(results => results.length)
      );
  }
}
/**
 * @returns {VehicleStatsDA}
 */
module.exports = VehicleStatsDA;
