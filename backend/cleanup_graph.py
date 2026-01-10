#!/usr/bin/env python3
"""
Clean up the Gremlin graph database by removing all nodes and edges.
Run this once to reset the graph before starting fresh ingestion.
"""

from gremlin_python.driver.driver_remote_connection import DriverRemoteConnection
from gremlin_python.process.anonymous_traversal import traversal
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("GraphCleanup")

GREMLIN_ENDPOINT = 'ws://localhost:8182/gremlin'

def cleanup():
    """Remove all nodes and edges from the graph"""
    try:
        logger.info("🧹 Connecting to Gremlin server...")
        conn = DriverRemoteConnection(GREMLIN_ENDPOINT, 'g')
        g = traversal().withRemote(conn)
        
        logger.info("📊 Counting nodes before cleanup...")
        node_count = g.V().count().next()
        logger.info(f"Found {node_count} nodes")
        
        logger.info("🗑️  Removing all nodes...")
        # Use toList() instead of iterate() for compatibility
        g.V().drop().toList()
        
        logger.info("✅ Verifying cleanup...")
        remaining = g.V().count().next()
        logger.info(f"Remaining nodes: {remaining}")
        
        if remaining == 0:
            logger.info("✅ Graph successfully cleaned!")
        else:
            logger.warning(f"⚠️  {remaining} nodes still remain")
        
        conn.close()
        
    except Exception as e:
        logger.error(f"❌ Error during cleanup: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    cleanup()
