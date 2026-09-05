import random
random.seed(42)

stops = ["S1", "S2", "S3", "S4", "S5", "S6"]

def demand(stop, hour, day_type):
    if 7 <= hour <= 10:
        base = 70
    elif 17 <= hour <= 20:
        base = 75
    elif 11 <= hour <= 16:
        base = 40
    else:
        base = 20

    if stop == "S6" and (7 <= hour <= 9 or 17 <= hour <= 19):
        base += 15
    if stop == "S1":
        base += 10
    if stop == "S2":
        base += 8

    if day_type == "weekend":
        base *= 0.55

    noise = random.uniform(-8, 8)
    val = max(5, min(100, base + noise))
    return round(val, 1)

rows = ["stop_id,hour,day_type,demand"]
for stop in stops:
    for hour in range(6, 23):
        for day_type in ["weekday", "weekend"]:
            rows.append(f"{stop},{hour},{day_type},{demand(stop, hour, day_type)}")

with open("demand_history.csv", "w") as f:
    f.write("\n".join(rows))

print("Created demand_history.csv with", len(rows) - 1, "rows")