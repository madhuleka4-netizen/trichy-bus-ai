import pandas as pd
import networkx as nx

# Load data
stops = pd.read_csv("../data/stops.csv")
distances = pd.read_csv("../data/distances.csv")

# Build a graph
G = nx.DiGraph()
for _, row in stops.iterrows():
    G.add_node(row["stop_id"], name=row["stop_name"],
               lat=row["latitude"], lon=row["longitude"])

for _, row in distances.iterrows():
    G.add_edge(row["from_stop"], row["to_stop"], weight=row["travel_time_peak_min"])
    G.add_edge(row["to_stop"], row["from_stop"], weight=row["travel_time_offpeak_min"])

def shortest_path(start, end):
    path = nx.dijkstra_path(G, start, end, weight="weight")
    time = nx.dijkstra_path_length(G, start, end, weight="weight")
    names = [G.nodes[s]["name"] for s in path]
    return names, time

if __name__ == "__main__":
    route, time = shortest_path("S1", "S6")
    print("Route:", " -> ".join(route))
    print("Estimated time:", time, "minutes")