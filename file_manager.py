import pandas as pd
import datetime as dt
from pathlib import Path
import pathlib
from lxml import html
import os
import sys
import time

dir = pathlib.Path().resolve()

data_folder = dir / Path("data")
raw_folder = data_folder / Path("raw")
cleaned_folder = data_folder / Path("clean")

backup_folder = dir / Path("Backup")

def now():
    now = dt.datetime.now().strftime("%Y-%m-%d %H-%M-%S")
    return now

def try_save_tabs(df, names, path):

    split = str(path).split(".")
    type = split[len(split) - 1]

    if type != "xlsx":
        print(f"{type} does not support multiple tabs.")
        sys.exit()

    new_file = not path.exists()

    if path.exists():
    
        overwrite = input(f"Permission to overwrite file at path: {(str(path).replace(str(dir), ""))}? (y/n) ")

        if overwrite.lower() != "y":
            print("Save operation canceled.")
            sys.exit()
    
    try:
        with pd.ExcelWriter(path, engine="openpyxl") as writer:

            for i in range(len(df)):

                if len(names) < i - 1:
                    name = f"Tab{i}"
                else:
                    name = names[i]

                df[i].to_excel(writer, sheet_name=name, index=False)

        if (overwrite):
            print(f"File overwritten with {len(df)} tabs: {path}")
        else:
            print(f"New file created with {len(df)} tabs: {path}")
            
    except Exception as e:

        print(f"Failed to save multiple-tab excel sheet: {path}")

        print(e)

        for i in range(len(df)):
            backup_csv(df[i])

        sys.exit()
        
def try_save(df, path):
    try:
        split = str(path).split(".")
        type = split[len(split) - 1]

        new_file = not path.exists()

        #if path.exists():

            #overwrite = input(f"Permission to overwrite file at path: {(str(path).replace(str(dir), ""))}? (y/n) ")

            #if overwrite.lower() != "y":
            #    print("Save operation canceled.")
            #    sys.exit()

        if type == "xlsx":
            df.to_excel(path, index = False)
        elif type == "csv":
            df.to_csv(path, index = False)
        else:
            print(f"{type} is not a recognized extension")
            backup_csv(df)
            sys.exit()

        if new_file:
            print(f"New file created: {path}")
        else: 
            print (f"File overwritten: {path}")
        
    except Exception as e:
        print(f"Failed to save to path: {path}")
        print(e)
        backup_csv(df)
        sys.exit()

def try_read(path, sheet_name = None):
    try:

        split = str(path).split(".")
        type = split[len(split) - 1]

        if type == "xlsx":
            df = pd.read_excel(path, sheet_name=sheet_name)
        elif type == "csv":
            df = pd.read_csv(path, low_memory=False)
        else:
            print(f"{type} is not a recognized extension")
            sys.exit()
        return df
    except Exception as e:
        print(f"Failed to read file at path: {path}")
        print(e)
        sys.exit()

def backup_csv(df):

    backup_path = backup_folder / Path(f"backup-{now()}.csv")

    i = 0
    while backup_path.exists():
        i += 1
        backup_path = backup_folder / Path(f"backup-{now()}({i}).csv")

    try:
        df.to_csv(backup_path, index = False)
        print(f"Backup created: {backup_path}")
    except Exception as e:
        print(f"Backup failed: {e}")