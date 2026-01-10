import time
import json

class SimpleIngester:
    def __init__(self):
        self.data = {
            "nodes": [],
            "edges": [],
            "last_update": time.time()
        }
    
    def simulate_blockchain_data(self):
        # Simulate new staking transaction
        tx = {
            "delegator": f"addr_{int(time.time())}",
            "validator": "validator_1", 
            "amount": 2.5,
            "timestamp": time.time()
        }
        print(f"Simulated transaction: {tx}")
        return tx
    
    def run(self):
        print("Starting simple blockchain ingester...")
        while True:
            try:
                tx = self.simulate_blockchain_data()
                time.sleep(30)  # Simulate every 30 seconds
            except KeyboardInterrupt:
                print("Ingester stopped")
                break

if __name__ == "__main__":
    ingester = SimpleIngester()
    ingester.run()