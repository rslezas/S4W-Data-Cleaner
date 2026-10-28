from file_manager import try_read, try_save, backup_csv, try_save_tabs
from file_manager import raw_folder, cleaned_folder, backup_folder
from pathlib import Path
import datetime as dt
import pandas as pd
import pathlib
import sys
import srtm

dir = pathlib.Path().resolve()

app_folder = dir / Path("app")
script_folder = dir / Path("scripts")
page_folder = app_folder / Path("pages")

backup_folder = dir / Path("backup")

surface_path = raw_folder / Path("Flow_SW_DB.xlsx")
ground_path = raw_folder / Path("GW New Database.xlsx")
precip_path = raw_folder / Path("Raw data.xlsx")

clean_surface_path = cleaned_folder / Path("surface_data.csv")
clean_ground_path = cleaned_folder / Path("ground_data.csv")
clean_precip_path = cleaned_folder / Path("precip_data.csv")

identifiers = ["site_id", "source", "qc_flag", "msmt_datetime", "elevation", "latitude", "longitude"]
elevation_data = srtm.get_data()

def get_elevation(latitude, longitude):

    return elevation_data.get_elevation(latitude, longitude)


def get_clean_surface():

    xls = pd.ExcelFile(surface_path)
    sheets = xls.sheet_names

    site_ids = [site_id for site_id in sheets if site_id not in ["Note"]]

    all_data = try_read(surface_path)

    clean_surface = pd.DataFrame()

    for i in range(len(site_ids)):

        site_id = site_ids[i]

        stream_data = all_data[site_id]

        for _, entry in stream_data.iterrows():
            
            date = entry["msmt_datetime"]
            localized = pd.Timestamp(date, tz='Asia/Kathmandu')

            new_entry = pd.DataFrame([{
                "site_id": site_id,
                "source": "sw_database",
                "qc_flag": "CheckedGood", # This database is already quality controlled
                "msmt_datetime": localized,
                "elevation": entry["geopoint:Altitude"],
                "latitude": entry["geopoint:Latitude"],
                "longitude": entry["geopoint:Longitude"],
                "water_flow_cms": entry["water_flow_cms"],
                "wq_ec_uscm": entry["wq_ec_uscm"],
                "wq_tds_ppm": entry["wq_tds_ppm"],
                "wq_temp_c": entry["wq_temp_c"],
                "wq_ph": entry["wq_ph"],
                "water_level_m": entry["water_level_m"],
            }])

            if len(clean_surface) == 0:
                clean_surface = new_entry.copy()
            else:
                clean_surface = pd.concat([clean_surface, new_entry], ignore_index=True)

    clean_surface = (
        clean_surface
        .sort_values(by=["site_id", "msmt_datetime"])
        .reset_index(drop=True)
    )

    #try_save(clean_surface, clean_surface_path)

    return clean_surface

def get_clean_ground():

    merged = try_read(ground_path)["Merged"]

    columns = merged.columns

    all_entries = []

    for idx, site in merged.iterrows():
        
        site_id = site["GW_ID"]

        for column in columns:

            if pd.notna(site[column]):
                try:
                    date = dt.datetime.strptime(column, "%Y_%m")
                    localized = pd.Timestamp(date, tz='Asia/Kathmandu')

                    gw_depth_m = site[column]

                    all_entries.append({
                        "site_id": site_id,
                        "source": "gw_database",
                        "qc_flag": "CheckedGood", # This database is already quality controlled
                        "msmt_datetime": localized,
                        "elevation": "",
                        "latitude": site["Latitude"],
                        "longitude": site["Longitude"],
                        "gw_depth_m": gw_depth_m
                    })
                    
                except Exception as e:
                    continue
    
    clean_ground = (
        pd.DataFrame(all_entries)
        .sort_values(by=["msmt_datetime"])
        .reset_index(drop=True)
    )

    return clean_ground

def get_clean_precip():

    all_data = try_read(precip_path, "Sheet1")

    all_entries = []

    for _, entry in all_data.iterrows():

        date = pd.to_datetime(entry["msmt_datetime"])
        localized = pd.Timestamp(date, tz='Asia/Kathmandu')

        # Quality Checks

        if (
            entry["QCFlag"] == "Deleted" or 
            entry["QCFlag"] == "Question" or
            entry["precip_mm"] < 0 or
            entry["AutoSiteID"] < 0
        ):
            continue

        all_entries.append({
            "site_id": entry["AutoSiteID"],
            "source": "cs_precip_sample",
            "qc_flag": entry["QCFlag"],
            "msmt_datetime": localized,
            "elevation": entry["geopoint:Altitude"],
            "latitude": entry["geopoint:Latitude"],
            "longitude": entry["geopoint:Longitude"],
            "precip_mm": entry["precip_mm"]
        })

    clean_precip = (
        pd.DataFrame(all_entries)
        .drop_duplicates(subset=["msmt_datetime"])
        .sort_values(by=["site_id", "msmt_datetime"])
        .reset_index(drop=True)
    )

    return clean_precip


def get_all_clean():

    clean_ground = get_clean_ground()
    clean_surface = get_clean_surface()
    clean_precip = get_clean_precip()

    tabs = [clean_ground, clean_surface, clean_precip]
    paths = [clean_ground_path, clean_surface_path, clean_precip_path]

    for i in range(len(tabs)):

        tab = (
            tabs[i]
            .sort_values(by="site_id")
            .reset_index(drop=True)
        )

        """ 
        # Correct gaps in elevation data from datum
        for idx, entry in tab.iterrows():

            if (
                entry["elevation"] == 0 or
                pd.isna(entry["elevation"])
            ):
                tab.loc[idx, "elevation"] = get_elevation(entry["latitude"], entry["longitude"])
        """

        # Convert to regular format
        tab = tab[identifiers + [column for column in tab.columns if column not in identifiers]]

        try_save(tab, paths[i])

    # convert to requested format?: #station_id, datetime, variable, value, unit, qc_flag, source

get_all_clean()