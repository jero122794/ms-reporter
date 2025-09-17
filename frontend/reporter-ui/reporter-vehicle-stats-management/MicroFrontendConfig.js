import React from 'react';
import { Redirect } from 'react-router-dom';
import i18n from './i18n'

const auth = ["VEHICLE_STATS_READ"];

export const MicroFrontendConfig = {
    settings: {
        layout: {}
    },
    auth,
    routes: [
        { 
            path: '/vehicle-stats-mng/vehicle-statss/:vehicleStatsId/:vehicleStatsHandle?',
            component: React.lazy(() => import('./vehicle-stats/VehicleStats'))
        },
        {
            path: '/vehicle-stats-mng/vehicle-statss',
            component: React.lazy(() => import('./vehicle-statss/VehicleStatss'))
        },
        {
            path: '/vehicle-stats-mng',
            component: () => <Redirect to="/vehicle-stats-mng/vehicle-statss" />
        }
    ],
    navigationConfig: [
        {
            'id': 'settings',
            'type': 'collapse',
            'icon': 'settings',
            'priority': 100,
            children: [{
                'id': 'reporter-vehicle-stats-management',
                'type': 'item',
                'icon': 'business',
                'url': '/vehicle-stats-mng',
                'priority': 2000,
                auth
            }]
        }
    ],
    i18nLocales: i18n.locales
};

