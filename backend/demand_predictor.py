import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder

data = pd.read_csv("../data/demand_history.csv")

le_stop = LabelEncoder()
le_day = LabelEncoder()
data["stop_encoded"] = le_stop.fit_transform(data["stop_id"])
data["day_encoded"] = le_day.fit_transform(data["day_type"])

X = data[["stop_encoded", "hour", "day_encoded"]]
y = data["demand"]

model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X, y)

def predict_demand(stop_id, hour, day_type):
    stop_enc = le_stop.transform([stop_id])[0]
    day_enc = le_day.transform([day_type])[0]
    pred = model.predict([[stop_enc, hour, day_enc]])
    return round(pred[0], 1)

if __name__ == "__main__":
    print("Predicted demand at S6 (NIT Trichy), 8am weekday:", predict_demand("S6", 8, "weekday"))
    print("Predicted demand at S6 (NIT Trichy), 8am weekend:", predict_demand("S6", 8, "weekend"))
    print("Predicted demand at S1 (Central Bus Stand), 2pm weekday:", predict_demand("S1", 14, "weekday"))