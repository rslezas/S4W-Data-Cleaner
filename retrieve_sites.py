from file_manager import try_read, try_save, try_save_tabs
from file_manager import raw_folder, cleaned_folder
from pathlib import Path
import datetime as dt
import pandas as pd

surface_path = raw_folder / Path("Flow_SW_DB.xlsx")
ground_path = raw_folder / Path("GW New Database.xlsx")
precip_path = raw_folder / Path("Raw data.xlsx")

def get_surface_sites():

        xls = pd.ExcelFile(surface_path)
        sheets = xls.sheet_names
    
        site_ids = [site_id for site_id in sheets if site_id not in ["Note"]]
    
        all_data = try_read(surface_path)

        surface_sites = pd.DataFrame()
    
        for i in range(len(site_ids)):
    
            site_id = site_ids[i]
    
            stream_data = all_data[site_id]

            records = len(all_data[site_id])

            if records == 0:
                continue

            # Get basic info from raw data

            new_site = pd.DataFrame([{
                "site_id": site_id,
                "name": "",
                "project": stream_data["Project"].iloc[0],
                "records": stream_data["*meta-instance-id*"].count()
            }])

            # Get location of site (corresponding to maximum altitude, mouth of the river)

            valid_pos = stream_data.dropna(subset = [
                "geopoint:Altitude",
                "geopoint:Latitude",
                "geopoint:Longitude"
            ])

            if not valid_pos.empty:
                pos = valid_pos.loc[valid_pos["geopoint:Altitude"].idxmax()]

                pos_info = {
                    "site_id": site_id,
                    "elevation": pos["geopoint:Altitude"],
                    "latitude": pos["geopoint:Latitude"],
                    "longitude": pos["geopoint:Longitude"]
                }

                pos_df = pd.DataFrame([pos_info])

            # Get timing information from raw data

            stream_data["msmt_datetime"] = pd.to_datetime(stream_data["msmt_datetime"])
            stream_data["epoch_seconds"] = pd.to_datetime(stream_data["msmt_datetime"]).astype("int64") / 1e9

            valid_date = stream_data.dropna(subset = ["epoch_seconds"])

            if not valid_date.empty:
                start_date = valid_date.loc[valid_date["epoch_seconds"].idxmin()]["msmt_datetime"]
                end_date = valid_date.loc[valid_date["epoch_seconds"].idxmax()]["msmt_datetime"]

                sd_localized = pd.Timestamp(start_date, tz='Asia/Kathmandu')
                ed_localized = pd.Timestamp(end_date, tz='Asia/Kathmandu')

                date_info = {
                    "site_id": site_id, 
                    "start_date": sd_localized,
                    "end_date": ed_localized
                }

                date_df = pd.DataFrame([date_info])


            new_site["watershed"] = [""] # Watershed currently unknown for surface database

            # Concat site data

            new_site = pd.merge(new_site, pos_df, on="site_id", how="inner")
            new_site = (
                pd.merge(new_site, date_df, on="site_id", how="inner")
                .reset_index(drop=True)
            )

            new_site["timestep"] = ["30.44 days"] # 1 month timestep
            new_site["source"] = ["Flow_SW_DB"] 

            # Add new site to all sites
            if len(surface_sites) == 0:
                surface_sites = new_site.copy()
            else:
                surface_sites = (
                    pd.concat([surface_sites, new_site], ignore_index=True)
                    .reset_index(drop=True)
                )

        surface_sites = (
            surface_sites.sort_values(by="site_id")
            .reset_index(drop=True)
        )

        # Return dataframe

        return surface_sites

