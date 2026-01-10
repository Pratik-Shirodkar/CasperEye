import requests
import json
from gremlin_python.driver import client
import os

class RiskMonitor:
    def __init__(self):
        self.gremlin_client = client.Client(os.getenv("GREMLIN_ENDPOINT", "ws://localhost:8182/gremlin"), 'g')
        self.risk_threshold = 100  # BTC
        
    def check_chain_risks(self):
        alerts = []
        
        # Get all consumer chains
        chains_query = "g.V().has('type', 'ConsumerChain').valueMap(true)"
        chains = self.gremlin_client.submit(chains_query).all().result()
        
        for chain in chains:
            chain_id = chain.get('id', ['unknown'])[0]
            
            # Calculate smart money exposure
            smart_money_query = f"""
            g.V().has('type', 'ConsumerChain').has('id', '{chain_id}')
             .in('SECURES')
             .in('STAKED_WITH')
             .has('label', 'Smart Money')
             .values('amount')
             .sum()
            """
            
            try:
                result = self.gremlin_client.submit(smart_money_query).all().result()
                total_smart_money = result[0] if result else 0
                
                if total_smart_money < self.risk_threshold:
                    alerts.append({
                        "chain_id": chain_id,
                        "risk_level": "CRITICAL",
                        "smart_money_btc": total_smart_money,
                        "threshold": self.risk_threshold,
                        "message": f"Chain {chain_id} has insufficient smart money backing"
                    })
            except Exception as e:
                print(f"Error checking {chain_id}: {e}")
        
        return alerts
    
    def send_alert(self, alert):
        # In production, integrate with SNS, Slack, etc.
        print(f"🚨 RISK ALERT: {alert['message']}")
        print(f"   Chain: {alert['chain_id']}")
        print(f"   Smart Money: {alert['smart_money_btc']} BTC")
        print(f"   Threshold: {alert['threshold']} BTC")
    
    def run_check(self):
        print("Running risk assessment...")
        alerts = self.check_chain_risks()
        
        for alert in alerts:
            self.send_alert(alert)
        
        if not alerts:
            print("✅ All chains within acceptable risk parameters")
        
        return alerts

def lambda_handler(event, context):
    """AWS Lambda entry point"""
    monitor = RiskMonitor()
    alerts = monitor.run_check()
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'alerts_count': len(alerts),
            'alerts': alerts
        })
    }

if __name__ == "__main__":
    monitor = RiskMonitor()
    monitor.run_check()