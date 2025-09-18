'use strict'

const { iif } = require("rxjs");
const { tap } = require('rxjs/operators');
const { ConsoleLogger } = require('@nebulae/backend-node-tools').log;

const VehicleStatsDA = require("./data-access/VehicleStatsDA");
/**
 * Singleton instance
 * @type { VehicleStatsES }
 */
let instance;

class VehicleStatsES {

    constructor() {
    }

    generateEventProcessorMap() {
        return {
            'VehicleStats': {
                "VehicleStatsModified": { fn: instance.handleVehicleStatsModified$, instance, processOnlyOnSync: true },
            }
        }
    };

    /**
     * 
     * 
     * @param {*} VehicleStatsModifiedEvent VehicleStats Modified Event
     */
    handleVehicleStatsModified$({ etv, aid, av, data, user, timestamp }) {
        const aggregateDataMapper = [
            /*etv=0 mapper*/ () => { throw new Error('etv 0 is not an option') },
            /*etv=1 mapper*/ (eventData) => { return { ...eventData, modType: undefined }; }
        ];
        delete aggregateDataMapper.modType;
        const aggregateData = aggregateDataMapper[etv](data);
        return iif(
            () => (data.modType === 'DELETE'),
            VehicleStatsDA.deleteVehicleStats$(aid),
            VehicleStatsDA.updateVehicleStatsFromRecovery$(aid, aggregateData, av)
        ).pipe(
            tap(() => ConsoleLogger.i(`VehicleStatsES.handleVehicleStatsModified: ${data.modType}: aid=${aid}, timestamp=${timestamp}`))
        )
    }
}


/**
 * @returns {VehicleStatsES}
 */
module.exports = () => {
    if (!instance) {
        instance = new VehicleStatsES();
        ConsoleLogger.i(`${instance.constructor.name} Singleton created`);
    }
    return instance;
};
