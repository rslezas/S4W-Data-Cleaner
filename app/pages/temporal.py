"""Temporal page: all plots have data and standalone HTML exports."""
import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
from portal.ui import *
from portal.config import VARIABLES, MIN_CLIM_YEARS, MIN_TREND_YEARS

t, f=context()

st.title('Temporal exploration')

a = subset(t, f); no_data(a)

name,  unit = VARIABLES[f['variable']]
period_note()

mode = st.radio('Time-series style', ['Line', 'Bar'], horizontal=True)
plot = px.line if mode == 'Line' else px.bar
figure = plot(
    a, 
    x='period_start', 
    y='value', 
    color='site_id', 
    labels={
        'value':f'{name} ({unit})',
        'period_start':'Period start'
    }, 
    title=f'{f["resolution"]} {name.lower()}'
)

if mode == 'Line': 
    figure.update_traces(mode='lines+markers', connectgaps=False)

if f['variable'] == 'gw_depth_m': 
    figure.update_yaxes(autorange='reversed')
    display = 'Depth axis increases downward. Gaps between samples are not continuous monitoring; lines connect the available samples.'
else:
    display = 'Compare values and observation counts in the table before interpreting changes. Lines connect available samples.'

show_chart(
    figure, 
    a, 
    'series', 
    display
)

if f['variable']=='precip_mm':
    st.subheader('Observed rainfall patterns')
    st.info('Daily plotted amounts are sums assigned to collection dates. Without interval metadata they cannot establish calendar-day rainfall intensity or certified rain-day counts.')
    c=a.groupby('site_id', as_index=False).agg(observed_mm=('value', 'sum'), observations=('n_observations', 'sum'), rain_days=('rain_days', lambda x:x.sum(min_count=1)))
    st.dataframe(c, hide_index=True)
    for resolution in ['Monthly', 'Seasonal']:
        m=subset(t, f, resolution)
        if len(m):
            m['group']=m.period_start.dt.month.astype(str) if resolution=='Monthly' else m.season
            figure=px.box(m, x='group', y='value', color='site_id', points='all', title=f'{resolution} observed rainfall distribution', labels={'value':'Observed rainfall (mm)', 'group':resolution})
            show_chart(figure, m, 'rain_box_'+resolution, 'Every point is an observed period sum; unequal coverage can explain differences. A single point is not a distribution.')
    m=subset(t, f, 'Monthly')
    if len(m):
        station=st.selectbox('Station for rainfall heatmap', sorted(m.station_key.unique()))
        h=m[m.station_key.eq(station)].assign(year=lambda x:x.period_start.dt.year, month=lambda x:x.period_start.dt.month)
        grid=h.pivot(index='year', columns='month', values='value').reindex(columns=range(1, 13))
        figure=px.imshow(grid, aspect='auto', labels={'x':'Month', 'y':'Year', 'color':'Observed mm'}, title='Year × month observed rainfall')
        show_chart(figure, h, 'rain_heatmap', 'Blank cells indicate no observed total. Zero is retained only when observed.')
    d=subset(t, f, 'Daily').sort_values('period_start')
    if len(d):
        d['cumulative_observed_mm']=d.groupby('station_key').value.cumsum()
        show_chart(px.line(d, x='period_start', y='cumulative_observed_mm', color='site_id', title='Cumulative observed rainfall'), d, 'cumulative', 'Accumulation begins at the selected date range. Missing days are not included; this is not a complete water balance.')

if f['variable']=='wq_temp_c':
    st.subheader('Water temperature: sampled daily range')
    d=subset(t, f, 'Daily')
    if len(d):
        r=d.melt(id_vars=['site_id', 'period_start', 'n_observations'], value_vars=['minimum', 'mean', 'maximum'], var_name='statistic', value_name='temperature_c')
        show_chart(px.line(r, x='period_start', y='temperature_c', color='site_id', line_dash='statistic', title='Daily sampled minimum,  mean and maximum'), r, 'temp_range', 'These are water-temperature samples. With one reading,  min = mean = max; full daily extremes require continuous observations.')
    raw=raw_subset(t, f)
    cycle=raw.assign(hour=raw.time.dt.hour).groupby(['site_id', 'hour']).value.agg(['mean', 'count']).reset_index()
    show_chart(px.line(cycle, x='hour', y='mean', color='site_id', markers=True, labels={'mean':'Water temperature (°C)', 'hour':'Local observation hour'}, title='Temperature by observation hour'), cycle, 'temp_diurnal', 'Sampling-hour profile for the selected dates,  potentially confounded by season and station sampling schedules. Not a continuous diurnal record.')

