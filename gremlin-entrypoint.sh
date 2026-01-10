#!/bin/bash
set -e

# Skip the problematic sed operations by directly running the Java process
cd /opt/gremlin-server

# Make sure the config file exists
if [ ! -f conf/gremlin-server.yaml ]; then
  echo "ERROR: conf/gremlin-server.yaml not found"
  exit 1
fi

# Run Gremlin Server with the YAML config
exec java -server \
  -Xms256m -Xmx512m \
  -XX:+UseG1GC \
  -XX:MaxGCPauseMillis=200 \
  -XX:InitiatingHeapOccupancyPercent=35 \
  -XX:+DisableExplicitGC \
  -XX:G1NewCollectionHeuristicPercent=15 \
  -XX:G1ReservePercent=20 \
  -XX:G1HeapWastePercent=5 \
  -XX:G1MixedGCCountTarget=8 \
  -XX:+ParallelRefProcEnabled \
  -XX:+AlwaysPreTouch \
  -Dlog4j.configuration=file:conf/log4j-server.properties \
  -cp "lib/*:." \
  org.apache.tinkerpop.gremlin.server.GremlinServer \
  conf/gremlin-server.yaml
