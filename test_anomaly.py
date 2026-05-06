import json
import requests

with open('public/test_data.csv') as f:
    lines = f.readlines()[1:]

readings = []
window = []
for line in lines:
    ts, kwh = line.strip().split(',')
    kwh = float(kwh)
    window.append(kwh)
    if len(window) > 24:
        window.pop(0)
    
    rmean = sum(window) / len(window)
    if len(window) > 1:
        rstd = (sum((x - rmean)**2 for x in window) / (len(window) - 1))**0.5
    else:
        rstd = 0.1
        
    readings.append({
        "kWh": kwh,
        "hour": int(ts.split(' ')[1].split(':')[0]),
        "day_of_week": 5, # Saturday
        "rolling_mean": rmean,
        "rolling_std": max(rstd, 0.001)
    })

res = requests.post("http://localhost:8000/predict/anomaly/batch", json={"readings": readings})
print(json.dumps(res.json(), indent=2))
