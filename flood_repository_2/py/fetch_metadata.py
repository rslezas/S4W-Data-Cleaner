import os
from GPSPhoto import gpsphoto
from PIL import Image
import pathlib
from pathlib import Path

# Margin 200 meters = 0.002

def get_gps(path):
    try:
        data = gpsphoto.getGPSData(path)

        if not data:
            print(f"No GPS metadata found: {path}")
            return None

        latitude = data.get("Latitude")
        longitude = data.get("Longitude")

        if latitude is None or longitude is None:
            print(f"GPS coordinates are missing: {path}")
            return None

        print(f"Latitude: {latitude}, Longitude: {longitude}")
        return data

    except Exception as error:
        print(f"Cannot read GPS metadata from {path}: {error}")
        return None

def verify_image_location(latitude, longitude, path):

    data = get_gps(path)

    if not data:
        print("No GPS data associated with photo.")
        return None

    img_latitude = data.get("Latitude")
    img_longitude = data.get("Longitude")
    
    if latitude is None or longitude is None:
        print(f"GPS coordinates are missing: {path}")
        return None

    error = pow(pow(img_latitude - latitude, 2) + pow(img_longitude - longitude, 2), 1/2)
    margin = 0.003 # ~300 meters

    return (error < margin) # True = verified, False = not verified

def print_gps():
    imageDir = "images"

    if not os.path.isdir(imageDir):
        raise FileNotFoundError(f"directory not found: {imageDir}") #check if images directory exists

    imageList = [
        filename for filename in sorted(os.listdir(imageDir)) 
        if filename.lower().endswith((".jpg", ".jpeg")) #add all jpgs and jpegs to the image list
    ]

    print("images found:", imageList) #print and verify image list

    for filename in imageList:
        imagePath = os.path.join(imageDir, filename) #images path is images/image_name
        print(f"checking: {imagePath}")

        try:
            with Image.open(imagePath) as img:
                exif = img.getexif()
                print("GPS EXIF tag:", exif.get(34853)) #get location data (exif.get(34853))
        except Exception as e:
            print(f"cannot open {imagePath}: {e}") #if cant get location data, exception thrown

        data = gpsphoto.getGPSData(imagePath) #add image data to data variable
        print(filename, "gps data:", data) #print each image next to its location data