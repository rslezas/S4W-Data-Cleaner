"""Run from project root: python -m scripts.prepare_data.
Inputs: six data/raw/{ground,surface,precip}_{data,sites}.csv files. Outputs: parquet + audit JSON.
Raw files are never overwritten. See docs/DATA_CONTRACT.md before adding sources.
"""
import json
import hashlib
import numpy as np
import pandas as pd
from portal.config import *
from portal.processing import aggregate, climatology_and_trends, tipping_products, rollup_tipping_daily


def load_inputs(raw):
    """Read six wide CSVs; return observations, metadata and per-file row counts.

    Station IDs remain strings. Metadata source aliases are normalized later by
    SOURCE_MAP. Unknown/misplaced sources fail with a filename-specific message.
    """
    frames, masters, counts = [], [], {}
    contracts = {
        'ground': ('gw_database', ['gw_depth_m']),
        'surface': ('sw_database', ['water_flow_cms','water_level_m','wq_temp_c',
                                     'wq_ec_uscm','wq_tds_ppm','wq_ph']),
        'precip': ('cs_precip_sample', ['precip_mm']),
    }
    for kind, (source, variables) in contracts.items():
        for suffix, target in [('data', frames), ('sites', masters)]:
            path = raw / f'{kind}_{suffix}.csv'
            if not path.exists():
                raise ValueError(f'Missing required input: {path.name}')
            frame = pd.read_csv(path, dtype={'site_id':'string','source':'string'})
            required = {'site_id','source'} | ({'msmt_datetime','qc_flag'}
                       if suffix == 'data' else {'latitude','longitude'})
            missing = required - set(frame)
            if missing:
                raise ValueError(f'{path.name}: missing columns {sorted(missing)}')
            if frame[['site_id','source']].isna().any().any():
                raise ValueError(f'{path.name}: station ID and source cannot be blank.')
            mapped = frame.source.map(SOURCE_MAP).fillna(frame.source)
            if not mapped.eq(source).all():
                raise ValueError(f'{path.name}: unexpected source; expected {source} or its metadata alias.')
            if suffix == 'data':
                if not any(v in frame for v in variables):
                    raise ValueError(f'{path.name}: expected at least one measurement column from {variables}')
                frame['source'] = mapped
                # Coordinates are optional in observation CSVs; metadata is primary.
                for c in ['latitude','longitude']:
                    if c not in frame: frame[c] = np.nan
            counts[path.name] = len(frame)
            target.append(frame)
    return pd.concat(frames, ignore_index=True), pd.concat(masters, ignore_index=True), counts


