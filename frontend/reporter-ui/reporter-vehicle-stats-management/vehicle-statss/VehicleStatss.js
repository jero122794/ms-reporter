import React, {useRef, useEffect, useState} from 'react';
import {FusePageCarded, FuseLoading} from '@fuse';
import { useSelector } from 'react-redux';
import withReducer from 'app/store/withReducer';
import { useQuery, useSubscription } from '@apollo/react-hooks';
import { 
    Card, 
    CardContent, 
    Typography, 
    Grid, 
    Box,
    Chip,
    LinearProgress,
    Divider
} from '@material-ui/core';
import { GetFleetStatistics, FleetStatisticsUpdated } from '../gql/FleetStatistics';
import reducer from '../store/reducers';

// Simple chart components (using basic HTML/CSS since we don't have chart libraries)
const SimpleBarChart = ({ data, title, color = '#1976d2' }) => {
    const maxValue = Math.max(...Object.values(data));
    
    return (
        <Card style={{ height: '100%', margin: '12px 0' }}>
            <CardContent style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom>{title}</Typography>
                {Object.entries(data).map(([key, value]) => (
                    <Box key={key} mb={1}>
                        <Box display="flex" justifyContent="space-between" mb={0.5}>
                            <Typography variant="body2">{key}</Typography>
                            <Typography variant="body2" fontWeight="bold">{value}</Typography>
                        </Box>
                        <LinearProgress 
                            variant="determinate" 
                            value={(value / maxValue) * 100} 
                            style={{ backgroundColor: '#e0e0e0', height: 8, borderRadius: 4 }}
                        />
                    </Box>
                ))}
            </CardContent>
        </Card>
    );
};

