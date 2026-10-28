import html
import json
from urllib.parse import quote
import folium
import numpy as np
import streamlit as st
from streamlit_folium import st_folium
from portal.ui import *
from portal.config import ROOT, VARIABLES
from branca.colormap import linear

t, f = context()
st.title('Spatial exploration')

period_note()
resolution = st.radio('Map period', ['Monthly', 'Seasonal'], horizontal=True)
a = subset(t, f, resolution)
no_data(a)

periods = sorted(a.period_start.unique())
selected = st.select_slider('Move through periods', options=periods, format_func=lambda x:str(x)[:10])

st.caption('Move the slider to step through spatial changes. Each position redraws the selected month or season.')
a = a[a.period_start.eq(selected)].merge(t['stations'][['station_key', 'latitude', 'longitude', 'name']], on='station_key', validate='many_to_one')
missing = int(a.latitude.isna().sum());a=a.dropna(subset=['latitude', 'longitude'])

if missing: 
    st.warning(f'{missing} station(s) have no usable coordinates and are omitted from the map.')
no_data(a)

name, unit = VARIABLES[f['variable']]
style = st.radio('Marker encoding', ['Colour', 'Size'], horizontal=True)

all_values=subset(t, f, resolution).value
low = float(all_values.min())
high = float(all_values.max())

map = folium.Map(
    location=[a.latitude.mean(), a.longitude.mean()],
    zoom_start=11, 
    tiles='OpenStreetMap'
)

scale = linear.YlGnBu_09.scale(low, high if high>low else low+1)
scale.caption=f'{name} ({unit}); fixed across selected dates'

if style == 'Colour':
    scale.add_to(map)

for _, row in a.iterrows():
    
    fraction=(row.value-low)/(high-low) if high>low else 0.5
    
    text=f'{html.escape(str(row.site_id))}: {row.value:.4f} {html.escape(unit)}'
    
    link='temporal?station='+quote(row.station_key, safe='')
    
    popup=f'<b>{text}</b><br>{row.n_observations} observations<br><a href="{link}" target="_top">Open station time series</a>'
    
    folium.CircleMarker(
        [row.latitude, row.longitude], 
        radius=6+12*np.sqrt(fraction) if style=='Size' else 8, 
        color='#173D4B', 
        weight=1, 
        fill=True, 
        fill_color=scale(row.value) if style=='Colour' else '#127987', 
        fill_opacity=.9, 
        tooltip=text, 
        popup=folium.Popup(popup, max_width=300)
    ).add_to(map)

# Optional layers are real GeoJSON only; never draw invented boundaries.

for filename, label in [('rivers', 'Rivers'), ('watersheds', 'Watersheds'), ('wards', 'Wards')]:
    
    path = ROOT/'data/layers'/f'{filename}.geojson'
    enabled = st.checkbox(label, value=False, disabled=not path.exists())

    if not path.exists():
        st.caption(f'{label}: add data/layers/{filename}.geojson to enable.')
    elif enabled:
        try:
            folium.GeoJson(json.loads(path.read_text()), name=label).add_to(map)
        except (ValueError, OSError) as exc:
            st.warning(f'{label} layer could not be loaded: {exc}')

for source, label in [('gw_database', 'Groundwater wells'), ('sw_database', 'Streamflow gauges')]:
    
    if st.checkbox(label, value=False):
        
        group = folium.FeatureGroup(name=label)
        
        for _, row in t['stations'][t['stations'].source.eq(source)].dropna(subset=['latitude', 'longitude']).iterrows():
            folium.CircleMarker(
                [row.latitude, row.longitude], 
                radius=4, 
                color='#885520' if source=='gw_database' else '#444444', 
                tooltip=f'{label}: {row.site_id} (station location)'
            ).add_to(group)
        
        group.add_to(map)

folium.LayerControl().add_to(map)

st_folium(map, height=530, use_container_width=True, returned_objects=[])

st.caption('Markers show the selected period’s observed rainfall sum or sample mean. Optional station layers show locations,  not filtered values. Basemap tiles require internet access.')
st.download_button('Download map (HTML)', map.get_root().render(), 'station_map.html', 'text/html')

st.subheader('Map values and accessible station links')
st.dataframe(a[['site_id', 'value', 'n_observations', 'observed_days', 'latitude', 'longitude']], hide_index=True, use_container_width=True)
st.download_button('Download map data (CSV)', csv_bytes(a), 'map_values.csv', 'text/csv')

for _, row in a.iterrows():
    st.markdown(f'[{html.escape(str(row.site_id))} — open time series](temporal?station={quote(r.station_key, safe="")})')
