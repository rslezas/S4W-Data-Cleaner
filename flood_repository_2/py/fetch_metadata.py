import os
from GPSPhoto import gpsphoto
from PIL import Image

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