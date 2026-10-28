import streamlit as st
from portal.ui import tables, filters

st.set_page_config(page_title='S4W Nepal · Water Data Portal',page_icon='💧',layout='wide')

st.markdown('**SMARTPHONES4WATER NEPAL** · Water Data Portal')

if '_select_all' in st.session_state:
    st.session_state['stations'] = st.session_state.pop('_select_all')

t = tables()

st.session_state['filters'] = filters(t)

page = st.navigation([
    st.Page('pages/home.py',title='Home',default=True),
    st.Page('pages/temporal.py',title='Temporal',url_path='temporal'),
    st.Page('pages/spatial.py',title='Spatial',url_path='spatial'),
    st.Page('pages/integrated.py',title='Integrated',url_path='integrated'),
    st.Page('pages/download.py',title='Data & Download',url_path='download'),
    st.Page('pages/about.py',title='About',url_path='about'),
])

page.run()