def get_ground_sites():

    old_site_info = try_read(ground_path)["Site_IDs"]
    merged = try_read(ground_path)["Merged"]

    ground_sites = pd.DataFrame()

    for _, site in old_site_info.iterrows():

        # Get basic site info from raw data

        site_id = site["Site_IDs"]
        new_site = pd.DataFrame([{
            "site_id": site_id,
            "name": site["Location"],
            "project": "",
            "records": None,
            "watershed": site["Watershed"],
            "elevation": None,
            "latitude": site["Latitude"],
            "longitude": site["Longitude"]
        }])

        # Per-site entries

        merged_subset = merged[merged["GW_ID"] == site_id]

        dates = []

        for column in merged_subset.columns:

            # Find dates with valid entries

            if pd.notna(merged_subset[column]).any():
                try:
                    date = dt.datetime.strptime(column, "%Y_%m")
                    localized = pd.Timestamp(date, tz='Asia/Kathmandu')
                    dates.append(localized)
                except Exception as e:
                    continue

        first_date = ""
        last_date = ""

        if len(dates) > 0:
            first_date = min(dates)
            last_date = max(dates)

        date_df = pd.DataFrame([{
            "site_id": site_id,
            "start_date": first_date,
            "end_date": last_date,
            "timestep": "30.44 days", # 1 month timestep
            "source": "GW New Database"
        }])

        # Combine site information

        new_site = pd.merge(new_site, date_df, on="site_id", how="inner")
        
        if len(ground_sites) == 0:
            ground_sites = new_site.copy()
        else:
            ground_sites = pd.concat([ground_sites, new_site], ignore_index=True)

    # Return dataframe

    return ground_sites

def get_precip_sites():

    all_data = try_read(precip_path, "Sheet1")

    site_ids = all_data["AutoSiteID"].unique()

    precip_sites = pd.DataFrame()

    for site_id in site_ids:

        subset = all_data[all_data["AutoSiteID"] == site_id]

        dates = []
        timesteps = []

        # Basic info from raw data

        new_site = pd.DataFrame([{
                "site_id": site_id,
                "name": subset["MonID"].iloc[0],
                "project": "", # No project noted
                "records": subset["*meta-instance-id*"].count(),
                "watershed": "" # No watershed noted, in future detect watershed by coordinates
            }])

        # Find datetimes with valid entries

        for _, entry in subset.iterrows():

            if pd.notna(entry["precip_mm"]):
                try:
                    date = pd.to_datetime(entry["msmt_datetime"])
                    dates.append(date)

                except Exception as e:
                    continue

        # Find timestep in seconds between each measurement

        for i in range(len(dates)):

            if i == 0:
                continue

            new_epoch = dates[i].timestamp()
            old_epoch = dates[i - 1].timestamp()

            timesteps.append(new_epoch - old_epoch)

        # Find the median timestep in days

        if len(dates) > 1:
            median_timestep = pd.Series(timesteps).median() / 86400 # days
        else:
            median_timestep = None

        if len(dates) > 0:
            first_date = pd.Timestamp(min(dates), tz='Asia/Kathmandu')
            last_date = pd.Timestamp(max(dates), tz='Asia/Kathmandu')
        else:
            first_date = ""
            last_date = ""

        date_info = {
            "site_id": site_id,
            "start_date": first_date,
            "end_date": last_date,
            "timestep": f"{round(median_timestep, 2)} days"
        }

        date_df = pd.DataFrame([date_info])

        # Find site coordinates at maximum recorded elevation

        valid_pos = subset.dropna(subset = [
            "geopoint:Altitude",
            "geopoint:Latitude",
            "geopoint:Longitude"
        ])

        if not valid_pos.empty:
            
            pos = valid_pos.loc[valid_pos["geopoint:Altitude"].idxmax()]

            pos_info = {
                "site_id": site_id,
                "elevation": pos["geopoint:Altitude"],
                "latitude": pos["geopoint:Latitude"],
                "longitude": pos["geopoint:Longitude"]
            }

            pos_df = pd.DataFrame([pos_info])

        # Concat site information

        new_site = pd.merge(new_site, pos_df, on="site_id", how="inner")
        new_site = (
            pd.merge(new_site, date_df, on="site_id", how="inner")
            .reset_index(drop=True)
        )

        # Use form ID as source

        new_site["source"] = subset["FormID"].iloc[0]

        # Add new site to all sites

        if len(precip_sites) == 0:
            precip_sites = new_site.copy()
        else:
            precip_sites = (
                pd.concat([precip_sites, new_site], ignore_index=True)
                .reset_index(drop=True)
            )
 
    precip_sites = (
        precip_sites
        .sort_values(by="site_id")
        .reset_index(drop=True)
    )

    # Return dataframe

    return precip_sites
    
            
def all_sites():

    surface_sites = get_surface_sites()
    ground_sites = get_ground_sites()
    precip_sites = get_precip_sites()

    tabs = [surface_sites, ground_sites, precip_sites]
    tab_names = ["surface_sites", "ground_sites", "precip_sites"]

    # Save dataframe to csv

    for i in range(len(tabs)):
        try_save(tabs[i], cleaned_folder / Path(f"{tab_names[i]}.csv"))

all_sites()