const SimpleDonutChart = ({ data, title, colors = ['#1976d2', '#388e3c', '#f57c00'] }) => {
    const total = Object.values(data).reduce((sum, value) => sum + value, 0);
    const entries = Object.entries(data);
    
    return (
        <Card style={{ height: '100%', margin: '12px 0' }}>
            <CardContent style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom align="center">{title}</Typography>
                <Box display="flex" flexDirection="column" alignItems="center">
                    <Box 
                        width={120} 
                        height={120} 
                        borderRadius="50%" 
                        border="8px solid #e0e0e0"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        mb={2}
                        style={{
                            background: `conic-gradient(${entries.map(([key, value], index) => 
                                `${colors[index % colors.length]} 0 ${(value / total) * 360}deg`
                            ).join(', ')})`
                        }}
                    >
                        <Typography variant="h4" fontWeight="bold">{total}</Typography>
                    </Box>
                    <Box>
                        {entries.map(([key, value], index) => (
                            <Box key={key} display="flex" alignItems="center" mb={0.5}>
                                <Box 
                                    width={12} 
                                    height={12} 
                                    borderRadius="50%" 
                                    bgcolor={colors[index % colors.length]}
                                    mr={1}
                                />
                                <Typography variant="body2">{key}: {value}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

const HpStatsCard = ({ hpStats }) => (
    <Card style={{ height: '100%', margin: '12px 0' }}>
        <CardContent style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>Estadísticas de HP</Typography>
            <Grid container spacing={2}>
                <Grid item xs={6}>
                    <Box textAlign="center">
                        <Typography variant="h4" color="primary" fontWeight="bold">
                            {hpStats && hpStats.avg ? hpStats.avg.toFixed(1) : 0}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">Average HP</Typography>
                    </Box>
                </Grid>
                <Grid item xs={6}>
                    <Box textAlign="center">
                        <Typography variant="h4" color="secondary" fontWeight="bold">
                            {hpStats && hpStats.max ? hpStats.max : 0}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">Max HP</Typography>
                    </Box>
                </Grid>
                <Grid item xs={6}>
                    <Box textAlign="center">
                        <Typography variant="h4" color="textPrimary" fontWeight="bold">
                            {hpStats && hpStats.min ? hpStats.min : 0}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">Min HP</Typography>
                    </Box>
                </Grid>
                <Grid item xs={6}>
                    <Box textAlign="center">
                        <Typography variant="h4" color="textPrimary" fontWeight="bold">
                            {hpStats && hpStats.count ? hpStats.count : 0}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">Total Count</Typography>
                    </Box>
                </Grid>
            </Grid>
        </CardContent>
    </Card>
);

const SpeedClassCard = ({ speedClass }) => {
    const getSpeedClassColor = (speedClass) => {
        switch (speedClass) {
            case 'Lento': return '#f44336';
            case 'Normal': return '#ff9800';
            case 'Rapido': return '#4caf50';
            default: return '#9e9e9e';
        }
    };

    return (
        <Card style={{ height: '100%', margin: '12px 0' }}>
            <CardContent style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom>Clasificación de Velocidad</Typography>
                <Box>
                    {Object.entries(speedClass || {}).map(([key, value]) => (
                        <Box key={key} display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Chip 
                                label={key} 
                                style={{ 
                                    backgroundColor: getSpeedClassColor(key),
                                    color: 'white',
                                    fontWeight: 'bold'
                                }}
                            />
                            <Typography variant="h6" fontWeight="bold">{value}</Typography>
                        </Box>
                    ))}
                </Box>
            </CardContent>
        </Card>
    );
};

function VehicleStatss()
{
    const user = useSelector(({ auth }) => auth.user);
    const pageLayout = useRef(null);
    const [fleetStats, setFleetStats] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);

    // Initial data load
    const { data: initialData, loading: initialLoading, error: initialError } = useQuery(GetFleetStatistics().query, {
        fetchPolicy: 'network-only'
    });

    // Real-time subscription
    const { data: subscriptionData, loading: subscriptionLoading } = useSubscription(
        FleetStatisticsUpdated().query
    );

    // Update state when initial data loads
    useEffect(() => {
        if (initialData && initialData.GetFleetStatistics) {
            setFleetStats(initialData.GetFleetStatistics);
            setLastUpdate(initialData.GetFleetStatistics.lastUpdated);
        }
    }, [initialData]);

    // Update state when subscription data arrives
    useEffect(() => {
        if (subscriptionData && subscriptionData.FleetStatisticsUpdated) {
            setFleetStats(subscriptionData.FleetStatisticsUpdated);
            setLastUpdate(subscriptionData.FleetStatisticsUpdated.lastUpdated);
        }
    }, [subscriptionData]);
    
    if(!user.selectedOrganization){
        return (<FuseLoading />);
    }

    if (initialLoading) {
        return <FuseLoading />;
    }

    if (initialError) {
        return (
            <FusePageCarded
                header={
                    <div className="flex flex-col sm:flex-row space-y-16 sm:space-y-0 flex-1 w-full items-center justify-between py-32 px-24 md:px-32">
                        <Typography variant="h4">Dashboard de Estadísticas de Fleet</Typography>
                    </div>
                }
                content={
                    <div className="p-24">
                        <Typography color="error">
                            Error loading fleet statistics: {initialError.message}
                        </Typography>
                    </div>
                }
            />
        );
    }

    if (!fleetStats) {
        return (
            <FusePageCarded
                header={
                    <div className="flex flex-col sm:flex-row space-y-16 sm:space-y-0 flex-1 w-full items-center justify-between py-32 px-24 md:px-32">
                        <Typography variant="h4">Dashboard de Estadísticas de Fleet</Typography>
                    </div>
                }
                content={
                    <div className="p-24">
                        <Typography>Estadísticas de Fleet no disponibles</Typography>
                    </div>
                }
            />
        );
    }

    return (
        <FusePageCarded
            classes={{
                content: "flex",
                header: "min-h-72 h-72 sm:h-72 sm:min-h-72"
            }}
            header={
                <div className="flex flex-col sm:flex-row space-y-16 sm:space-y-0 flex-1 w-full items-center justify-between py-32 px-24 md:px-32">
                    <Typography variant="h4" align="center" className="w-full sm:w-auto">Dashboard de Estadísticas de Fleet</Typography>
                    <Box display="flex" alignItems="center" className="mt-16 sm:mt-0">
                        <Chip 
                            label={subscriptionLoading ? "Connecting..." : "Live"} 
                            color={subscriptionLoading ? "default" : "primary"}
                            size="small"
                            style={{ marginRight: 8 }}
                        />
                        {lastUpdate && (
                            <Chip 
                                label={`Last update: ${new Date(lastUpdate).toLocaleTimeString()}`}
                                size="small"
                            />
                        )}
                    </Box>
                </div>
            }
            content={
                <div className="p-24" style={{ maxWidth: 1200, margin: '0 auto' }}>
                    {/* Total Vehicles Card */}
                    <Card className="mb-24">
                        <CardContent>
                            <Typography variant="h3" color="primary" align="center" gutterBottom>
                                {fleetStats.totalVehicles.toLocaleString()}
                            </Typography>
                            <Typography variant="h6" align="center" color="textSecondary">
                                Total de Vehículos Procesados
                            </Typography>
                        </CardContent>
                    </Card>

                    <Grid container spacing={24}>
                        {/* Vehicles by Type - Donut Chart */}
                        <Grid item xs={12} md={6} style={{ marginBottom: 24 }}>
                            <SimpleDonutChart 
                                data={fleetStats.vehiclesByType || {}} 
                                title="Vehículos por Tipo"
                                colors={['#1976d2', '#388e3c', '#f57c00']}
                            />
                        </Grid>

                        {/* Vehicles by Decade - Bar Chart */}
                        <Grid item xs={12} md={6} style={{ marginBottom: 24 }}>
                            <SimpleBarChart 
                                data={{
                                    "1980s": (fleetStats.vehiclesByDecade && fleetStats.vehiclesByDecade.decade1980s) ? fleetStats.vehiclesByDecade.decade1980s : 0,
                                    "1990s": (fleetStats.vehiclesByDecade && fleetStats.vehiclesByDecade.decade1990s) ? fleetStats.vehiclesByDecade.decade1990s : 0,
                                    "2000s": (fleetStats.vehiclesByDecade && fleetStats.vehiclesByDecade.decade2000s) ? fleetStats.vehiclesByDecade.decade2000s : 0,
                                    "2010s": (fleetStats.vehiclesByDecade && fleetStats.vehiclesByDecade.decade2010s) ? fleetStats.vehiclesByDecade.decade2010s : 0,
                                    "2020s": (fleetStats.vehiclesByDecade && fleetStats.vehiclesByDecade.decade2020s) ? fleetStats.vehiclesByDecade.decade2020s : 0
                                }} 
                                title="Vehículos por Década"
                                color="#9c27b0"
                            />
                        </Grid>

                        {/* HP Statistics */}
                        <Grid item xs={12} md={6} style={{ marginBottom: 24 }}>
                            <HpStatsCard hpStats={fleetStats.hpStats} />
                        </Grid>

                        {/* Speed Classification */}
                        <Grid item xs={12} md={6} style={{ marginBottom: 24 }}>
                            <SpeedClassCard speedClass={fleetStats.vehiclesBySpeedClass} />
                        </Grid>
                    </Grid>

                    <Divider className="my-24" />
                    
                    {/* Raw Data Debug (remove in production) */}
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Raw Data (Debug)</Typography>
                            <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                                {JSON.stringify(fleetStats, null, 2)}
                            </pre>
                        </CardContent>
                    </Card>
                </div>
            }
            ref={pageLayout}
            innerScroll
        />
    );
}

export default withReducer('VehicleStatsManagement', reducer)(VehicleStatss);
