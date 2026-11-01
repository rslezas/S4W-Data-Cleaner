
import cv2
from ultralytics import YOLO
import pathlib
from pathlib import Path
from huggingface_hub import hf_hub_download
import sys
import os

dir = Path(__file__).resolve().parent.parent

object_model = YOLO(dir / Path("models/yolov8s.pt"))
plate_model = YOLO(dir / Path("models/last.pt"))

def blurBoxes(image, boxes, shift_pixels=(0, 0)):
    height, width = image.shape[:2]
    shift_x, shift_y = shift_pixels

    # Create one blurred version before modifying the original image.
    blurred_image = cv2.blur(image, (50, 50))

    for box in boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0])

        # Shift coordinates and clamp them to the image boundaries.
        x1 = max(0, min(width, x1 + shift_x))
        x2 = max(0, min(width, x2 + shift_x))
        y1 = max(0, min(height, y1 + shift_y))
        y2 = max(0, min(height, y2 + shift_y))

        # Skip empty or invalid boxes.
        if x2 <= x1 or y2 <= y1:
            continue

        image[y1:y2, x1:x2] = blurred_image[y1:y2, x1:x2]

    return image

def labelBoxes(image, boxes, label, shift_pixels = (0, 0)):

    shift_x, shift_y = shift_pixels

    for box in boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0])

        x1 = min(image.shape[1], x1 + shift_pixels[0])
        x2 = min(image.shape[1], x2 + shift_pixels[0])

        y1 = min(image.shape[0], y1 + shift_pixels[1])
        y2 = min(image.shape[0], y2 + shift_pixels[1])

        confidence = float(box.conf[0])

        cv2.rectangle(image, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(image, f"{label} {confidence:.2f}", (x1, y1 - 10), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

    return image

def censorPeople(image):

    result = object_model(image, classes=[0])[0]

    #image = labelBoxes(image, result.boxes, "Person")
    image = blurBoxes(image, result.boxes)

    return image

def censorLicense(image):

    # bicycle, car, motorcycle, bus, truck

    vehicle_results = object_model(image, classes=[1, 2, 3, 5, 7])

    #for vehicle_result in vehicle_results:

        #image = labelBoxes(image, vehicle_result.boxes, "Vehicle")

    for vehicle_result in vehicle_results:
        
        for box in vehicle_result.boxes:

            x1, y1, x2, y2 = map(int, box.xyxy[0])
            
            vehicle = image[y1 : y2, x1 : x2]

            license_result = plate_model(vehicle, verbose=False)[0]
            
            #image = labelBoxes(image, license_result.boxes, "License Plate", shift_pixels=[x1, y1])
            image = blurBoxes(image, license_result.boxes, shift_pixels=(x1, y1))


    return image

def censorImage(path):

    # Load your target image
    try:
        image = cv2.imread(path)
    except Exception as e:
        print(f"Failed to open image: {e}")
        return None

    # Filter 1: Detects and blurs peopls
    image = censorPeople(image)
    image = censorLicense(image)

    return image

    new_path = f"{path.split(".")[0]}_censored{Path(path).suffix}"
    cv2.imwrite(new_path, image)

def censorImages(paths):

    censored_images = []

    for path in paths:
        censored_image = censorImage(path)

        filename = Path(path).name.split["."]

        new_path = f"{filename[0]}_censored.{filename[1]}"

        cv2.imwrite(f"{}_censored", image)

censorImage(r"C:\Users\rolan\My OneDrive\Desktop\S4W Data Cleaner\flood_repository\flood_repository_2\py\IMG_1796.JPG")