def main():
    DATA.mkdir(parents=True, exist_ok=True)
    raw = ROOT/'data/raw'
    # Validate each water type independently before combining in memory.
    # Inputs stay as six separate wide CSVs; downstream outputs stay long-format.
    d, sites, input_counts = load_inputs(raw)
    report = {'input_rows':len(d), 'input_sites':len(sites), 'accepted_qc':ACCEPTED_QC,
              'cs_daily_confirmed':CS_DAILY_CONFIRMED, 'input_counts': input_counts}
    # Aware timestamps are mandatory: do not silently interpret naive times as UTC.
    aware = d.msmt_datetime.astype(str).str.contains(r'(?:Z|[+-]\d{2}:?\d{2})$', regex=True)
    parsed = pd.to_datetime(d.msmt_datetime.where(aware), utc=True, errors='coerce', format='mixed')
    d['time'] = parsed.dt.tz_convert(TZ).dt.tz_localize(None)
    report['invalid_or_naive_times'] = int(d.time.isna().sum())
    report['excluded_qc_rows'] = int((~d.qc_flag.isin(ACCEPTED_QC)).sum())
    d = d[d.qc_flag.isin(ACCEPTED_QC) & d.time.notna() & d.site_id.notna() & d.source.notna()].copy()
    d['station_key'] = d.source + '::' + d.site_id
    dup = d.duplicated(['station_key','time'], keep=False)
    # All ambiguous duplicates are quarantined rather than arbitrarily summed.
    d[dup].to_csv(DATA/'duplicate_rows.csv',index=False)
    report['quarantined_duplicate_rows'] = int(dup.sum())
    d = d[~dup].copy()
    report['numeric_coercions'] = {}
    for v in VARIABLES:
        if v not in d: d[v] = np.nan
        before = d[v].notna()
        d[v] = pd.to_numeric(d[v], errors='coerce')
        report['numeric_coercions'][v] = int((before & d[v].isna()).sum())
        # Conservative physical checks, not a substitute for sponsor QC.
        bad = ~np.isfinite(d[v]) & d[v].notna()
        if v in ['precip_mm','water_flow_cms','wq_ec_uscm','wq_tds_ppm']: bad |= d[v].lt(0)
        if v == 'wq_ph': bad |= ~d[v].between(0,14) & d[v].notna()
        report[f'invalid_{v}'] = int(bad.sum())
        d.loc[bad,v] = np.nan
    long = d.melt(id_vars=['station_key','source','site_id','time','qc_flag'],
                   value_vars=list(VARIABLES),var_name='variable',value_name='value').dropna(subset=['value'])
    long = long.sort_values(['station_key','variable','time'])
    sites['original_source'] = sites.source
    sites['source'] = sites.source.map(SOURCE_MAP).fillna(sites.source)
    sites['station_key'] = sites.source + '::' + sites.site_id
    if sites.station_key.duplicated().any(): raise ValueError('Duplicate metadata station keys.')
    # Preserve metadata-only stations. Add unmatched measurement stations explicitly.
    extra = d[['station_key','source','site_id']].drop_duplicates()
    sites = sites.merge(extra, on=['station_key','source','site_id'],how='outer')
    for c in ['latitude','longitude']:
        sites[c] = pd.to_numeric(sites[c],errors='coerce')
        fallback = d.assign(**{c:pd.to_numeric(d[c],errors='coerce')}).groupby('station_key')[c].median()
        sites[c] = sites[c].fillna(sites.station_key.map(fallback))
    valid_coord = sites.latitude.between(-90,90)&sites.longitude.between(-180,180)
    sites.loc[~valid_coord,['latitude','longitude']] = np.nan
    counts = long.groupby('station_key').size()
    sites['valid_values'] = sites.station_key.map(counts).fillna(0).astype(int)
    report['metadata_only_stations'] = int(sites.valid_values.eq(0).sum())
    report['missing_coordinates'] = int(sites.latitude.isna().sum())
    report['valid_long_values'] = len(long)
    summary = aggregate(long)
    climate, anomalies, trends = climatology_and_trends(summary)
    # Diurnal water-temperature means are grouped by observation hour, not a
    # reconstructed continuous daily temperature cycle.
    temperature = long[long.variable.eq('wq_temp_c')].copy()
    temperature['hour'] = temperature.time.dt.hour
    diurnal = temperature.groupby(['station_key','hour']).value.agg(['mean','count']).reset_index()
    for name, frame in [('observations',long),('stations',sites),('summary',summary),
                        ('climatology',climate),('anomalies',anomalies),('trends',trends),('diurnal',diurnal)]:
        frame.to_parquet(DATA/f'{name}.parquet',index=False)
    # The future tipper contract is shipped as an empty template, never fake data.
    tip = pd.read_csv(raw/'tipping_bucket_template.csv')
    if len(tip):
        if not tip.timestamp.astype(str).str.contains(r'(?:Z|[+-]\d{2}:?\d{2})$',regex=True).all():
            raise ValueError('Tipping-bucket timestamps must contain a timezone offset.')
        tip['time'] = pd.to_datetime(tip.timestamp,utc=True,format='mixed').dt.tz_convert(TZ).dt.tz_localize(None)
        tip['station_key'] = 'tipping_bucket::'+tip.site_id.astype(str)
        products = tipping_products(tip)
        rollup_tipping_daily(products[1]).to_parquet(DATA/'tipper_summary.parquet',index=False)
        for name, frame in zip(['tipper_hourly','tipper_daily','tipper_extremes','tipper_diurnal'], products):
            frame.to_parquet(DATA/f'{name}.parquet',index=False)
    else:
        for name in ['tipper_hourly','tipper_daily','tipper_extremes','tipper_diurnal','tipper_summary']:
            (DATA/f'{name}.parquet').unlink(missing_ok=True)
    report['input_sha256'] = {p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in raw.glob('*.csv')}
    report['built_utc'] = pd.Timestamp.now(tz='UTC').isoformat()
    (DATA/'audit.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2))

if __name__ == '__main__': main()
