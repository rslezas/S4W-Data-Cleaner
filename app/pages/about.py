import streamlit as st
from portal.config import ROOT

st.title('About this portal')
st.write('A draft research portal for the S4W Nepal project. Prepared observations support transparent exploration of rainfall, surface water and groundwater.')
st.subheader('How to read the data')
st.markdown('''
- **Rainfall:** observed sums only until the measurement interval convention is verified. Missing days are never zero-filled.
- **Water temperature:** sampled daily min/mean/max; not air temperature or continuous daily extremes.
- **Groundwater:** monthly source observations. Positive depth change means a deeper water level only if a fixed depth reference is confirmed.
- **Streamflow:** sample means and a sample-based flow-duration curve. Irregular measurements do not establish continuous runoff volume.
- **Seasons:** pre-monsoon March–May; monsoon June–September; post-monsoon October–November; winter December–February. Winter is labelled by its January/February year.
- **Trends:** exploratory Mann–Kendall and Sen's slope only where coverage and record-length checks pass.
''')

st.subheader('Future tipping-bucket data')
st.write('The offline adapter supports 10-minute or hourly interval amounts, daily aggregation, complete-window 1/3/24-hour maxima and rainfall diurnal profiles. The current interface remains an explicit placeholder until records and station pairing metadata are supplied.')

st.subheader('Accessibility')
st.write('Controls use visible labels and keyboard-operable native widgets. Charts have text explanations, data tables and CSV exports. The station table and text links provide an alternative to map interaction. Full screen-reader and mobile testing should be included before public release.')

with st.expander('Input and output data contract'):
    st.markdown((ROOT/'docs/DATA_CONTRACT.md').read_text())
with st.expander('Page layout and implementation guide'):
    st.markdown((ROOT/'docs/PAGE_LAYOUT.md').read_text())
    
st.caption('Draft interface; sponsor branding, contact details, data licence and approved geographic layers should be supplied before public release.')
