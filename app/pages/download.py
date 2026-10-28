import json
import streamlit as st
from portal.ui import *
from portal.config import ROOT,DATA,VARIABLES

t,f = context(require=False)

st.title('Data & Download')

st.write('Exports use Nepal local time. Aggregate tables include period boundaries, observation counts and explicit missing coverage values.')

if f['source'] != 'tipping_bucket' and f['stations'] and f['end'] is not None:
    # Tipping bucket data not implemented yet
    
    raw = raw_subset(t,f)
    a = subset(t,f)

    raw['unit'] = raw.variable.map(lambda v:VARIABLES[v][1])
    a['unit'] = a.variable.map(lambda v:VARIABLES[v][1])

    st.subheader('Current selection')
    st.dataframe(a,hide_index=True,use_container_width=True)

    c1,c2=st.columns(2)

    c1.download_button('Download filtered observations',csv_bytes(raw),'filtered_observations.csv','text/csv',disabled=raw.empty)
    c2.download_button('Download period summaries',csv_bytes(a),'period_summaries.csv','text/csv',disabled=a.empty)

    selected=t['stations'][t['stations'].station_key.isin(f['stations'])]

    st.download_button('Download selected station metadata',csv_bytes(selected),'selected_stations.csv','text/csv')
    st.download_button('Download filter settings',json.dumps(f,default=str,indent=2),'filter_settings.json','application/json')
else:
    st.info('Select a populated dataset, station and complete date range for filtered exports.')
    st.subheader('Archive documentation and templates')

    st.download_button('Download all station metadata',csv_bytes(t['stations']),'station_metadata.csv','text/csv')
    st.download_button('Download quality report',(DATA/'audit.json').read_bytes(),'quality_report.json','application/json')
    st.download_button('Download quarantined duplicates',(DATA/'duplicate_rows.csv').read_bytes(),'duplicate_rows.csv','text/csv')
    st.download_button('Download empty tipping-bucket template',(ROOT/'data/raw/tipping_bucket_template.csv').read_bytes(),'tipping_bucket_template.csv','text/csv')
    st.download_button('Download data contract',(ROOT/'docs/DATA_CONTRACT.md').read_text(),'DATA_CONTRACT.md','text/markdown')
    
    st.caption('Chart-specific CSV, interactive HTML and PNG downloads are available beside each chart. All downloads reflect the prepared dataset, not edits to the original source files.')
