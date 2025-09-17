import { defer } from 'rxjs';
import { mergeMap, map } from 'rxjs/operators';

import graphqlService from '../../../../services/graphqlService';
import { ReporterVehicleStatsListing, ReporterDeleteVehicleStats } from '../../gql/VehicleStats';

export const SET_VEHICLE_STATSS = '[VEHICLE_STATS_MNG] SET VEHICLE_STATSS';
export const SET_VEHICLE_STATSS_PAGE = '[VEHICLE_STATS_MNG] SET VEHICLE_STATSS PAGE';
export const SET_VEHICLE_STATSS_ROWS_PER_PAGE = '[VEHICLE_STATS_MNG] SET VEHICLE_STATSS ROWS PER PAGE';
export const SET_VEHICLE_STATSS_ORDER = '[VEHICLE_STATS_MNG] SET VEHICLE_STATSS ORDER';
export const SET_VEHICLE_STATSS_FILTERS_ORGANIZATION_ID = '[VEHICLE_STATS_MNG] SET VEHICLE_STATSS FILTERS ORGANIZATION_ID';
export const SET_VEHICLE_STATSS_FILTERS_NAME = '[VEHICLE_STATS_MNG] SET VEHICLE_STATSS FILTERS NAME';
export const SET_VEHICLE_STATSS_FILTERS_ACTIVE = '[VEHICLE_STATS_MNG] SET VEHICLE_STATSS FILTERS ACTIVE';

/**
 * Common function to generate the arguments for the ReporterVehicleStatsListing query based on the user input
 * @param {Object} queryParams 
 */
function getListingQueryArguments({ filters: { name, organizationId, active }, order, page, rowsPerPage }) {
    const args = {
        "filterInput": { organizationId },
        "paginationInput": { "page": page, "count": rowsPerPage, "queryTotalResultCount": (page === 0) },
        "sortInput": order.id ? { "field": order.id, "asc": order.direction === "asc" } : undefined
    };
    if (name.trim().length > 0) {
        args.filterInput.name = name;
    }
    if (active !== null) {
        args.filterInput.active = active;
    }
    return args;
}

/**
 * Queries the VehicleStats Listing based on selected filters, page and order
 * @param {{ filters, order, page, rowsPerPage }} queryParams
 */
export function getVehicleStatss({ filters, order, page, rowsPerPage }) {
    const args = getListingQueryArguments({ filters, order, page, rowsPerPage });    
    return (dispatch) => graphqlService.client.query(ReporterVehicleStatsListing(args)).then(result => {
        return dispatch({
            type: SET_VEHICLE_STATSS,
            payload: result.data.ReporterVehicleStatsListing
        });
    })
}

/**
 * Executes the mutation to remove the selected rows
 * @param {*} selectedForRemovalIds 
 * @param {*} param1 
 */
export function removeVehicleStatss(selectedForRemovalIds, { filters, order, page, rowsPerPage }) {
    const deleteArgs = { ids: selectedForRemovalIds };
    const listingArgs = getListingQueryArguments({ filters, order, page, rowsPerPage });
    return (dispatch) => defer(() => graphqlService.client.mutate(ReporterDeleteVehicleStats(deleteArgs))).pipe(
        mergeMap(() => defer(() => graphqlService.client.query(ReporterVehicleStatsListing(listingArgs)))),
        map((result) =>
            dispatch({
                type: SET_VEHICLE_STATSS,
                payload: result.data.ReporterVehicleStatsListing
            })
        )
    ).toPromise();
}

/**
 * Set the listing page
 * @param {int} page 
 */
export function setVehicleStatssPage(page) {
    return {
        type: SET_VEHICLE_STATSS_PAGE,
        page
    }
}

/**
 * Set the number of rows to see per page
 * @param {*} rowsPerPage 
 */
export function setVehicleStatssRowsPerPage(rowsPerPage) {
    return {
        type: SET_VEHICLE_STATSS_ROWS_PER_PAGE,
        rowsPerPage
    }
}

/**
 * Set the table-column order
 * @param {*} order 
 */
export function setVehicleStatssOrder(order) {
    return {
        type: SET_VEHICLE_STATSS_ORDER,
        order
    }
}

/**
 * Set the name filter
 * @param {string} name 
 */
export function setVehicleStatssFilterName(name) {    
    return {
        type: SET_VEHICLE_STATSS_FILTERS_NAME,
        name
    }
}

/**
 * Set the filter active flag on/off/both
 * @param {boolean} active 
 */
export function setVehicleStatssFilterActive(active) {
    return {
        type: SET_VEHICLE_STATSS_FILTERS_ACTIVE,
        active
    }
}

/**
 * set the organizationId filter
 * @param {string} organizationId 
 */
export function setVehicleStatssFilterOrganizationId(organizationId) {    
    return {
        type: SET_VEHICLE_STATSS_FILTERS_ORGANIZATION_ID,
        organizationId
    }
}



