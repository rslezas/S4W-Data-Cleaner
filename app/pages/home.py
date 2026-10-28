import json
import streamlit as st
from portal.config import DATA
from portal.ui import context
from portal.config import LABELS

t, f = context(require=False)

st.title('Explore Nepal’s water observations')
st.write('Browse rainfall, groundwater and surface-water records collected through S4W Nepal. Start with a dataset and station in the sidebar, then explore changes through time or across the map.')

a, b, c = st.columns(3)

a.metric('Observation rows supplied', f"{json.loads((DATA/'audit.json').read_text())['input_rows']:,}")
b.metric('Stations with accepted values', t['observations'].station_key.nunique())
c.metric('Stations in metadata', len(t['stations']))

st.caption('Archive-wide inventory; sidebar filters apply to analysis pages. These draft data include a partial 2025 rainfall sample.')

left, right = st.columns(2)

with left:
    st.subheader('Changes through time')
    st.write('Station series, rainfall distributions, groundwater depths, streamflow and temperature observations.')
    st.page_link('pages/temporal.py',label='Open Temporal')

    st.subheader('Compare records')
    st.write('Compare stations on matching periods and inspect coverage before interpreting differences.')
    st.page_link('pages/integrated.py',label='Open Integrated')
with right:
    st.subheader('Patterns across Nepal')
    st.write('Select a month or season to map values. Open a station’s time series from its popup.')
    st.page_link('pages/spatial.py',label='Open Spatial')
    
    st.subheader('Take the data with you')
    st.write('Download filtered observations, period summaries, station metadata and the quality report.')
    st.page_link('pages/download.py',label='Open Data & Download')

st.subheader('Available datasets')

inventory = t['observations'].groupby('source').agg(
    stations=('station_key','nunique'),
    valid_values=('value','size'),
    first=('time','min'),
    last=('time','max')
).reset_index()

inventory['dataset']=inventory.source.map(LABELS)

st.dataframe(
    inventory[['dataset','stations','valid_values','first','last']],
    hide_index=True,
    use_container_width=True
)

st.info('Tipping-bucket rainfall is a planned data source. No hourly rainfall or intensity values have been invented for this draft.')
st.warning('Rainfall observation intervals are not included in the supplied CSV. Daily-total certification and standard rain-day counts remain disabled until the collection convention is confirmed. Observed amounts are available now.')
