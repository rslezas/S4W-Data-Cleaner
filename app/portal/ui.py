"""Shared page controls and exports. Inputs are prepared pandas tables; no ETL here."""
import json
import pandas as pd
import streamlit as st
from portal.config import DATA, VARIABLES, LABELS


@st.cache_data(show_spinner='Loading prepared station data…')
def load_tables(version):
    """version is audit.json's mtime; rebuilding invalidates the shared cache."""
    names = ['observations','stations','summary','climatology','anomalies','trends','diurnal']
    return {n:pd.read_parquet(DATA/f'{n}.parquet') for n in names}


def tables():
    path = DATA/'audit.json'
    if not path.exists():
        st.error('Prepared data is missing. Run `python -m scripts.prepare_data` from the project folder, then reload.')
        st.stop()
    try:
        return load_tables(path.stat().st_mtime_ns)
    except (OSError,ValueError,ImportError) as exc:
        st.error(f'Cannot load prepared data: {exc}. Rebuild with python -m scripts.prepare_data.')
        st.stop()


def choose(label, options, key, **kwargs):
    """Repair dependent selections before creating a session-state-backed widget."""
    if st.session_state.get(key) not in options:
        st.session_state[key] = options[0]
    return st.sidebar.selectbox(label,options,key=key,**kwargs)


def filters(t):
    """Render in the entrypoint so controls persist across all six pages."""
    st.sidebar.header('Explore observations')
    sources = list(t['observations'].source.unique())+['tipping_bucket']
    # Map popup links use a validated source-qualified key; never execute link input.
    target = st.query_params.get('station')
    if target and target != st.session_state.get('_last_link'):
        match = t['stations'][t['stations'].station_key.eq(target)]
        if len(match):
            st.session_state['dataset'] = match.iloc[0].source
            st.session_state['stations'] = [target]
        st.session_state['_last_link'] = target
    src = choose('Dataset',sources,'dataset',format_func=lambda s:LABELS.get(s,s))
    available = t['observations'][t['observations'].source.eq(src)]
    if available.empty:
        st.sidebar.info('Tipping-bucket data has not been supplied.')
        return dict(source=src,variable='precip_mm',stations=[],start=None,end=None,resolution='Daily')
    variables = [v for v in VARIABLES if v in available.variable.unique()]
    var = choose('Variable',variables,'variable',format_func=lambda v:f'{VARIABLES[v][0]} ({VARIABLES[v][1]})')
    available = available[available.variable.eq(var)]
    options = sorted(available.station_key.unique())
    if 'stations' not in st.session_state:
        st.session_state['stations'] = options[:1]
    else:
        old = st.session_state['stations']
        kept = [s for s in old if s in options]
        # Keep an intentional empty selection empty; repair stale nonempty state.
        st.session_state['stations'] = kept if kept or not old else options[:1]
    selected = st.sidebar.multiselect('Stations',options,key='stations',format_func=lambda s:s.split('::',1)[1])
    if st.sidebar.button('Select all stations'):
        st.session_state['_select_all'] = options
        st.rerun()
    lo, hi = available.time.min().date(), available.time.max().date()
    previous = st.session_state.get('dates')
    if not previous or any(d < lo or d > hi for d in previous):
        st.session_state['dates'] = (lo,hi)
    dates = st.sidebar.date_input('Date range (Nepal time)',min_value=lo,max_value=hi,key='dates')
    resolutions = list(t['summary'].loc[t['summary'].source.eq(src)&t['summary'].variable.eq(var),'resolution'].unique())
    if 'resolution' not in st.session_state: st.session_state['resolution']='Monthly'
    resolution = choose('Temporal resolution',resolutions,'resolution')
    st.sidebar.caption('Accepted QC: CheckedGood and CheckedCorrected. Missing observations stay missing.')
    if len(dates) != 2:
        st.sidebar.warning('Choose both a start and an end date.')
    return dict(source=src,variable=var,stations=selected,start=dates[0] if dates else None,
                end=dates[1] if len(dates)==2 else None,resolution=resolution)


def context(require=True):
    t, f = tables(), st.session_state['filters']
    if require:
        if f['source']=='tipping_bucket':
            st.info('Tipping-bucket placeholder: no measurements supplied. See About for the input contract and Data & Download for the CSV template.')
            st.stop()
        if not f['stations']:
            st.warning('No stations selected. Choose at least one station in the sidebar.')
            st.stop()
        if f['end'] is None:
            st.warning('Select a complete date range in the sidebar.')
            st.stop()
    return t,f


def subset(t,f,resolution=None):
    """Return precomputed periods fully within selection; avoid false partial totals."""
    a = t['summary']
    mask = a.station_key.isin(f['stations']) & a.variable.eq(f['variable']) & a.resolution.eq(resolution or f['resolution'])
    if f['start'] is None or f['end'] is None: return a.iloc[:0]
    return a[mask & a.period_start.ge(pd.Timestamp(f['start'])) &
             a.period_end.le(pd.Timestamp(f['end'])+pd.Timedelta(days=1))].copy()


def raw_subset(t,f):
    a = t['observations']
    if f['start'] is None or f['end'] is None: return a.iloc[:0]
    return a[a.station_key.isin(f['stations']) & a.variable.eq(f['variable']) &
             a.time.ge(pd.Timestamp(f['start'])) & a.time.lt(pd.Timestamp(f['end'])+pd.Timedelta(days=1))].copy()


def no_data(a):
    if a.empty:
        st.warning('No complete periods match these filters. Widen the dates, select another station, or choose a finer resolution. Periods crossing the date boundaries are omitted.')
        st.stop()


def csv_bytes(frame):
    """UTF-8 CSV with numeric columns intact; text formula prefixes are neutralized."""
    frame = frame.copy()
    for c in frame.select_dtypes(include=['object','string']).columns:
        frame[c] = frame[c].map(lambda v:"'"+v if isinstance(v,str) and v.startswith(('=','+','@')) else v)
    return frame.to_csv(index=False).encode('utf-8-sig')


def show_chart(fig, frame, key, caption):
    """A chart always has a textual description, accessible table, and downloads."""
    fig.update_layout(template='plotly_white',font=dict(size=15),margin=dict(t=55,b=50),
                      legend_title_text='Station',hovermode='closest')
    fig.update_xaxes(showgrid=True)
    st.plotly_chart(fig,use_container_width=True,key=key,
        config={'displaylogo':False,'toImageButtonOptions':{'format':'png','filename':key,'scale':2}})
    st.caption(caption)
    with st.expander('View chart data and download'):
        st.dataframe(frame,use_container_width=True,hide_index=True)
        a,b=st.columns(2)
        a.download_button('Download chart data (CSV)',csv_bytes(frame),f'{key}.csv','text/csv',key=key+'_csv')
        b.download_button('Download interactive chart (HTML)',fig.to_html(include_plotlyjs=True),f'{key}.html','text/html',key=key+'_html')
        st.caption('Use the chart camera control to download a PNG image.')


def period_note():
    st.caption('Aggregates use only whole periods inside the date filter. Rainfall sums are observed amounts, not gap-filled totals. Other variables use sample means. Times are Asia/Kathmandu.')
