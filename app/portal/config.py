"""Central contracts and scientific choices; edit these before rebuilding data."""
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data' / 'processed'
TZ = 'Asia/Kathmandu'
SOURCE_MAP = {'s4w_nepal_v1.6': 'cs_precip_sample', 'Flow_SW_DB': 'sw_database',
              'GW New Database': 'gw_database'}
LABELS = {'cs_precip_sample': 'Citizen-science rainfall', 'sw_database': 'Surface water',
          'gw_database': 'Groundwater', 'tipping_bucket': 'Tipping bucket (future)'}
VARIABLES = {
    'precip_mm': ('Rainfall', 'mm'), 'gw_depth_m': ('Groundwater depth', 'm'),
    'water_flow_cms': ('Streamflow', 'm³/s'), 'wq_temp_c': ('Water temperature', '°C'),
    'wq_ec_uscm': ('Electrical conductivity', 'µS/cm'), 'wq_tds_ppm': ('Total dissolved solids', 'ppm'),
    'wq_ph': ('pH', 'pH units'), 'water_level_m': ('Water level', 'm'),
}
ACCEPTED_QC = ['CheckedGood', 'CheckedCorrected']
RAIN_DAY_MM = 1.0
# Set True ONLY after the sponsor confirms each CS row is one local calendar-day
# total, dated to that day. Multiple same-day rows still remain ambiguous.
CS_DAILY_CONFIRMED = False
MIN_COVERAGE = 0.8
MIN_CLIM_YEARS = 5  # exploratory record climatology, not a 30-year climate normal
MIN_TREND_YEARS = 10
SEASONS = ['Winter', 'Pre-monsoon', 'Monsoon', 'Post-monsoon']
