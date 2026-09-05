from demand_predictor import predict_demand

# Business rules: convert predicted demand (0-100) into a bus frequency (minutes between buses)
def demand_to_frequency(demand):
    if demand >= 80:
        return 5   # every 5 minutes - very high demand
    elif demand >= 60:
        return 10  # every 10 minutes - high demand
    elif demand >= 40:
        return 15  # every 15 minutes - moderate demand
    elif demand >= 20:
        return 25  # every 25 minutes - low demand
    else:
        return 40  # every 40 minutes - very low demand

# Static baseline: what a traditional fixed schedule looks like (no AI)
STATIC_FREQUENCY = 20  # buses every 20 minutes, all day, regardless of demand

def get_dynamic_schedule(stop_ids, hour, day_type):
    schedule = []
    for stop_id in stop_ids:
        demand = predict_demand(stop_id, hour, day_type)
        frequency = demand_to_frequency(demand)
        schedule.append({
            "stop_id": stop_id,
            "predicted_demand": demand,
            "dynamic_frequency_min": frequency,
            "static_frequency_min": STATIC_FREQUENCY,
            "buses_per_hour_dynamic": round(60 / frequency, 1),
            "buses_per_hour_static": round(60 / STATIC_FREQUENCY, 1)
        })
    return schedule

if __name__ == "__main__":
    route1_stops = ["S1", "S2", "S3", "S4", "S5", "S6"]
    print("=== Dynamic Schedule: Route 1, 8am Weekday ===")
    for entry in get_dynamic_schedule(route1_stops, 8, "weekday"):
        print(entry)

    print("\n=== Dynamic Schedule: Route 1, 8am Weekend ===")
    for entry in get_dynamic_schedule(route1_stops, 8, "weekend"):
        print(entry)