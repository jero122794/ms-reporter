"use strict";

const { empty, Observable } = require("rxjs");

const VehicleStatsCRUD = require("./VehicleStatsCRUD")();
const VehicleStatsES = require("./VehicleStatsES")();
const DataAcess = require("./data-access/");

module.exports = {
  /**
   * domain start workflow
   */
  start$: DataAcess.start$,
  /**
   * start for syncing workflow
   * @returns {Observable}
   */
  startForSyncing$: DataAcess.start$,
  /**
   * start for getting ready workflow
   * @returns {Observable}
   */
  startForGettingReady$: empty(),
  /**
   * Stop workflow
   * @returns {Observable}
   */
  stop$: DataAcess.stop$,
  /**
   * @returns {VehicleStatsCRUD}
   */
  VehicleStatsCRUD: VehicleStatsCRUD,
  /**
   * CRUD request processors Map
   */
  cqrsRequestProcessorMap: VehicleStatsCRUD.generateRequestProcessorMap(),
  /**
   * @returns {VehicleStatsES}
   */
  VehicleStatsES,
  /**
   * EventSoircing event processors Map
   */
  eventSourcingProcessorMap: VehicleStatsES.generateEventProcessorMap(),
};
