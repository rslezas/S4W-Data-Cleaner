"""Scientific boundary tests: missingness, local seasons, cadence and trends."""
import numpy as np
import pandas as pd
import pytest
from portal.processing import period_bounds, aggregate, tipping_products, rollup_tipping_daily, climatology_and_trends


def test_winter_crosses_year_and_leap_day():
    dates=pd.Series(pd.to_datetime(['2023-12-01','2024-02-29','2024-03-01']))
    a,b=period_bounds(dates,'Seasonal')
    assert a.iloc[0]==a.iloc[1]==pd.Timestamp('2023-12-01')
    assert b.iloc[1]==pd.Timestamp('2024-03-01')
    assert (b.iloc[1]-a.iloc[1]).days==91


def test_missing_rain_is_not_zero_and_not_certified():
    d=pd.DataFrame({'station_key':['cs_precip_sample::A']*2,'site_id':['A']*2,
        'source':['cs_precip_sample']*2,'variable':['precip_mm']*2,
        'time':pd.to_datetime(['2025-01-01','2025-01-03']),'value':[0.,2.]})
    a=aggregate(d)
    daily=a[a.resolution=='Daily'];monthly=a[a.resolution=='Monthly'].iloc[0]
    assert len(daily)==2 and monthly.value==2
    assert monthly.observed_days==2 and monthly.expected_days==31
    assert pd.isna(monthly.coverage) and pd.isna(monthly.rain_days)
    assert not (a.resolution=='Hourly').any()


def tip_fixture(n=144):
    return pd.DataFrame({'station_key':['tipping_bucket::A']*n,
       'time':pd.date_range('2025-01-01 00:10',periods=n,freq='10min'),
       'precip_mm':np.ones(n),'interval_minutes':[10]*n})


def test_tipper_midnight_rollup_and_complete_windows():
    h,d,e,c=tipping_products(tip_fixture())
    assert len(h)==24 and len(d)==1 and d.iloc[0].value==144
    assert e.iloc[0].max_1h_mm==6 and e.iloc[0].max_3h_mm==18 and e.iloc[0].max_24h_mm==144
    assert (c.mean_mm==6).all()
    a=rollup_tipping_daily(d)
    monthly=a[a.resolution=='Monthly'].iloc[0]
    assert monthly.observed_sum==144 and monthly.complete_days==1
    assert pd.isna(monthly.value) and monthly.coverage==1/31


def test_missing_tipper_interval_invalidates_full_window():
    h,d,e,_=tipping_products(tip_fixture().drop(index=10))
    assert pd.isna(d.iloc[0].value) and d.iloc[0].observed_sum==143
    assert h.value.isna().sum()==1 and pd.isna(e.iloc[0].max_24h_mm)


def test_duplicate_tipper_rejected():
    d=tip_fixture()
    with pytest.raises(ValueError): tipping_products(pd.concat([d,d.iloc[:1]]))


def test_groundwater_is_not_upsampled():
    d=pd.DataFrame({'station_key':['gw_database::A'],'site_id':['A'],
        'source':['gw_database'],'variable':['gw_depth_m'],
        'time':pd.to_datetime(['2025-01-01']),'value':[4.]})
    assert set(aggregate(d).resolution)=={'Monthly','Seasonal','Annual'}


def test_trend_uses_real_year_gaps_and_ties():
    rows=[]
    for year in [2000,2001,2003,2004,2006,2007,2009,2010,2012,2013]:
        for month in range(1,13):
            start=pd.Timestamp(year,month,1)
            rows.append(dict(station_key='test',variable='gw_depth_m',resolution='Monthly',
                period_start=start,period_end=start+pd.DateOffset(months=1),coverage=np.nan,value=2*(year-2000)))
    climate,anomaly,trends=climatology_and_trends(pd.DataFrame(rows))
    assert len(climate)==12 and len(anomaly)==120
    assert trends.iloc[0].sen_per_year==2 and trends.iloc[0].mk_p<.05
    for r in rows:r['value']=1
    _,_,trends=climatology_and_trends(pd.DataFrame(rows))
    assert trends.iloc[0].mk_p==1 and trends.iloc[0].sen_per_year==0


def test_actual_rain_totals_reconcile_and_source_keys_match():
    from portal.config import DATA,ROOT,ACCEPTED_QC
    raw=pd.read_csv(ROOT/'data/raw/precip_data.csv')
    expected=raw[raw.source.eq('cs_precip_sample')&raw.qc_flag.isin(ACCEPTED_QC)].precip_mm.sum()
    summary=pd.read_parquet(DATA/'summary.parquet')
    for resolution in ['Daily','Monthly','Seasonal','Annual']:
        actual=summary[summary.variable.eq('precip_mm')&summary.resolution.eq(resolution)].value.sum()
        assert actual==pytest.approx(expected)
    observed=pd.read_parquet(DATA/'observations.parquet')
    stations=pd.read_parquet(DATA/'stations.parquet')
    assert set(observed.station_key)<=set(stations.station_key)
    assert not stations.station_key.duplicated().any()


def test_six_file_loader_and_missing_file_message(tmp_path):
    from scripts.prepare_data import load_inputs
    from portal.config import ROOT
    d,s,counts=load_inputs(ROOT/'data/raw')
    assert len(d)==5002 and len(s)==148
    assert len(counts)==6 and counts['precip_data.csv']==2814
    assert d.site_id.dtype.name=='string'
    with pytest.raises(ValueError,match='ground_data.csv'):
        load_inputs(tmp_path)
