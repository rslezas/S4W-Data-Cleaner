"""Pure offline transformations. Input/output column contracts are in docs/DATA_CONTRACT.md.
No Streamlit imports: rebuilding data never requires running the web server.
"""
import numpy as np
import pandas as pd
from scipy.stats import norm, theilslopes
from portal.config import *


def period_bounds(dates, resolution):
    """Local naive timestamps -> aligned [start, end) periods; winter is Dec–Feb."""
    d = pd.to_datetime(dates)
    if resolution == 'Seasonal':
        months = d.dt.month
        start_month = np.select([months.isin([12, 1, 2]), months.between(3, 5),
                                 months.between(6, 9)], [12, 3, 6], default=10)
        year = d.dt.year - months.isin([1, 2]).astype(int)
        start = pd.to_datetime(dict(year=year, month=start_month, day=1))
        end = pd.Series([t + pd.DateOffset(months={12:3, 3:3, 6:4, 10:2}[t.month]) for t in start], index=d.index)
    else:
        freq = {'Hourly':'h', 'Daily':'D', 'Monthly':'M', 'Annual':'Y'}[resolution]
        p = d.dt.to_period(freq)
        start, end = p.dt.start_time, (p + 1).dt.start_time
    return start, end


def season_label(dates):
    m = pd.to_datetime(dates).dt.month
    return np.select([m.isin([12,1,2]), m.between(3,5), m.between(6,9)],
                     ['Winter','Pre-monsoon','Monsoon'], default='Post-monsoon')


def aggregate(long):
    """Valid long observations -> period summaries, retaining counts and missingness.

    Rain: sum observed amounts. Other variables: sample mean (not time-weighted).
    CS daily certification is deliberately opt-in. Groundwater exports are monthly
    source observations; never manufacture daily/hourly values from them.
    """
    results = []
    keys = ['station_key','source','site_id','variable']
    for resolution in ['Hourly','Daily','Monthly','Seasonal','Annual']:
        x = long.copy()
        if resolution in ['Hourly','Daily']:
            x = x[x.source != 'gw_database'].copy()
        if resolution == 'Hourly':
            # CS collection timestamps do not establish subdaily rainfall.
            x = x[x.source != 'cs_precip_sample'].copy()
        if x.empty:
            continue
        x['period_start'], x['period_end'] = period_bounds(x.time, resolution)
        x['date'] = x.time.dt.normalize()
        # Certified daily rainfall requires exactly one CS entry on that day.
        per_day = x.groupby(keys + ['date']).value.transform('size')
        x['certified_day'] = ((x.source == 'cs_precip_sample') & CS_DAILY_CONFIRMED & per_day.eq(1))
        x['wet_day'] = x.certified_day & x.value.ge(RAIN_DAY_MM)
        x['observed_wet_date'] = x.date.where(x.value.ge(RAIN_DAY_MM))
        g = x.groupby(keys + ['period_start','period_end'], observed=True)
        a = g.agg(mean=('value','mean'), minimum=('value','min'), maximum=('value','max'),
                  observed_sum=('value','sum'), n_observations=('value','size'),
                  observed_days=('date','nunique'), certified_days=('certified_day','sum'),
                  rain_days=('wet_day','sum'), observed_rain_dates=('observed_wet_date','nunique')).reset_index()
        rain = a.variable.eq('precip_mm')
        a['value'] = a['mean'].where(~rain, a.observed_sum)
        a['expected_days'] = (a.period_end - a.period_start).dt.total_seconds() / 86400
        a['day_presence_fraction'] = (a.observed_days / a.expected_days).clip(upper=1)
        a['coverage'] = np.where(rain & a.source.eq('cs_precip_sample') & CS_DAILY_CONFIRMED,
                                 a.certified_days / a.expected_days, np.nan)
        a.loc[~rain | a.coverage.isna(), 'rain_days'] = np.nan
        a['resolution'] = resolution
        a['season'] = season_label(a.period_start)
        a['season_year'] = a.period_start.dt.year + a.period_start.dt.month.eq(12).astype(int)
        a['statistic'] = np.where(rain, 'Observed rainfall sum', 'Sample mean')
        results.append(a)
    return pd.concat(results, ignore_index=True)


