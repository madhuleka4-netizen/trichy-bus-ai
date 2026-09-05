from flask import Flask, jsonify, request
from flask_cors import CORS
from route_optimizer import shortest_path
from demand_predictor import predict_demand

app = Flask(__name__)
CORS(app)

@app.route("/route", methods=["GET"])
def get_route():
    start = request.args.get("start")
    end = request.args.get("end")
    names, time = shortest_path(start, end)
    return jsonify({"route": names, "time_minutes": time})

@app.route("/demand", methods=["GET"])
def get_demand():
    stop = request.args.get("stop")
    hour = int(request.args.get("hour"))
    day_type = request.args.get("day_type")
    demand = predict_demand(stop, hour, day_type)
    return jsonify({"stop": stop, "predicted_demand": demand})

if __name__ == "__main__":
    app.run(debug=True, port=5000)