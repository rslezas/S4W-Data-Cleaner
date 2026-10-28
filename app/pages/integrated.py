import numpy as np
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
from portal.ui import *
from portal.config import VARIABLES

t, f=context();st.title('Integrated comparisons')

period_note()

a = subset(t, f)
no_data(a)

st.subheader('Multi-station comparison')

line = px.line(
        a,
        x='period_start',
        y='value',
        color='site_id',
        markers=True,
        title='Stations on the same temporal scale'
    )

show_chart(
    line,
    a,
    'comparison',
    'Choose several stations in the sidebar. Units and resolution are shared; missing periods are not interpolated.'
)

if len(a.station_key.unique()) >= 2:
    stations = sorted(a.station_key.unique())

    left = st.selectbox('Reference station', stations)
    right = st.selectbox('Comparison station', [s for s in stations if s != left])

    x = a[a.station_key.eq(left)][['period_start', 'value', 'n_observations']]
    y = a[a.station_key.eq(right)][['period_start', 'value', 'n_observations']]

    paired = x.merge(
        y, 
        on='period_start', 
        suffixes=('_reference', '_comparison')
    )
    
    if len(paired):
        unit = VARIABLES[f['variable']][1]
        
        figure = px.scatter(
            paired, 
            x='value_reference', 
            y='value_comparison', 
            hover_data=['period_start'], 
            title='Agreement on overlapping periods', 
            labels={'value_reference': f'{left} ({unit})', 
                    'value_comparison':f'{right} ({unit})'
            }
        )

        bounds = [
            min(paired.value_reference.min(), paired.value_comparison.min()), 
            max(paired.value_reference.max(), paired.value_comparison.max())
        ]

        figure.add_trace(
            go.Scatter(
                x=bounds, 
                y=bounds, 
                mode='lines', 
                name='1:1 agreement', 
                line=dict(dash='dash', color='#444')
            )
        )
        
        show_chart(
            figure, 
            paired, 
            'agreement', 
            'Matched on period start. This compares available samples,  not necessarily equal temporal coverage or colocated stations.'
        )

        error = paired.value_comparison - paired.value_reference

        c1, c2, c3 = st.columns(3)
        c1.metric('Overlapping periods', len(paired))
        c2.metric(f'Mean bias ({unit})', f'{error.mean():.4f}')
        c3.metric(f'RMSE ({unit})', f'{np.sqrt((error**2).mean()):.4f}')
    
    else: st.warning('These stations have no overlapping complete periods in the selected dates.')

else: st.info('Select at least two stations to enable the agreement scatter plot.')

st.subheader('Rainfall,  groundwater and streamflow together')
st.write('Use this exploratory alignment to inspect a possible relationship. Station pairing must be selected based on catchment and location; time alignment does not establish causation.')

monthly = t['summary'][t['summary'].resolution.eq('Monthly')].copy()
monthly = monthly[monthly.period_start.ge(pd.Timestamp(f['start'])) & monthly.period_end.le(pd.Timestamp(f['end'])+pd.Timedelta(days=1))]

options = monthly[['station_key', 'variable']].drop_duplicates()
options['choice']=options.station_key+' / '+options.variable

if len(options) > 1:

    choices = options.choice.tolist()
    c1 = st.selectbox('First monthly record', choices)
    c2 = st.selectbox('Second monthly record', [c for c in choices if c!=c1])

    traces = []

    for selection in [c1, c2]:
        row = options[options.choice.eq(selection)].iloc[0]
        g = monthly[monthly.station_key.eq(row.station_key)&monthly.variable.eq(row.variable)].copy()
        g['record'] = selection
        traces.append(g)

    paired = pd.concat(traces)
    
    figure = px.line(paired, x='period_start', y='value', facet_row='record', markers=True, title='Monthly records aligned in time', labels={'value':'Value (see record units)'})
    figure.update_yaxes(matches=None)

    show_chart(figure, paired, 'cross_dataset', 'Each panel retains its own units and scale. Rainfall is observed mm,  groundwater depth is m,  streamflow is m³/s. Check coverage before comparing responses.')

else: st.info('Widen the date range to compare records across datasets.')

st.subheader('Tipping-bucket vs. citizen-science rainfall')
st.info('Placeholder: requires tipping-bucket data,  verified daily citizen-science totals,  and an explicit colocated-station pairing table. No agreement statistics are computed from the current sample.')
st.code('tipper_site_id, cs_site_id, max_distance_m, approved_by\n', language='text')
st.caption('Future comparison: aggregate both sources to the same local daily boundaries,  retain only coverage-qualified matched days,  then report 1:1 scatter,  bias,  MAE,  RMSE and number of paired days.')