def climatology_and_trends(summary):
    """Monthly summaries -> exploratory climatology/anomalies and annual MK/Sen.

    Rain only qualifies with certified >=80% coverage; sample means remain
    descriptive. A monthly climatology needs 5 distinct years for that month.
    Trends need >=10 annual means with >=8 observed months per year; rainfall
    additionally needs 12 coverage-qualified months. Sen uses actual year gaps.
    """
    monthly = summary[summary.resolution.eq('Monthly')].copy()
    eligible = monthly.variable.ne('precip_mm') | monthly.coverage.ge(MIN_COVERAGE)
    monthly = monthly[eligible]
    monthly['month'] = monthly.period_start.dt.month
    monthly['year'] = monthly.period_start.dt.year
    keys = ['station_key','variable']
    climate = monthly.groupby(keys + ['month']).agg(climatology=('value','mean'),
                baseline_years=('year','nunique'), baseline_start=('year','min'), baseline_end=('year','max')).reset_index()
    climate = climate[climate.baseline_years >= MIN_CLIM_YEARS]
    anomalies = monthly.merge(climate, on=keys+['month'])
    anomalies['anomaly'] = anomalies.value - anomalies.climatology
    records = []
    for (station, variable), g in monthly.groupby(keys):
        a = g.groupby('year').agg(mean=('value','mean'), total=('value','sum'), months=('month','nunique'))
        a = a[a.months >= (12 if variable == 'precip_mm' else 8)]
        if len(a) < MIN_TREND_YEARS:
            continue
        y = a['total' if variable == 'precip_mm' else 'mean'].to_numpy()
        years = a.index.to_numpy()
        n = len(y)
        s = sum(np.sign(y[j+1:]-y[j]).sum() for j in range(n-1))
        ties = np.unique(y, return_counts=True)[1]
        var_s = (n*(n-1)*(2*n+5) - np.sum(ties*(ties-1)*(2*ties+5))) / 18
        z = (s-np.sign(s))/np.sqrt(var_s) if var_s else 0.0
        sen = theilslopes(y, years)
        records.append(dict(station_key=station, variable=variable, years=n,
            first_year=int(years.min()), last_year=int(years.max()), mk_p=2*norm.sf(abs(z)),
            sen_per_year=sen.slope, slope_low=sen.low_slope, slope_high=sen.high_slope))
    return climate, anomalies, pd.DataFrame(records, columns=['station_key','variable','years','first_year','last_year','mk_p','sen_per_year','slope_low','slope_high'])


def tipping_products(frame):
    """Future adapter: interval-END timestamps, nonoverlapping 10/60 minute amounts.

    Input: station_key,time (local naive),precip_mm,interval_minutes. Explicit dry
    intervals must be 0; absent intervals are missing. Reject mixed cadence,
    duplicate timestamps, negative rain, and bins off the local midnight grid.
    Output hourly/daily observed amounts + coverage; complete-window maxima and
    mean hourly diurnal rainfall. No synthetic observations are generated.
    """
    if frame.empty:
        return pd.DataFrame(), pd.DataFrame(), pd.DataFrame(), pd.DataFrame()
    hours, days, extremes, diurnal = [], [], [], []
    for station, g in frame.groupby('station_key'):
        g = g.sort_values('time').copy()
        cadence = g.interval_minutes.unique()
        if len(cadence) != 1 or cadence[0] not in [10,60]:
            raise ValueError(f'{station}: use one cadence, 10 or 60 minutes.')
        step = int(cadence[0])
        if g.time.duplicated().any() or g.precip_mm.lt(0).any() or (~np.isfinite(g.precip_mm)).any() or g.time.isna().any():
            raise ValueError(f'{station}: duplicate time, negative or missing rainfall.')
        if g.time.ne(g.time.dt.floor(f'{step}min')).any():
            raise ValueError(f'{station}: interval ends must align to the local midnight grid.')
        # Shift interval END to START, so midnight belongs to the previous day.
        s = pd.Series(g.precip_mm.to_numpy(), index=g.time-pd.Timedelta(minutes=step))
        s = s.reindex(pd.date_range(s.index.min(), s.index.max(), freq=f'{step}min'))
        def bins(freq, expected):
            r = s.resample(freq).agg(['sum','count'])
            r['observed_sum'] = s.resample(freq).sum(min_count=1)
            r['coverage'] = r['count']/expected
            r['value'] = r.observed_sum.where(r.coverage.eq(1))
            r['station_key'] = station
            return r.rename_axis('period_start').reset_index()
        h = bins('h', 60//step); d = bins('D',1440//step)
        hours.append(h); days.append(d)
        record = {'station_key':station}
        for window in [1,3,24]:
            sums = s.rolling(window*60//step, min_periods=window*60//step).sum()
            record[f'max_{window}h_mm'] = sums.max()
            record[f'max_{window}h_mean_mm_per_h'] = sums.max()/window
        extremes.append(record)
        cycle = h.assign(hour=h.period_start.dt.hour).groupby('hour').agg(mean_mm=('value','mean'), n_complete_hours=('value','count')).reset_index()
        cycle['station_key'] = station
        diurnal.append(cycle)
    return pd.concat(hours), pd.concat(days), pd.DataFrame(extremes), pd.concat(diurnal)


def rollup_tipping_daily(daily):
    """Daily tipper table -> monthly/seasonal/annual amount and complete-day count.

    value is a full period total ONLY when every expected day is complete.
    observed_sum always retains measured amounts; it is not scaled to fill gaps.
    """
    output=[]
    for resolution in ['Monthly','Seasonal','Annual']:
        d=daily.copy().reset_index(drop=True)
        d['start'],d['end']=period_bounds(d.period_start,resolution)
        d['complete']=d.coverage.eq(1)
        d['rain_day']=d.complete & d.value.ge(RAIN_DAY_MM)
        a=d.groupby(['station_key','start','end']).agg(
            observed_sum=('observed_sum',lambda x:x.sum(min_count=1)),
            complete_days=('complete','sum'),rain_days=('rain_day','sum')).reset_index()
        a['expected_days']=(a.end-a.start).dt.days
        a['coverage']=a.complete_days/a.expected_days
        a['value']=a.observed_sum.where(a.coverage.eq(1))
        a['resolution']=resolution
        output.append(a.rename(columns={'start':'period_start','end':'period_end'}))
    return pd.concat(output,ignore_index=True)