if f['variable']=='water_flow_cms':
    st.subheader('Observed flow-duration curve')
    raw=raw_subset(t, f)
    curves=[]
    for station, g in raw.groupby('site_id'):
        g=g.sort_values('value', ascending=False).copy()
        g['exceedance_percent']=100*np.arange(1, len(g)+1)/(len(g)+1)
        curves.append(g)
    if curves:
        curve=pd.concat(curves)
        show_chart(px.line(curve, x='exceedance_percent', y='value', color='site_id', labels={'value':'Streamflow (m³/s)', 'exceedance_percent':'Sample exceedance (%)'}), curve, 'flow_duration', 'Weibull plotting position rank/(n+1). Irregular spot samples describe sample exceedance,  not the fraction of time a flow is exceeded.')
    m=subset(t, f, 'Monthly')
    if len(m): show_chart(px.line(m, x='period_start', y='value', color='site_id', markers=True, title='Monthly mean sampled streamflow'), m, 'flow_monthly', 'Arithmetic mean of available observations; not a continuous monthly discharge or runoff volume.')

if f['variable']=='gw_depth_m':
    st.subheader('Groundwater seasonal change')
    s=subset(t, f, 'Seasonal').sort_values(['station_key', 'period_start'])
    if len(s):
        s['previous_end']=s.groupby('station_key').period_end.shift()
        s['depth_change_m']=s.groupby('station_key').value.diff().where(s.previous_end.eq(s.period_start))
        show_chart(px.bar(s, x='period_start', y='depth_change_m', color='site_id', title='Change between consecutive observed seasonal means'), s, 'gw_change', 'Positive depth change indicates a deeper water level,  if the source uses depth below a fixed reference. Missing intervening seasons do not produce a change estimate.')

st.subheader('Record climatology,  anomalies and trends')
st.caption('Baseline uses the full prepared archive,  independently of the date filter. This is an exploratory record climatology,  not a 30-year climate normal.')
cl=t['climatology']; cl=cl[cl.station_key.isin(f['stations'])&cl.variable.eq(f['variable'])]
if cl.empty:
    st.info(f'No qualifying climatology: at least {MIN_CLIM_YEARS} years are required for each calendar month. Rainfall additionally requires certified daily coverage ≥80%.')
else:
    show_chart(px.line(cl, x='month', y='climatology', color='station_key', markers=True, title='Monthly record climatology'), cl, 'climate', 'Baseline start,  end and year count are included in the download.')
    an=t['anomalies']; an=an[an.station_key.isin(f['stations'])&an.variable.eq(f['variable'])&an.period_start.ge(pd.Timestamp(f['start']))&an.period_end.le(pd.Timestamp(f['end'])+pd.Timedelta(days=1))]
    if len(an): show_chart(px.bar(an, x='period_start', y='anomaly', color='station_key', title='Anomaly from calendar-month record mean'), an, 'anomaly', 'Anomaly = observed monthly value − qualifying calendar-month mean; units match the selected variable.')
tr=t['trends']; tr=tr[tr.station_key.isin(f['stations'])&tr.variable.eq(f['variable'])]
if tr.empty:
    st.info(f'No qualifying trend: at least {MIN_TREND_YEARS} annual summaries with ≥8 observed months per year (12 coverage-qualified months for rain) are required.')
else:
    st.dataframe(tr, hide_index=True)
    st.download_button('Download trend results', csv_bytes(tr), 'trends.csv', 'text/csv')
    st.caption('Original two-sided Mann–Kendall with tie correction; Sen slope uses actual year spacing. Exploratory only: serial correlation and multiple comparisons are not corrected. Slope is variable units/year.')
