"""Smoke tests execute actual Streamlit pages using the prepared supplied data."""
from pathlib import Path
from streamlit.testing.v1 import AppTest
ROOT=Path(__file__).resolve().parents[1]


def app():
    a=AppTest.from_file(str(ROOT/'app.py'),default_timeout=30).run()
    assert not a.exception
    return a


def test_all_pages():
    a=app()
    for page in ['temporal','spatial','integrated','download','about','home']:
        a.switch_page(f'views/{page}.py').run()
        assert not a.exception, [e.message for e in a.exception]


def test_sources_variables_empty_and_placeholder():
    a=app()
    for source,variable in [('gw_database','gw_depth_m'),('sw_database','water_flow_cms'),('sw_database','wq_temp_c')]:
        a.selectbox(key='dataset').select(source).run()
        a.selectbox(key='variable').select(variable).run()
        a.switch_page('views/temporal.py').run()
        assert not a.exception, [e.message for e in a.exception]
    a.multiselect(key='stations').set_value([]).run()
    assert not a.exception and len(a.warning)>0
    a.selectbox(key='dataset').select('tipping_bucket').run()
    assert not a.exception and len(a.info)>0


def test_pair_comparison_and_date_empty():
    a=app()
    options=a.multiselect(key='stations').options
    # Options are display labels; session-state source keys remain authoritative.
    a.multiselect(key='stations').set_value(['cs_precip_sample::296','cs_precip_sample::385']).run()
    a.switch_page('views/integrated.py').run()
    assert not a.exception, [e.message for e in a.exception]


def test_station_deep_link_and_no_complete_month():
    from datetime import date
    a=AppTest.from_file(str(ROOT/'app.py'),default_timeout=30)
    a.query_params['station']='gw_database::GW001'
    a.run().switch_page('views/temporal.py').run()
    assert not a.exception
    assert a.session_state['dataset']=='gw_database'
    assert a.session_state['stations']==['gw_database::GW001']
    a.date_input(key='dates').set_value((date(2025,1,15),date(2025,1,20))).run()
    assert not a.exception and len(a.warning)>0
