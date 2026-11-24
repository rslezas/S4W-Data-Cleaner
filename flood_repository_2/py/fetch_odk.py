from pyodk.client import Client
import pandas as pd

form_id = 'insert_form_id_here'

with Client() as client:
    data = client.submissions.get_table(form_id=form_id)
    responses = pd.json_normalize(data["value"], sep="/")


