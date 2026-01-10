from gremlin_python.driver.driver_remote_connection import DriverRemoteConnection
from gremlin_python.process.anonymous_traversal import traversal

conn = DriverRemoteConnection('ws://localhost:8182/gremlin', 'g')
g = traversal().withRemote(conn)

# Count nodes and edges
node_count = g.V().count().next()
edge_count = g.E().count().next()

print(f"Nodes in database: {node_count}")
print(f"Edges in database: {edge_count}")

# Show sample nodes
print("\nSample nodes:")
nodes = g.V().limit(5).elementMap().toList()
for n in nodes:
    print(f"  - {n.get('name', n.get('pk', 'unknown'))}")

# Show sample edges
print("\nSample edges:")
edges = g.E().limit(5).toList()
for e in edges:
    print(f"  - {e.label}")

conn.close()