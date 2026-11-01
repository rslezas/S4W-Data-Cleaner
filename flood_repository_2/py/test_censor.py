from image_censor import censorImages, dir
import pathlib
from pathlib import Path

input_folder = dir / Path("data/censor_in")
output_folder = dir / Path("data/censor_out")

paths = [item.resolve() for item in input_folder.iterdir()]

censorImages(paths, output_folder)